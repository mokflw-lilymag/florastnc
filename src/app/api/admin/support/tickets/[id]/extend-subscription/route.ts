import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminInvalidBody, errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { logSupportAudit, requireSuperAdmin } from "@/lib/support-tickets/db";
import { recordSubscriptionEvent } from "@/lib/subscription/record-subscription-event";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const adminGate = requireSuperAdmin(gate, bl);
  if (!adminGate.ok) return adminGate.response;

  const days = Number(body?.days) || 7;
  if (![7, 14, 30].includes(days)) {
    return NextResponse.json({ error: "연장 일수는 7, 14, 30 중 선택하세요." }, { status: 400 });
  }

  const { data: ticket, error: tErr } = await adminGate.admin
    .from("support_tickets")
    .select("id, ticket_no, tenant_id, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (tErr || !ticket || ticket.deleted_at) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: tenant, error: fetchErr } = await adminGate.admin
    .from("tenants")
    .select("id, name, plan, status, subscription_end")
    .eq("id", ticket.tenant_id)
    .maybeSingle();

  if (fetchErr || !tenant) {
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const base = tenant.subscription_end ? new Date(tenant.subscription_end as string) : new Date();
  const startFrom = base > new Date() ? base : new Date();
  const newEnd = new Date(startFrom);
  newEnd.setDate(newEnd.getDate() + days);

  const reason = `문의 ${ticket.ticket_no} 처리 — ${days}일 연장`;

  const { error: upErr } = await adminGate.admin
    .from("tenants")
    .update({
      subscription_end: newEnd.toISOString(),
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenant.id);

  if (upErr) {
    console.error("[extend-subscription]", upErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  await recordSubscriptionEvent({
    tenantId: tenant.id as string,
    eventType: "admin_grant",
    source: "admin",
    actorUserId: gate.userId,
    actorEmail: gate.email,
    planBefore: tenant.plan as string,
    planAfter: tenant.plan as string,
    subscriptionEndBefore: tenant.subscription_end as string | null,
    subscriptionEndAfter: newEnd.toISOString(),
    reason,
    metadata: {
      grant_kind: "manual",
      support_ticket_id: id,
      ticket_no: ticket.ticket_no,
      days_granted: days,
    },
  });

  await logSupportAudit(adminGate.admin, id, "subscription_extended", gate.userId, {
    ticket_no: ticket.ticket_no,
    days,
    subscription_end: newEnd.toISOString(),
  });

  return NextResponse.json({
    ok: true,
    subscription_end: newEnd.toISOString(),
  });
}
