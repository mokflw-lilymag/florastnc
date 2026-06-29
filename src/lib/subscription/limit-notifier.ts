import { SupabaseClient } from "@supabase/supabase-js";
import { startOfMonth, endOfMonth } from "date-fns";

export interface TenantLimitStatus {
  plan: string;
  limit: number;
  softLimit: number;
  current: number;
  isOverSoftLimit: boolean;
  isOverHardLimit: boolean;
  remaining: number;
}

/**
 * 테넌트 요금제별 당월 주문 건수 한도 계산
 */
export function getPlanLimits(plan: string): { limit: number; softLimit: number } {
  switch (plan) {
    case "free":
      return { limit: 5, softLimit: 4 };
    case "ribbon_only":
      return { limit: 10, softLimit: 8 };
    case "light":
      return { limit: 105, softLimit: 80 }; // 라이트 100건 (Soft 80, Hard 105)
    case "pro":
      return { limit: 210, softLimit: 160 }; // 프로 200건 (Soft 160, Hard 210)
    case "pro_plus":
    case "premium":
    case "enterprise":
      return { limit: Infinity, softLimit: Infinity }; // 무제한
    default:
      return { limit: 5, softLimit: 4 }; // 기본 체험판 적용
  }
}

/**
 * Supabase에서 이번 달 주문 건수를 조회하여 한도 상태 반환
 */
export async function checkTenantOrderLimit(
  supabase: SupabaseClient,
  tenantId: string,
  plan: string
): Promise<TenantLimitStatus> {
  const now = new Date();
  const start = startOfMonth(now).toISOString();
  const end = endOfMonth(now).toISOString();

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", start)
    .lte("created_at", end);

  if (error) {
    console.error("Error checking tenant order limit:", error);
    return {
      plan,
      limit: 5,
      softLimit: 4,
      current: 0,
      isOverSoftLimit: false,
      isOverHardLimit: false,
      remaining: 5,
    };
  }

  const current = count || 0;
  const { limit, softLimit } = getPlanLimits(plan);

  return {
    plan,
    limit,
    softLimit,
    current,
    isOverSoftLimit: current >= softLimit,
    isOverHardLimit: current >= limit,
    remaining: limit === Infinity ? Infinity : Math.max(0, limit - current),
  };
}
