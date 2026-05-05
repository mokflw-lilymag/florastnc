import { NextResponse } from "next/server";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  format,
  getWeekOfMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveLocale, toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { warnHqOrdersAggregateServiceKey } from "@/lib/hq/hq-service-role-warnings";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminDataLoadFailed, errAdminForbidden, errAdminUnauthorized } from "@/lib/admin/admin-api-errors";

function receiptMixLabelsFor(baseLocale: string): Record<string, string> {
  return {
    delivery_reservation: pickUiText(
      baseLocale,
      "배송",
      "Delivery",
      "Giao hàng",
      "配送",
      "配送",
      "Entrega",
      "Entrega",
      "Livraison",
      "Lieferung",
      "Доставка",
    ),
    pickup_reservation: pickUiText(
      baseLocale,
      "픽업·예약",
      "Pickup (reserved)",
      "Lấy hàng · đặt trước",
      "ピックアップ・予約",
      "自提·预约",
      "Recogida (reservada)",
      "Retirada (reservada)",
      "Retrait (réservé)",
      "Abholung (reserviert)",
      "Самовывоз (по записи)",
    ),
    store_pickup: pickUiText(
      baseLocale,
      "매장수령",
      "In-store pickup",
      "Lấy tại cửa hàng",
      "店頭受取",
      "到店自取",
      "Recogida en tienda",
      "Retirada na loja",
      "Retrait en magasin",
      "Abholung im Laden",
      "Самовывоз из магазина",
    ),
  };
}

export type HqChartPeriod = "daily" | "weekly" | "monthly" | "yearly";

function normalizePeriod(raw: string | null): HqChartPeriod {
  if (raw === "weekly" || raw === "monthly" || raw === "yearly") return raw;
  return "daily";
}

/** YYYY-MM-DD bucket keys aligned with 매장 대시보드 chartPeriod 규칙 */
function buildBuckets(period: HqChartPeriod, now: Date, baseLocale: string) {
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const toStr = format(endOfDay(now), "yyyy-MM-dd");

  if (period === "daily") {
    const rangeStart = startOfDay(subDays(now, 13));
    const fromStr = format(rangeStart, "yyyy-MM-dd");
    const daysList = eachDayOfInterval({ start: rangeStart, end: now });
    const meta = daysList.map((day) => ({
      key: format(day, "yyyy-MM-dd"),
      label: format(day, "d MMM", { locale: dfLoc }),
    }));
    return { fromStr, toStr, meta, period };
  }

  if (period === "weekly") {
    const weeks = eachWeekOfInterval({ start: subMonths(now, 2), end: now });
    const first = startOfWeek(weeks[0]);
    const fromStr = format(startOfDay(first), "yyyy-MM-dd");
    const meta = weeks.map((week) => {
      const wStart = startOfWeek(week);
      const weekNum = getWeekOfMonth(wStart);
      const enWeek = `W${weekNum} ${format(wStart, "MMM d", { locale: dfLoc })}`;
      const viWeek = `W${weekNum} ${format(wStart, "d MMM", { locale: dfLoc })}`;
      const label = pickUiText(
        baseLocale,
        `${format(wStart, "M월", { locale: dfLoc })} ${weekNum}주`,
        enWeek,
        viWeek,
        enWeek,
        enWeek,
        enWeek,
        enWeek,
        enWeek,
        enWeek,
        enWeek,
      );
      return {
        key: format(wStart, "yyyy-MM-dd"),
        label,
      };
    });
    return { fromStr, toStr, meta, period };
  }

  if (period === "monthly") {
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    const fromStr = format(startOfMonth(months[0]), "yyyy-MM-dd");
    const meta = months.map((m) => ({
      key: format(m, "yyyy-MM"),
      label: format(m, "MMM yyyy", { locale: dfLoc }),
    }));
    return { fromStr, toStr, meta, period };
  }

  const years = [subYears(now, 2), subYears(now, 1), now];
  const fromStr = format(startOfYear(years[0]), "yyyy-MM-dd");
  const meta = years.map((y) => {
    const yStr = format(y, "yyyy", { locale: dfLoc });
    return {
      key: format(y, "yyyy"),
      label: pickUiText(
        baseLocale,
        `${yStr}년`,
        yStr,
        yStr,
        `${yStr}年`,
        `${yStr}年`,
        yStr,
        yStr,
        yStr,
        yStr,
        `${yStr} г.`,
      ),
    };
  });
  return { fromStr, toStr, meta, period };
}

function orderDay(d: unknown): string {
  return typeof d === "string" ? d.slice(0, 10) : "";
}

function chartBucketKey(dayStr: string, period: HqChartPeriod): string {
  if (!dayStr) return "";
  const d = parseISO(dayStr);
  if (period === "daily") return dayStr;
  if (period === "weekly") return format(startOfWeek(d), "yyyy-MM-dd");
  if (period === "monthly") return dayStr.slice(0, 7);
  return dayStr.slice(0, 4);
}

function inOrderRange(dayStr: string, fromStr: string, toStr: string): boolean {
  return dayStr >= fromStr && dayStr <= toStr;
}

