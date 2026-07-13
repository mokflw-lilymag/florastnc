import type { Period, PlanId } from "@/app/dashboard/subscription/plan-localized";

export interface GlobalDiscountSettings {
  globalDiscountEnabled?: boolean;
  globalDiscountRate?: number;
  globalDiscountStartDate?: string;
  globalDiscountEndDate?: string;
  globalDiscountTargets?: Record<string, Record<string, boolean>>;
}

/**
 * 전역 설정의 할인 조건(활성화 여부, 기간, 대상 요금제)을 검사하여
 * 최종적으로 적용할 할인율을 반환합니다. 할인이 적용되지 않으면 0을 반환합니다.
 */
export function getActiveDiscountRate(
  settings: GlobalDiscountSettings | null | undefined,
  planId: PlanId,
  period: Period
): number {
  if (!settings?.globalDiscountEnabled) return 0;
  
  const now = new Date();
  
  // 기간 체크
  if (settings.globalDiscountStartDate) {
    const startDate = new Date(settings.globalDiscountStartDate);
    if (now < startDate) return 0;
  }
  
  if (settings.globalDiscountEndDate) {
    const endDate = new Date(settings.globalDiscountEndDate);
    if (now > endDate) return 0;
  }
  
  // 대상 요금제/기간 체크
  const isTargeted = settings.globalDiscountTargets?.[planId]?.[period];
  if (!isTargeted) return 0;
  
  // 유효한 할인율 반환
  const rate = settings.globalDiscountRate ?? 0;
  if (rate <= 0 || rate > 100) return 0;
  
  return rate;
}

/**
 * 원가와 할인율(%)을 받아 할인된 최종 금액을 반환합니다.
 */
export function applyDiscount(originalPrice: number, discountRate: number): number {
  if (discountRate <= 0) return originalPrice;
  if (discountRate >= 100) return 0;
  
  return Math.max(0, Math.floor(originalPrice * (1 - discountRate / 100)));
}
