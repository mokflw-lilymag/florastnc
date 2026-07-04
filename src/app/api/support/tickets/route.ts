import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminInvalidBody, errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { resolveUserTenantId, isSuperAdminProfile } from "@/lib/support-tickets/access";
import { isValidSupportCategory } from "@/lib/support-tickets/categories";
import {
  buildRemoteSettingsTicketBody,
  hashRemoteAssistCode,
  isRemoteSettingsCategory,
  isValidRemoteAssistCode,
} from "@/lib/support-tickets/remote-settings";
import { categoryRequiresAssistCode } from "@/lib/support-tickets/assist-code";
import {
  buildLoginHelpBody,
  buildSubscriptionHelpBody,
} from "@/lib/support-tickets/category-templates";
import { toListItem } from "@/lib/support-tickets/mask";
import { logSupportAudit, requireSupportDb } from "@/lib/support-tickets/db";
import { uploadSupportAttachments } from "@/lib/support-tickets/storage";
import { notifyAdminNewTicket } from "@/lib/support-tickets/email";

export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));
  const dbGate = requireSupportDb(bl);
  if (!dbGate.ok) return dbGate.response;

  const isAdmin = isSuperAdminProfile(gate.profile, gate.email);
  const mineOnly = sp.get("mine") === "1";
  const category = sp.get("category");
  const q = sp.get("q")?.trim();

  let query = dbGate.admin
    .from("support_tickets")
    .select("*, tenants(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (mineOnly) query = query.eq("author_user_id", gate.userId);
  if (category) query = query.eq("category", category);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error("[support/tickets GET]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const tickets = (data ?? []).map((row) =>
    toListItem(row as Parameters<typeof toListItem>[0], gate.userId, isAdmin),
  );
  return NextResponse.json({ tickets });
}

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const body = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const dbGate = requireSupportDb(bl);
  if (!dbGate.ok) return dbGate.response;

  const title = (body?.title as string | undefined)?.trim();
  const ticketBody = (body?.body as string | undefined)?.trim();
  const category = body?.category as string | undefined;
  const bodyLocale = (body?.bodyLocale as string | undefined) || bl || "ko";
  const attachments = Array.isArray(body?.attachments) ? (body.attachments as string[]) : [];
  const remoteAssistCode = (body?.remoteAssistCode as string | undefined)?.trim() ?? "";
  const remoteAssistConsent = Boolean(body?.remoteAssistConsent);

  if (!title || !ticketBody || !category || !isValidSupportCategory(category)) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }
  if (categoryRequiresAssistCode(category)) {
    if (!remoteAssistConsent) {
      return NextResponse.json(
        { error: "동의에 체크해 주세요." },
        { status: 400 },
      );
    }
    if (!isValidRemoteAssistCode(remoteAssistCode)) {
      return NextResponse.json(
        { error: "확인용 비밀번호는 4~6자리 숫자로 입력해 주세요." },
        { status: 400 },
      );
    }
  }
  if (attachments.length > 3) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }

  const tenantId = await resolveUserTenantId(gate.supabase, gate.userId);
  if (!tenantId) {
    return NextResponse.json(
      { error: "매장이 연결된 계정에서만 문의를 등록할 수 있습니다." },
      { status: 400 },
    );
  }

  const { data: ticketNo, error: seqErr } = await dbGate.admin.rpc("next_support_ticket_no");
  if (seqErr || !ticketNo) {
    console.error("[support/tickets POST seq]", seqErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const now = new Date().toISOString();
  let finalBody = ticketBody;
  if (isRemoteSettingsCategory(category)) {
    finalBody = buildRemoteSettingsTicketBody(ticketBody, now);
  } else if (category === "login-help") {
    finalBody = buildLoginHelpBody(ticketBody, now);
  } else if (category === "subscription-help") {
    finalBody = buildSubscriptionHelpBody(ticketBody);
  }

  const { data: row, error } = await dbGate.admin
    .from("support_tickets")
    .insert({
      ticket_no: ticketNo as string,
      tenant_id: tenantId,
      author_user_id: gate.userId,
      category,
      title,
      body: finalBody,
      body_locale: bodyLocale,
      status: "open",
      is_private: true,
      has_admin_reply: false,
      attachment_paths: [],
      remote_assist_consent_at: categoryRequiresAssistCode(category) ? now : null,
      created_at: now,
      updated_at: now,
    })
    .select("*, tenants(name)")
    .single();

  if (error || !row) {
    console.error("[support/tickets POST]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  if (categoryRequiresAssistCode(category)) {
    const codeHash = hashRemoteAssistCode(row.id as string, remoteAssistCode);
    await dbGate.admin
      .from("support_tickets")
      .update({ remote_assist_code_hash: codeHash, updated_at: now })
      .eq("id", row.id);
  }

  let attachmentPaths = row.attachment_paths;
  if (attachments.length > 0) {
    attachmentPaths = await uploadSupportAttachments(
      dbGate.admin,
      tenantId,
      row.id as string,
      attachments.slice(0, 3),
    );
    await dbGate.admin
      .from("support_tickets")
      .update({ attachment_paths: attachmentPaths, updated_at: now })
      .eq("id", row.id);
  }

  await logSupportAudit(dbGate.admin, row.id as string, "created", gate.userId, {
    ticket_no: ticketNo,
    category,
    assist_code: categoryRequiresAssistCode(category),
  });

  const storeName = (row.tenants as { name?: string } | null)?.name ?? "매장";
  void notifyAdminNewTicket({
    ticketNo: ticketNo as string,
    title,
    storeName,
    category,
  }).catch((e) => console.warn("[support/tickets] admin email failed", e));

  return NextResponse.json({
    ticket: toListItem(
      { ...row, attachment_paths: attachmentPaths } as Parameters<typeof toListItem>[0],
      gate.userId,
      false,
    ),
    id: row.id,
  });
}