export async function GET(req: Request) {
  const spEarly = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, spEarly.get("uiLocale") ?? spEarly.get("locale"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  const hasOrgAccess = (memberships?.length ?? 0) > 0;
  if (!hasOrgAccess) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const canManageAnnouncements =
    profileRow?.role === "super_admin" ||
    (memberships ?? []).some((m) => m.role === "org_admin");

  const orgIds = memberships!.map((m) => m.organization_id);

  const { data: orgs } = await supabase.from("organizations").select("id,name").in("id", orgIds);

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id,name,organization_id,plan")
    .in("organization_id", orgIds);

  const tenantIds = (tenants ?? []).map((t) => t.id);
  const tenantNameById = Object.fromEntries((tenants ?? []).map((t) => [t.id, t.name]));
  const admin = createAdminClient();

  const searchParams = spEarly;
  const period = normalizePeriod(searchParams.get("period"));
  const baseLocale = toBaseLocale(resolveLocale(searchParams.get("locale")));
  const receiptLabels = receiptMixLabelsFor(baseLocale);
  const now = new Date();
  const { fromStr, toStr, meta: bucketMeta } = buildBuckets(period, now, baseLocale);

  const emptyBranch = (tenants ?? []).map((t) => ({
    ...t,
    orderCount: 0,
    revenue: 0,
    avgOrderValue: 0,
  }));

  if (!admin || tenantIds.length === 0) {
    return NextResponse.json({
      organizations: orgs ?? [],
      branches: emptyBranch,
      period,
      canManageAnnouncements,
      receiptMix: { delivery_reservation: 0, pickup_reservation: 0, store_pickup: 0, other: 0 },
      receiptMixLabels: receiptLabels,
      ops: { canceledCount: 0, activeOrderCount: 0, cancelRate: 0 },
      chartRows: [] as Record<string, string | number>[],
      branchChartKeys: [] as { id: string; name: string }[],
      warning: !admin ? warnHqOrdersAggregateServiceKey(baseLocale) : null,
    });
  }

  const { data: orders, error } = await admin
    .from("orders")
    .select("tenant_id, summary, status, order_date, receipt_type")
    .in("tenant_id", tenantIds)
    .gte("order_date", fromStr)
    .lte("order_date", toStr);

  if (error) {
    console.error("[hq/summary] orders", error);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }

  const agg = new Map<string, { count: number; revenue: number }>();
  for (const tid of tenantIds) agg.set(tid, { count: 0, revenue: 0 });

  const receiptMix = {
    delivery_reservation: 0,
    pickup_reservation: 0,
    store_pickup: 0,
    other: 0,
  };

  let canceledCount = 0;
  const bucketKeys = new Set(bucketMeta.map((b) => b.key));
  const bucketByTenant = new Map<string, Map<string, number>>();
  for (const b of bucketMeta) {
    bucketByTenant.set(b.key, new Map(tenantIds.map((id) => [id, 0])));
  }

  for (const row of orders ?? []) {
    const tid = row.tenant_id as string;
    const d = orderDay(row.order_date);
    const summary = row.summary as { total?: number } | null;
    const total = summary && typeof summary.total === "number" ? summary.total : 0;
    const st = row.status as string;
    const rt = (row.receipt_type as string) || "other";

    if (!d || !inOrderRange(d, fromStr, toStr)) {
      continue;
    }

    if (st === "canceled") {
      canceledCount += 1;
      continue;
    }

    const cur = agg.get(tid) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += total;
    agg.set(tid, cur);

    if (rt in receiptMix) {
      receiptMix[rt as keyof typeof receiptMix] += 1;
    } else {
      receiptMix.other += 1;
    }

    const bk = chartBucketKey(d, period);
    if (bk && bucketKeys.has(bk)) {
      const dm = bucketByTenant.get(bk)!;
      dm.set(tid, (dm.get(tid) ?? 0) + total);
    }
  }

  const activeOrderCount = (orders ?? []).filter((r) => {
    const d = orderDay(r.order_date);
    return d && inOrderRange(d, fromStr, toStr) && r.status !== "canceled";
  }).length;
  const cancelRate =
    canceledCount + activeOrderCount > 0 ? canceledCount / (canceledCount + activeOrderCount) : 0;

  const branchChartKeys = (tenants ?? []).map((t) => ({ id: t.id, name: t.name }));

  const chartRows: Record<string, string | number>[] = bucketMeta.map(({ key, label }) => {
    const row: Record<string, string | number> = { name: label };
    const dm = bucketByTenant.get(key)!;
    for (const tid of tenantIds) {
      row[tid] = dm.get(tid) ?? 0;
    }
    return row;
  });

  const branches = (tenants ?? []).map((t) => {
    const a = agg.get(t.id) ?? { count: 0, revenue: 0 };
    const avgOrderValue = a.count > 0 ? Math.round(a.revenue / a.count) : 0;
    return { ...t, orderCount: a.count, revenue: a.revenue, avgOrderValue };
  });

  return NextResponse.json({
    organizations: orgs ?? [],
    branches,
    period,
    canManageAnnouncements,
    receiptMix,
    receiptMixLabels: receiptLabels,
    ops: { canceledCount, activeOrderCount, cancelRate },
    chartRows,
    branchChartKeys,
    tenantNameById,
    warning: null,
  });
}
