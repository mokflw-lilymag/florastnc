import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import { FLASH_STOCK_THRESHOLD } from "@/lib/revenue/flash-inventory-service";
import { assertRevenueFeature } from "@/lib/revenue/tenant-access";

/** GET — 폐기·재고 리스크 리포트 (P3-U3) */
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

  const threshold = Number(new URL(req.url).searchParams.get("threshold") ?? FLASH_STOCK_THRESHOLD);

  const [productsRes, flashRes, expensesRes] = await Promise.all([
    db
      .from("products")
      .select("id, name, stock, price")
      .eq("tenant_id", tenantId)
      .gt("stock", 0)
      .lte("stock", threshold),
    db
      .from("marketing_campaigns")
      .select("id, title, expected_revenue, metadata, status, created_at")
      .eq("tenant_id", tenantId)
      .eq("campaign_type", "flash_sale")
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("expenses")
      .select("amount, description, expense_date, category")
      .eq("tenant_id", tenantId)
      .or("description.ilike.%폐기%,description.ilike.%폐기물%,sub_category.ilike.%폐기%")
      .order("expense_date", { ascending: false })
      .limit(30),
  ]);

  const lowStock = productsRes.data ?? [];
  const atRiskValue = lowStock.reduce((s, p) => s + Number(p.price ?? 0) * Number(p.stock ?? 0), 0);
  const wasteExpenses = (expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0);

  return NextResponse.json({
    lowStockCount: lowStock.length,
    atRiskInventoryValueKrw: atRiskValue,
    wasteExpenseTotalKrw: wasteExpenses,
    wasteExpenseRows: expensesRes.data ?? [],
    flashCampaigns: flashRes.data ?? [],
    recommendation:
      lowStock.length > 0
        ? "재고 플래시 Auto-Pilot ON + 플래시 캠페인 승인으로 소진을 권장합니다."
        : "재고 임박 상품이 없습니다.",
  });
}
