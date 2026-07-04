import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminInvalidBody, errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import {
  logSupportAudit,
  requireSuperAdmin,
  resolveAuthorUiLocale,
} from "@/lib/support-tickets/db";
import { translateSupportReply } from "@/lib/support-tickets/translate-reply";
import { uploadSupportAttachments } from "@/lib/support-tickets/storage";
import { notifyAuthorReply } from "@/lib/support-tickets/email";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const adminGate = requireSuperAdmin(gate, bl);
  if (!adminGate.ok) return adminGate.response;

  const replyBody = (body?.body as string | undefined)?.trim();
  const originalLocale = (body?.originalLocale as string | undefined) || bl || "ko";
  const attachments = Array.isArray(body?.attachments) ? (body.attachments as string[]) : [];

  if (!replyBody) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }

  const { data: ticket, error: ticketErr } = await adminGate.admin
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const targetLocale = await resolveAuthorUiLocale(adminGate.admin, ticket.tenant_id as string);
  const translated = await translateSupportReply(replyBody, originalLocale, targetLocale);
  const now = new Date().toISOString();

  let attachmentPaths: Awaited<ReturnType<typeof uploadSupportAttachments>> = [];
  if (attachments.length > 0) {
    attachmentPaths = await uploadSupportAttachments(
      adminGate.admin,
      ticket.tenant_id as string,
      id,
      attachments.slice(0, 3),
    );
  }

  const { data: reply, error: replyErr } = await adminGate.admin
    .from("support_ticket_replies")
    .insert({
      ticket_id: id,
      author_user_id: gate.userId,
      author_role: "admin",
      body_original: replyBody,
      body_translated: translated,
      original_locale: originalLocale,
      target_locale: targetLocale,
      attachment_paths: attachmentPaths,
      is_internal_note: false,
      created_at: now,
    })
    .select("*")
    .single();

  if (replyErr || !reply) {
    console.error("[admin/support/reply]", replyErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  await adminGate.admin
    .from("support_tickets")
    .update({
      status: "answered",
      has_admin_reply: true,
      author_reply_read_at: null,
      last_reply_at: now,
      updated_at: now,
    })
    .eq("id", id);

  await logSupportAudit(adminGate.admin, id, "replied", gate.userId, {
    reply_id: reply.id,
  });

  void notifyAuthorReply({
    supabase: adminGate.admin,
    authorUserId: ticket.author_user_id as string,
    ticketNo: ticket.ticket_no as string,
    title: ticket.title as string,
    ticketId: id,
  }).catch((e) => console.warn("[admin/support/reply] author email failed", e));

  return NextResponse.json({ reply });
}
