import type { Period, PlanId } from "@/app/dashboard/subscription/plan-localized";

/** 구독 결제 기간 — 월간(1m) · 연간(12m)만 판매 */
export const BILLING_PERIODS = ["1m", "12m"] as const;

export function isBillingPeriod(value: string): value is Period {
  return value === "1m" || value === "12m";
}

/**
 * 결제 후 `subscription_end`에 더할 달 수.
 * 연간: 라이트·프로 +1개월(13), 프로+ +2개월(14), 리본 12개월.
 */
export function subscriptionMonths(planId: PlanId, period: Period): number {
  if (period === "1m") return 1;
  switch (planId) {
    case "light":
    case "pro":
      return 13;
    case "pro_plus":
      return 14;
    default:
      return 12;
  }
}

/** 요금표 «월 환산» 표시용 (연간 총액 ÷ 실제 이용 개월) */
export function subscriptionDisplayMonths(planId: PlanId, period: Period): number {
  return subscriptionMonths(planId, period);
}
