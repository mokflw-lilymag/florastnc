import type { AppLocale } from "@/i18n/config";
import { toBaseLocale } from "@/i18n/config";
import {
  PLAN_KRW_TOTAL,
  PLAN_USD_TOTAL_CENTS,
  formatKrwTotal,
  formatUsdTotal,
} from "@/lib/subscription/pricing";
import type { PlanId } from "@/app/dashboard/subscription/plan-localized";
import { applyDiscount } from "@/lib/subscription/discount-helper";

export type PublicPaidPlanId = PlanId;

/** 공개 요금표: ko → 원화, 그 외 locale → USD */
export function isPublicPricingKrw(locale: AppLocale): boolean {
  return toBaseLocale(locale) === "ko";
}

export function publicMonthlyPriceLabel(planId: PublicPaidPlanId, useKrw: boolean, discountRate: number = 0): { text: string; originalText?: string } {
  if (useKrw) {
    const amount = PLAN_KRW_TOTAL[planId]["1m"];
    if (discountRate > 0) {
      const discounted = applyDiscount(amount, discountRate);
      return {
        text: `월 ${discounted.toLocaleString("en-US")}원`,
        originalText: `월 ${amount.toLocaleString("en-US")}원`
      };
    }
    return { text: `월 ${amount.toLocaleString("en-US")}원` };
  }
  
  const cents = PLAN_USD_TOTAL_CENTS[planId]["1m"];
  if (discountRate > 0) {
    const discountedCents = applyDiscount(cents, discountRate);
    return {
      text: `${formatUsdTotal(discountedCents)} / month`,
      originalText: `${formatUsdTotal(cents)} / month`
    };
  }
  return { text: `${formatUsdTotal(cents)} / month` };
}

export function publicFreePriceLabel(useKrw: boolean): string {
  return useKrw ? "무료 (0원)" : "Free ($0)";
}

export function publicAnnualTotal(planId: PublicPaidPlanId, useKrw: boolean, discountRate: number = 0): { text: string; originalText?: string } {
  if (useKrw) {
    const amount = PLAN_KRW_TOTAL[planId]["12m"];
    if (discountRate > 0) {
      const discounted = applyDiscount(amount, discountRate);
      return {
        text: formatKrwTotal(discounted),
        originalText: formatKrwTotal(amount)
      };
    }
    return { text: formatKrwTotal(amount) };
  }
  
  const cents = PLAN_USD_TOTAL_CENTS[planId]["12m"];
  if (discountRate > 0) {
    const discountedCents = applyDiscount(cents, discountRate);
    return {
      text: formatUsdTotal(discountedCents),
      originalText: formatUsdTotal(cents)
    };
  }
  return { text: formatUsdTotal(cents) };
}
