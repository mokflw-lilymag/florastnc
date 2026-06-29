import type { Period, PlanId } from "@/app/dashboard/subscription/plan-localized";
import { normalizeSubscriptionPlanId } from "@/lib/subscription/plan-access";
import { isBillingPeriod } from "@/lib/subscription/subscription-period";

/** `{tenant8}_{planId}_{period}_{timestamp}` — Toss·Stripe 공통 */
export function buildSubscriptionOrderId(
  tenantId: string,
  planId: PlanId,
  period: Period,
): string {
  return `${tenantId.substring(0, 8)}_${planId}_${period}_${Date.now()}`;
}

export function parseSubscriptionOrderId(orderId: string): {
  planId: PlanId;
  period: Period;
} | null {
  const parts = orderId.split("_");
  if (parts.length < 3) return null;
  const planId = normalizeSubscriptionPlanId(parts[1] ?? "");
  const period = parts[2] ?? "";
  if (!planId) return null;
  if (!isBillingPeriod(period)) return null;
  return { planId, period };
}
