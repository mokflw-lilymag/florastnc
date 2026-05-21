import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import { triggerRevenueTask } from "@/lib/revenue/trigger-client";

/** POST — 배송/주문 완료 시 구매 후 시퀀스 Trigger.dev 시작 */
export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body.orderId) {
    return NextResponse.json({ error: "ORDER_ID_REQUIRED" }, { status: 400 });
  }

  const db = createAdminClient() ?? gate.supabase;
  const { data: order, error } = await db
    .from("orders")
    .select("id, tenant_id, status")
    .eq("id", body.orderId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  if (order.status !== "completed") {
    return NextResponse.json({ error: "ORDER_NOT_COMPLETED" }, { status: 400 });
  }

  const trigger = await triggerRevenueTask("revenue.order-delivered", {
    orderId: body.orderId,
    tenantId,
    deliveredAt: new Date().toISOString(),
  });

  return NextResponse.json({
    triggered: trigger.ok,
    skipped: trigger.skipped ?? false,
    runId: trigger.runId,
  });
}
