import type { AppLocale } from "@/i18n/config";
import { toBaseLocale } from "@/i18n/config";
import {
  PLAN_KRW_TOTAL,
  PLAN_USD_TOTAL_CENTS,
  formatKrwTotal,
  formatUsdTotal,
} from "@/lib/subscription/pricing";
import type { PlanId } from "@/app/dashboard/subscription/plan-localized";

export type PublicPaidPlanId = PlanId;

/** 공개 요금표: ko → 원화, 그 외 locale → USD */
export function isPublicPricingKrw(locale: AppLocale): boolean {
  return toBaseLocale(locale) === "ko";
}

export function publicMonthlyPriceLabel(planId: PublicPaidPlanId, useKrw: boolean): string {
  if (useKrw) {
    const amount = PLAN_KRW_TOTAL[planId]["1m"];
    return `월 ${amount.toLocaleString("en-US")}원`;
  }
  const cents = PLAN_USD_TOTAL_CENTS[planId]["1m"];
  return `${formatUsdTotal(cents)} / month`;
}

export function publicFreePriceLabel(useKrw: boolean): string {
  return useKrw ? "무료 (0원)" : "Free ($0)";
}

export function publicAnnualTotal(planId: PublicPaidPlanId, useKrw: boolean): string {
  if (useKrw) {
    return formatKrwTotal(PLAN_KRW_TOTAL[planId]["12m"]);
  }
  return formatUsdTotal(PLAN_USD_TOTAL_CENTS[planId]["12m"]);
}
