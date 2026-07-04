import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { logSupportAudit, requireSuperAdmin } from "@/lib/support-tickets/db";
import { setOrgWorkContext } from "@/lib/hq/set-org-work-context";

type RouteCtx = { params: Promise<{ id: string }> };

/** 매장 대시보드 미리보기(업무 모드 전환) */
export async function POST(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const adminGate = requireSuperAdmin(gate, bl);
  if (!adminGate.ok) return adminGate.response;

  const { data: ticket, error: tErr } = await adminGate.admin
    .from("support_tickets")
    .select("id, ticket_no, tenant_id, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (tErr || !ticket || ticket.deleted_at) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const ctxResult = await setOrgWorkContext(adminGate.admin, gate.userId, ticket.tenant_id as string);

  if (!ctxResult.ok) {
    console.error("[open-dashboard]", ctxResult.error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  await logSupportAudit(adminGate.admin, id, "dashboard_opened", gate.userId, {
    ticket_no: ticket.ticket_no,
    tenant_id: ticket.tenant_id,
  });

  return NextResponse.json({
    ok: true,
    redirectUrl: `/dashboard?supportTicket=${id}`,
  });
}
