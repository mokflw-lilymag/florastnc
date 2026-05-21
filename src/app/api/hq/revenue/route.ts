import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { aggregateHqBranchRevenue, resolveUserOrganizationId } from "@/lib/revenue/hq-revenue-service";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminForbidden } from "@/lib/admin/admin-api-errors";

/** GET — HQ 조직 지점별 Floxync 귀속 매출 */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const bl = await hqApiUiBase(req, new URL(req.url).searchParams.get("uiLocale"));
  const db = createAdminClient() ?? gate.supabase;

  const orgId = await resolveUserOrganizationId(db, gate.userId);
  if (!orgId) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const days = Math.min(Number(sp.get("days") ?? 30), 365);
  const now = new Date();
  const periodStart = startOfDay(subDays(now, days)).toISOString();
  const periodEnd = endOfDay(now).toISOString();

  try {
    const branches = await aggregateHqBranchRevenue(db, orgId, periodStart, periodEnd);
    const total = branches.reduce((s, b) => s + b.total_attributed, 0);
    return NextResponse.json({
      organization_id: orgId,
      period_start: periodStart,
      period_end: periodEnd,
      total_attributed: total,
      branches,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg, branches: [], total_attributed: 0 }, { status: 500 });
  }
}
