import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminInvalidBody, errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { logSupportAudit, requireSuperAdmin } from "@/lib/support-tickets/db";
import { setOrgWorkContext } from "@/lib/hq/set-org-work-context";
import {
  isRemoteSettingsCategory,
  verifyRemoteAssistCode,
} from "@/lib/support-tickets/remote-settings";
import type { SupportTicketRow } from "@/lib/support-tickets/types";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const adminGate = requireSuperAdmin(gate, bl);
  if (!adminGate.ok) return adminGate.response;

  const code = (body?.code as string | undefined)?.trim() ?? "";
  if (!code) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }

  const { data: row, error } = await adminGate.admin
    .from("support_tickets")
    .select("id, ticket_no, tenant_id, category, remote_assist_code_hash, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const ticket = row as Pick<
    SupportTicketRow,
    "id" | "ticket_no" | "tenant_id" | "category" | "remote_assist_code_hash" | "deleted_at"
  >;

  if (ticket.deleted_at) {
    return NextResponse.json({ error: "삭제된 문의입니다." }, { status: 400 });
  }
  if (!isRemoteSettingsCategory(ticket.category)) {
    return NextResponse.json({ error: "환경설정 대리 문의가 아닙니다." }, { status: 400 });
  }
  if (!ticket.remote_assist_code_hash) {
    return NextResponse.json({ error: "확인용 비밀번호가 설정되지 않은 문의입니다." }, { status: 400 });
  }

  const ok = verifyRemoteAssistCode(id, code, ticket.remote_assist_code_hash);
  if (!ok) {
    await logSupportAudit(adminGate.admin, id, "remote_settings_unlock_failed", gate.userId, {
      ticket_no: ticket.ticket_no,
    });
    return NextResponse.json({ error: "확인용 비밀번호가 일치하지 않습니다." }, { status: 403 });
  }

  const ctxResult = await setOrgWorkContext(adminGate.admin, gate.userId, ticket.tenant_id);

  if (!ctxResult.ok) {
    console.error("[open-settings] work-context", ctxResult.error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  await logSupportAudit(adminGate.admin, id, "remote_settings_unlocked", gate.userId, {
    ticket_no: ticket.ticket_no,
    tenant_id: ticket.tenant_id,
  });

  return NextResponse.json({
    ok: true,
    tenantId: ticket.tenant_id,
    redirectUrl: `/dashboard/settings?supportTicket=${id}`,
  });
}
