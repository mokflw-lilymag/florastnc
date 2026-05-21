import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultPointAdjustmentDescription } from "@/lib/customers/point-transactions";

export type AdjustCustomerPointsInput = {
  tenantId: string;
  customerId: string;
  targetPoints: number;
  reason?: string;
  idempotencyKey?: string;
};

export type AdjustCustomerPointsResult =
  | { ok: true; skipped: true; points: number }
  | { ok: true; skipped: false; points: number; delta: number; transactionId?: string }
  | { ok: false; error: string };

/** DB 현재 잔액 기준으로 포인트 1회 조정 + 내역 1건 (중복·이중 insert 방지) */
export async function adjustCustomerPoints(
  db: SupabaseClient,
  input: AdjustCustomerPointsInput,
): Promise<AdjustCustomerPointsResult> {
  const targetPoints = Math.max(0, Math.floor(input.targetPoints));

  if (input.idempotencyKey) {
    const { data: existingTx } = await db
      .from("point_transactions")
      .select("id")
      .eq("customer_id", input.customerId)
      .eq("related_id", input.idempotencyKey)
      .maybeSingle();

    if (existingTx) {
      const { data: cust } = await db
        .from("customers")
        .select("points")
        .eq("id", input.customerId)
        .eq("tenant_id", input.tenantId)
        .single();
      return { ok: true, skipped: true, points: cust?.points ?? targetPoints };
    }
  }

  const { data: customer, error: fetchError } = await db
    .from("customers")
    .select("id, points")
    .eq("id", input.customerId)
    .eq("tenant_id", input.tenantId)
    .single();

  if (fetchError || !customer) {
    return { ok: false, error: fetchError?.message ?? "CUSTOMER_NOT_FOUND" };
  }

  const currentPoints = customer.points ?? 0;
  const delta = targetPoints - currentPoints;

  if (delta === 0) {
    return { ok: true, skipped: true, points: currentPoints };
  }

  const { error: updateError } = await db
    .from("customers")
    .update({ points: targetPoints })
    .eq("id", input.customerId)
    .eq("tenant_id", input.tenantId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const description = defaultPointAdjustmentDescription(delta, input.reason);
  const txRow: Record<string, unknown> = {
    tenant_id: input.tenantId,
    customer_id: input.customerId,
    amount: delta,
    type: "manual",
    source: "manual",
    description,
    related_id: input.idempotencyKey ?? null,
  };

  const { data: inserted, error: insertError } = await db
    .from("point_transactions")
    .insert({ ...txRow, balance_after: targetPoints })
    .select("id")
    .single();

  if (insertError?.message?.includes("balance_after")) {
    const { data: fallback, error: fallbackError } = await db
      .from("point_transactions")
      .insert(txRow)
      .select("id")
      .single();

    if (fallbackError) {
      await db
        .from("customers")
        .update({ points: currentPoints })
        .eq("id", input.customerId)
        .eq("tenant_id", input.tenantId);
      return { ok: false, error: fallbackError.message };
    }

    return {
      ok: true,
      skipped: false,
      points: targetPoints,
      delta,
      transactionId: fallback?.id,
    };
  }

  if (insertError) {
    await db
      .from("customers")
      .update({ points: currentPoints })
      .eq("id", input.customerId)
      .eq("tenant_id", input.tenantId);
    return { ok: false, error: insertError.message };
  }

  return {
    ok: true,
    skipped: false,
    points: targetPoints,
    delta,
    transactionId: inserted?.id,
  };
}
