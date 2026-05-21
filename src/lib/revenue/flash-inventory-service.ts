import type { SupabaseClient } from "@supabase/supabase-js";
import { createCampaign, generateCampaignCode } from "./attribution-service";
import { capExpectedRevenue, loadCouponLimits } from "./coupon-limits";
import { loadTenantRevenueAccess } from "./tenant-access";
import { hasRevenueFeature } from "./plan-access";

export const FLASH_STOCK_THRESHOLD = 5;
export const FLASH_DISCOUNT_MAX_PERCENT = 15;

export interface FlashInventoryTarget {
  productId: string;
  productName: string;
  stock: number;
  price: number;
}

export async function listFlashInventoryTargets(
  db: SupabaseClient,
  tenantId: string,
  threshold = FLASH_STOCK_THRESHOLD
): Promise<FlashInventoryTarget[]> {
  const { data, error } = await db
    .from("products")
    .select("id, name, stock, price")
    .eq("tenant_id", tenantId)
    .gt("stock", 0)
    .lte("stock", threshold)
    .order("stock", { ascending: true })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((p) => ({
    productId: p.id as string,
    productName: p.name as string,
    stock: Number(p.stock ?? 0),
    price: Number(p.price ?? 0),
  }));
}

/** 재고 소진 플래시 — campaign 생성 (알림은 Phase 3 UI/알림톡) */
export async function runFlashInventoryForTenant(
  db: SupabaseClient,
  tenantId: string,
  opts?: { threshold?: number }
) {
  const { data: settings } = await db
    .from("revenue_autopilot_settings")
    .select("flash_autopilot")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!settings?.flash_autopilot) {
    return { status: "skipped" as const, reason: "autopilot_off" };
  }

  const access = await loadTenantRevenueAccess(db, tenantId);
  if (!hasRevenueFeature(access.ctx, "flash_sale")) {
    return { status: "skipped" as const, reason: "plan_upgrade_required" };
  }

  const targets = await listFlashInventoryTargets(db, tenantId, opts?.threshold);
  if (targets.length === 0) return { status: "skipped" as const, reason: "no_low_stock" };

  const limits = await loadCouponLimits(db);
  const results = [];

  for (const t of targets.slice(0, 3)) {
    const { data: recent } = await db
      .from("marketing_campaigns")
      .select("id, metadata")
      .eq("tenant_id", tenantId)
      .eq("campaign_type", "flash_sale")
      .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString());
    const dup = (recent ?? []).some(
      (c) => (c.metadata as { product_id?: string })?.product_id === t.productId
    );
    if (dup) continue;

    const expected = capExpectedRevenue(t.price * t.stock * 0.5, limits);
    const campaign = await createCampaign(db, tenantId, {
      campaign_code: generateCampaignCode("flash"),
      campaign_type: "flash_sale",
      channel: "copy",
      status: "draft",
      title: `플래시 · ${t.productName} (재고 ${t.stock})`,
      expected_revenue: expected,
      metadata: {
        product_id: t.productId,
        stock: t.stock,
        max_discount_percent: FLASH_DISCOUNT_MAX_PERCENT,
        message: `[${t.productName}] 오늘만 재고 ${t.stock}개! 최대 ${FLASH_DISCOUNT_MAX_PERCENT}% 혜택 문의 주세요.`,
      },
    });
    results.push({ productId: t.productId, campaignId: campaign.id });
  }

  return { status: "created" as const, count: results.length, results };
}
