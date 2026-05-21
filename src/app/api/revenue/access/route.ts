import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getRevenueFeatureList,
  resolveRevenuePlan,
  revenuePlanLabel,
  type RevenueFeature,
} from "@/lib/revenue/plan-access";
import { checkFreePlanCampaignLimit } from "@/lib/revenue/plan-limits";

/** GET — 테넌트 매출 엔진 플랜·기능 플래그 */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  const db = createAdminClient() ?? gate.supabase;
  const { data: tenant } = await db
    .from("tenants")
    .select("plan, subscription_end, status")
    .eq("id", tenantId)
    .maybeSingle();

  const isExpired =
    tenant?.subscription_end != null && new Date(tenant.subscription_end) < new Date();
  const ctx = {
    plan: tenant?.plan,
    isExpired,
    isSuspended: tenant?.status === "suspended",
    isSuperAdmin: false,
  };

  const plan = resolveRevenuePlan(ctx);
  const features = getRevenueFeatureList(ctx);
  const limits = await checkFreePlanCampaignLimit(db, tenantId, plan);

  return NextResponse.json({
    plan,
    planLabel: revenuePlanLabel(plan),
    features: features as RevenueFeature[],
    freeCampaignLimit: limits,
    upgradeUrl: "/dashboard/subscription?highlight=revenue",
  });
}
