import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { aggregateTenantRevenue } from "@/lib/revenue/attribution-service";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminForbidden, errAdminServerMisconfigured } from "@/lib/admin/admin-api-errors";
import { subDays, startOfDay, endOfDay } from "date-fns";

/** 슈퍼관리자 — 테넌트별 Floxync 귀속 매출 집계 */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));

  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const days = Math.min(Math.max(Number(sp.get("days") ?? 30), 1), 365);
  const now = new Date();
  const periodStart = sp.get("from") ?? startOfDay(subDays(now, days)).toISOString();
  const periodEnd = sp.get("to") ?? endOfDay(now).toISOString();

  try {
    const tenants = await aggregateTenantRevenue(admin, periodStart, periodEnd);
    const platformTotal = tenants.reduce((s, t) => s + t.total_attributed, 0);

    return NextResponse.json({
      period_start: periodStart,
      period_end: periodEnd,
      platform_total: platformTotal,
      tenant_count: tenants.length,
      tenants,
      schema_ready: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const missing =
      msg.includes("does not exist") ||
      msg.includes("PGRST205") ||
      msg.includes("marketing_attributions");

    if (missing) {
      return NextResponse.json({
        period_start: periodStart,
        period_end: periodEnd,
        platform_total: 0,
        tenant_count: 0,
        tenants: [],
        schema_ready: false,
        hint: "Run supabase/revenue_engine_schema.sql on Supabase",
      });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
