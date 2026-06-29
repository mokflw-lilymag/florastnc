import type { Period, PlanId } from "@/app/dashboard/subscription/plan-localized";

/** KRW — UI 표시·토스 결제 (콤마 없는 숫자) */
export const PLAN_KRW_TOTAL: Record<PlanId, Record<Period, number>> = {
  ribbon_only: { "1m": 15_000, "12m": 120_000 },
  light: { "1m": 25_000, "12m": 300_000 },
  pro: { "1m": 40_000, "12m": 440_000 },
  pro_plus: { "1m": 60_000, "12m": 660_000 },
};

/** USD — Stripe Checkout (센트, 해외 카드) */
export const PLAN_USD_TOTAL_CENTS: Record<PlanId, Record<Period, number>> = {
  ribbon_only: { "1m": 1_500, "12m": 12_000 },
  light: { "1m": 2_500, "12m": 30_000 },
  pro: { "1m": 4_000, "12m": 44_000 },
  pro_plus: { "1m": 6_000, "12m": 66_000 },
};

export function formatUsdTotal(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatKrwTotal(amount: number): string {
  return `₩${amount.toLocaleString("en-US")}`;
}

export function planDisplayName(planId: PlanId): string {
  switch (planId) {
    case "ribbon_only":
      return "리본 라이센스";
    case "light":
      return "플로비서 라이트";
    case "pro":
      return "플로비서 프로";
    case "pro_plus":
      return "플로비서 프로 플러스";
    default:
      return planId;
  }
}
