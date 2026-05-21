import type { SupabaseClient } from "@supabase/supabase-js";
import { FREE_REVENUE_CAMPAIGNS_PER_MONTH } from "@/lib/revenue/plan-access";

/** Free 플랜 월 캠페인 발송 상한 */
export async function checkFreePlanCampaignLimit(
  db: SupabaseClient,
  tenantId: string,
  plan: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  if (plan !== "free") {
    return { allowed: true, used: 0, limit: Infinity };
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { count } = await db
    .from("marketing_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", since.toISOString())
    .in("status", ["sent", "published", "degraded"]);

  const used = count ?? 0;
  return {
    allowed: used < FREE_REVENUE_CAMPAIGNS_PER_MONTH,
    used,
    limit: FREE_REVENUE_CAMPAIGNS_PER_MONTH,
  };
}
