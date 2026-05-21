import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import { adjustCustomerPoints } from "@/lib/customers/adjust-customer-points";

/** POST — CRM 수동 포인트 조정 (DB 잔액 기준, 내역 1건) */
export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: {
    customer_id?: string;
    target_points?: number;
    reason?: string;
    idempotency_key?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body.customer_id || typeof body.target_points !== "number") {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const db = createAdminClient() ?? gate.supabase;
  const result = await adjustCustomerPoints(db, {
    tenantId,
    customerId: body.customer_id,
    targetPoints: body.target_points,
    reason: body.reason,
    idempotencyKey: body.idempotency_key,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
