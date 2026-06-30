import { NextResponse } from "next/server";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveLocale, toBaseLocale } from "@/i18n/config";
import { warnHqOrdersAggregateServiceKey } from "@/lib/hq/hq-service-role-warnings";
import { errHqBranchNotFound, errHqInvalidBranchTenantId } from "@/lib/hq/hq-branch-work-api-errors";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminDataLoadFailed, errAdminForbidden, errAdminUnauthorized } from "@/lib/admin/admin-api-errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function orderTotal(summary: unknown): number {
  if (!summary || typeof summary !== "object") return 0;
  const t = (summary as { total?: unknown }).total;
  return typeof t === "number" ? t : 0;
}

function ordererName(orderer: unknown): string {
  if (!orderer || typeof orderer !== "object") return "—";
  const n = (orderer as { name?: unknown }).name;
  return typeof n === "string" && n.trim() ? n : "—";
}

export async function GET(req: Request, context: { params: Promise<{ tenantId: string }> }) {
  const sp = new URL(req.url).searchParams;
  const baseLocale = toBaseLocale(resolveLocale(sp.get("locale")));
  const bl = await hqApiUiBase(req, sp.get("uiLocale") ?? sp.get("locale"));
  const { tenantId } = await context.params;
  if (!UUID_RE.test(tenantId)) {
    return NextResponse.json({ error: errHqInvalidBranchTenantId(baseLocale) }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (!memberships?.length) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const orgIds = new Set(memberships.map((m) => m.organization_id));

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, name, plan, organization_id")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantErr) {
    console.error("[hq/branches/tenantId]", tenantErr);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }
  if (!tenant) {
    return NextResponse.json({ error: errHqBranchNotFound(baseLocale) }, { status: 404 });
  }
  if (!tenant.organization_id || !orgIds.has(tenant.organization_id)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const fromStr = format(startOfDay(subDays(now, 13)), "yyyy-MM-dd");
  const toStr = format(endOfDay(now), "yyyy-MM-dd");

  if (!admin) {
    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        organizationId: tenant.organization_id,
      },
      range: { from: fromStr, to: toStr },
      stats: null,
      recentOrders: [],
      warning: warnHqOrdersAggregateServiceKey(baseLocale),
    });
  }

  const { data: orders, error: ordersErr } = await admin
    .from("orders")
    .select("id, order_number, status, order_date, receipt_type, summary, orderer, created_at")
    .eq("tenant_id", tenantId)
    .gte("order_date", fromStr)
    .lte("order_date", toStr);

  if (ordersErr) {
    console.error("[hq/branches/tenantId] orders", ordersErr);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }

  const rows = orders ?? [];
  let revenue = 0;
  let orderCount = 0;
  let canceledCount = 0;

  for (const row of rows) {
    const st = row.status as string;
    if (st === "canceled") {
      canceledCount += 1;
      continue;
    }
    orderCount += 1;
    revenue += orderTotal(row.summary);
  }

  const avgOrderValue = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

  const sorted = [...rows].sort((a, b) => {
    const ta = String(a.created_at || a.order_date || "");
    const tb = String(b.created_at || b.order_date || "");
    return tb.localeCompare(ta);
  });

  const recentOrders = sorted.slice(0, 10).map((o) => ({
    id: o.id as string,
    order_number: o.order_number as string,
    status: o.status as string,
    order_date: o.order_date as string,
    receipt_type: (o.receipt_type as string) || "—",
    total: orderTotal(o.summary),
    ordererName: ordererName(o.orderer),
  }));

  const dateParam = sp.get("date");
  let settlementData = null;

  if (dateParam && admin) {
    try {
      const dateFromFetch = new Date(dateParam);
      dateFromFetch.setDate(dateFromFetch.getDate() - 30);
      dateFromFetch.setHours(0, 0, 0, 0);

      const dateToFetch = new Date(dateParam);
      dateToFetch.setHours(23, 59, 59, 999);

      const { data: sOrds } = await admin
        .from("orders")
        .select("id, tenant_id, order_number, status, order_date, created_at, payment, summary, items, orderer, transfer_info, outsource_info")
        .eq("tenant_id", tenantId)
        .gte("order_date", dateFromFetch.toISOString())
        .lte("order_date", dateToFetch.toISOString());

      const expFrom = new Date(dateParam);
      expFrom.setHours(0, 0, 0, 0);

      const expTo = new Date(dateParam);
      expTo.setHours(23, 59, 59, 999);

      const { data: sExps } = await admin
        .from("expenses")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("expense_date", expFrom.toISOString())
        .lte("expense_date", expTo.toISOString());

      const { data: sRec } = await admin
        .from("daily_settlements")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("date", dateParam)
        .maybeSingle();

      const { data: sPrev } = await admin
        .from("daily_settlements")
        .select("*")
        .eq("tenant_id", tenantId)
        .lt("date", dateParam)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      settlementData = {
        orders: sOrds || [],
        expenses: sExps || [],
        settlementRecord: sRec || null,
        prevSettlementRecord: sPrev || null
      };
    } catch (e) {
      console.error("[hq/branches/tenantId] settlementData query error:", e);
    }
  }

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      organizationId: tenant.organization_id,
    },
    range: { from: fromStr, to: toStr },
    stats: {
      orderCount,
      revenue,
      canceledCount,
      avgOrderValue,
    },
    recentOrders,
    settlementData,
    warning: null as string | null,
  });
}
