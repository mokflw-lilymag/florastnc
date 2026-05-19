import type { Period, PlanId } from "@/app/dashboard/subscription/plan-localized";
import { normalizeSubscriptionPlanId } from "@/lib/subscription/plan-access";

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
  const period = parts[2] as Period;
  if (!planId) return null;
  if (!["1m", "3m", "6m", "12m"].includes(period)) return null;
  return { planId, period };
}

export function subscriptionMonths(period: Period): number {
  if (period === "12m") return 12;
  if (period === "6m") return 6;
  if (period === "3m") return 3;
  return 1;
}
