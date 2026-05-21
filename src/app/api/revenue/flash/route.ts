import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import { assertRevenueFeature } from "@/lib/revenue/tenant-access";
import { listFlashInventoryTargets } from "@/lib/revenue/flash-inventory-service";

/** GET — 재고 임박 상품 · flash autopilot 캠페인 draft */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  const db = createAdminClient() ?? gate.supabase;
  const flashGate = await assertRevenueFeature(db, tenantId, "flash_sale");
  if (!flashGate.ok) {
    return NextResponse.json({ error: flashGate.error, upgradeUrl: "/dashboard/subscription?highlight=revenue" }, { status: flashGate.status });
  }

  const sp = new URL(req.url).searchParams;
  const threshold = Number(sp.get("threshold") ?? 5);

  const [targets, campaignsRes, settingsRes] = await Promise.all([
    listFlashInventoryTargets(db, tenantId, threshold),
    db
      .from("marketing_campaigns")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("campaign_type", "flash_sale")
      .order("created_at", { ascending: false })
      .limit(10),
    db.from("revenue_autopilot_settings").select("flash_autopilot").eq("tenant_id", tenantId).maybeSingle(),
  ]);

  return NextResponse.json({
    flashAutopilot: settingsRes.data?.flash_autopilot ?? false,
    lowStockTargets: targets,
    flashCampaigns: campaignsRes.data ?? [],
  });
}
