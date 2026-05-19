import type { Period, PlanId } from "@/app/dashboard/subscription/plan-localized";

/** KRW — UI 표시·토스 결제 (콤마 없는 숫자) */
export const PLAN_KRW_TOTAL: Record<PlanId, Record<Period, number>> = {
  ribbon_only: { "1m": 20_000, "3m": 57_000, "6m": 110_000, "12m": 200_000 },
  erp_only: { "1m": 30_000, "3m": 85_000, "6m": 165_000, "12m": 300_000 },
  pro: { "1m": 50_000, "3m": 140_000, "6m": 275_000, "12m": 500_000 },
};

/** USD — Stripe Checkout (센트, 해외 카드) */
export const PLAN_USD_TOTAL_CENTS: Record<PlanId, Record<Period, number>> = {
  ribbon_only: { "1m": 1_900, "3m": 5_400, "6m": 9_900, "12m": 17_900 },
  erp_only: { "1m": 2_900, "3m": 7_900, "6m": 14_900, "12m": 26_900 },
  pro: { "1m": 4_900, "3m": 13_900, "6m": 26_900, "12m": 48_900 },
};

export function formatUsdTotal(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function planDisplayName(planId: PlanId): string {
  switch (planId) {
    case "ribbon_only":
      return "PRINT CORE";
    case "erp_only":
      return "ERP SMART";
    case "pro":
      return "FLORA PRO";
    default:
      return planId;
  }
}
