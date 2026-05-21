import type { SupabaseClient } from "@supabase/supabase-js";

export const REVENUE_COUPON_LIMITS_KEY = "revenue_coupon_limits";

export interface RevenueCouponLimits {
  /** 고객당 월 최대 캠페인 발송 수 */
  max_campaigns_per_customer_per_month: number;
  /** 캠페인당 예상 매출 상한 (KRW) — 리포트 어뷰징 방지 */
  max_expected_revenue_krw: number;
  /** 동일 고객·동일 캠페인 타입 최소 재발송 간격 (일) */
  min_resend_interval_days: number;
}

export const DEFAULT_COUPON_LIMITS: RevenueCouponLimits = {
  max_campaigns_per_customer_per_month: 8,
  max_expected_revenue_krw: 500_000,
  min_resend_interval_days: 3,
};

export async function loadCouponLimits(db: SupabaseClient): Promise<RevenueCouponLimits> {
  const { data } = await db
    .from("platform_config")
    .select("value")
    .eq("key", REVENUE_COUPON_LIMITS_KEY)
    .maybeSingle();

  if (data?.value && typeof data.value === "object") {
    return { ...DEFAULT_COUPON_LIMITS, ...(data.value as RevenueCouponLimits) };
  }
  return DEFAULT_COUPON_LIMITS;
}

/** 발송 전 어뷰징·과다 발송 검사 */
export async function checkCampaignSendAllowed(
  db: SupabaseClient,
  params: {
    tenantId: string;
    customerId: string;
    campaignType: string;
  }
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await loadCouponLimits(db);
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { count, error } = await db
    .from("marketing_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", params.tenantId)
    .eq("customer_id", params.customerId)
    .gte("created_at", since.toISOString());

  if (error) return { allowed: true };

  if ((count ?? 0) >= limits.max_campaigns_per_customer_per_month) {
    return { allowed: false, reason: "monthly_cap_exceeded" };
  }

  const intervalSince = new Date();
  intervalSince.setDate(intervalSince.getDate() - limits.min_resend_interval_days);

  const { data: recentSameType } = await db
    .from("marketing_campaigns")
    .select("id")
    .eq("tenant_id", params.tenantId)
    .eq("customer_id", params.customerId)
    .eq("campaign_type", params.campaignType)
    .gte("created_at", intervalSince.toISOString())
    .limit(1);

  if ((recentSameType?.length ?? 0) > 0) {
    return { allowed: false, reason: "resend_interval" };
  }

  return { allowed: true };
}

export function capExpectedRevenue(amount: number, limits: RevenueCouponLimits): number {
  return Math.min(Math.max(0, amount), limits.max_expected_revenue_krw);
}
