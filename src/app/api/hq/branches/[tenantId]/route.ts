import { NextResponse } from "next/server";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

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

export async function GET(
  _req: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  if (!UUID_RE.test(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (!memberships?.length) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgIds = new Set(memberships.map((m) => m.organization_id));

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, name, plan, organization_id")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantErr) {
    console.error("[hq/branches/tenantId]", tenantErr);
    return NextResponse.json({ error: tenantErr.message }, { status: 500 });
  }
  if (!tenant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!tenant.organization_id || !orgIds.has(tenant.organization_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      warning:
        "서버에 SUPABASE_SERVICE_ROLE_KEY가 없어 주문 집계를 건너뜁니다. Vercel/로컬 .env에 설정하세요.",
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
    return NextResponse.json({ error: ordersErr.message }, { status: 500 });
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
    warning: null as string | null,
  });
}
