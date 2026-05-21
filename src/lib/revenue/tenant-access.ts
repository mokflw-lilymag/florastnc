import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessContext } from "@/lib/subscription/plan-access";
import {
  getRevenueFeatureList,
  hasRevenueFeature,
  resolveRevenuePlan,
  type RevenueFeature,
} from "@/lib/revenue/plan-access";
import { checkFreePlanCampaignLimit } from "@/lib/revenue/plan-limits";

export interface TenantRevenueAccess {
  ctx: AccessContext;
  plan: string;
  features: RevenueFeature[];
}

export async function loadTenantRevenueAccess(
  db: SupabaseClient,
  tenantId: string
): Promise<TenantRevenueAccess> {
  const { data: tenant } = await db
    .from("tenants")
    .select("plan, subscription_end, status")
    .eq("id", tenantId)
    .maybeSingle();

  const isExpired =
    tenant?.subscription_end != null && new Date(tenant.subscription_end) < new Date();
  const ctx: AccessContext = {
    plan: tenant?.plan,
    isExpired,
    isSuspended: tenant?.status === "suspended",
    isSuperAdmin: false,
  };

  return {
    ctx,
    plan: resolveRevenuePlan(ctx),
    features: getRevenueFeatureList(ctx),
  };
}

export async function assertRevenueFeature(
  db: SupabaseClient,
  tenantId: string,
  feature: RevenueFeature
): Promise<{ ok: true; access: TenantRevenueAccess } | { ok: false; error: string; status: number }> {
  const access = await loadTenantRevenueAccess(db, tenantId);
  if (!hasRevenueFeature(access.ctx, feature)) {
    return { ok: false, error: "PLAN_UPGRADE_REQUIRED", status: 403 };
  }
  return { ok: true, access };
}

export async function assertFreeCampaignQuota(
  db: SupabaseClient,
  tenantId: string,
  plan: string
): Promise<{ ok: true } | { ok: false; error: string; status: number; used: number; limit: number }> {
  const limits = await checkFreePlanCampaignLimit(db, tenantId, plan);
  if (!limits.allowed) {
    return {
      ok: false,
      error: "FREE_CAMPAIGN_LIMIT",
      status: 429,
      used: limits.used,
      limit: limits.limit,
    };
  }
  return { ok: true };
}
