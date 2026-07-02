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
      "ピックアップ·予約",
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
      "도점자취",
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

// 1) 차트 시각화용 넓은 범위 버킷 생성기 (과거의 원래 넓은 범위로 복원 + 년별은 올해 포함 5개년으로 전면 개조)
function buildChartBuckets(period: HqChartPeriod, now: Date, baseLocale: string) {
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const toStr = format(now, "yyyy-MM-dd");

  if (period === "daily") {
    // 과거 14일간 흐름
    const fromStr = format(subDays(now, 13), "yyyy-MM-dd");
    const days = eachDayOfInterval({ start: parseISO(fromStr), end: now });
    const meta = days.map((d) => ({
      key: format(d, "yyyy-MM-dd"),
      label: format(d, "d", { locale: dfLoc }),
    }));
    return { fromStr, toStr, meta };
  }

  if (period === "weekly") {
    // 과거 8주간 흐름
    const fromStr = format(startOfWeek(subDays(now, 7 * 7), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weeks = eachWeekOfInterval({ start: parseISO(fromStr), end: now });
    const meta = weeks.map((week) => {
      const wStart = startOfWeek(week, { weekStartsOn: 1 });
      const wLabel = format(wStart, "MM.dd");
      return {
        key: format(wStart, "yyyy-MM-dd"),
        label: wLabel,
      };
    });
    return { fromStr, toStr, meta };
  }

  if (period === "monthly") {
    // 과거 6개월간 흐름
    const fromStr = format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd");
    const months = eachMonthOfInterval({ start: parseISO(fromStr), end: now });
    const meta = months.map((m) => ({
      key: format(m, "yyyy-MM"),
      label: format(m, "MMM", { locale: dfLoc }),
    }));
    return { fromStr, toStr, meta };
  }

  // 년별: 올해 포함 최근 5개년 연도별 흐름 (예: 2022 ~ 2026)
  const fromStr = format(startOfYear(subYears(now, 4)), "yyyy-MM-dd");
  const yearsMeta = [];
  for (let i = 4; i >= 0; i--) {
    const yr = subYears(now, i);
    const yrKey = format(yr, "yyyy");
    yearsMeta.push({
      key: yrKey,
      label: yrKey + "년",
    });
  }
  return { fromStr, toStr, meta: yearsMeta };
}

// 2) 사장님의 칼같은 현황판용 좁은 기간 범위 생성기
function buildNarrowRanges(period: HqChartPeriod, now: Date) {
  const toStr = format(now, "yyyy-MM-dd");
  let fromStr = toStr;

  if (period === "daily") {
    fromStr = toStr; // 오늘 하루 당일만
  } else if (period === "weekly") {
    fromStr = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"); // 이번 주 월 ~ 오늘
  } else if (period === "monthly") {
    fromStr = format(startOfMonth(now), "yyyy-MM-dd"); // 이번 달 1 ~ 오늘
  } else if (period === "yearly") {
    fromStr = format(startOfYear(now), "yyyy-MM-dd"); // 올해 1.1 ~ 오늘
  }

  return { narrowFromStr: fromStr, narrowToStr: toStr };
}

function orderDay(d: unknown): string {
  return typeof d === "string" ? d.slice(0, 10) : "";
}

function chartBucketKey(dayStr: string, period: HqChartPeriod): string {
  if (!dayStr) return "";
  const d = parseISO(dayStr);
  if (period === "daily") return dayStr;
  if (period === "weekly") return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
  if (period === "monthly") return dayStr.slice(0, 7);
  if (period === "yearly") return dayStr.slice(0, 4); // 연도별(yyyy) 추출
  return dayStr.slice(0, 7);
}

function inDateRange(dayStr: string, fromStr: string, toStr: string): boolean {
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

  const [membershipsRes, profileRes] = await Promise.all([
    supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
  ]);

  const memberships = membershipsRes.data;
  const profileRow = profileRes.data;

  const hasOrgAccess = (memberships?.length ?? 0) > 0;
  if (!hasOrgAccess) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }
  const canManageAnnouncements =
    profileRow?.role === "super_admin" ||
    (memberships ?? []).some((m) => m.role === "org_admin");

  const orgIds = memberships!.map((m) => m.organization_id);

  const [orgsRes, tenantsRes] = await Promise.all([
    supabase.from("organizations").select("id,name").in("id", orgIds),
    supabase.from("tenants").select("id,name,organization_id,plan").in("organization_id", orgIds)
  ]);
  const orgs = orgsRes.data;
  const tenants = tenantsRes.data;

  const tenantIds = (tenants ?? []).map((t) => t.id);
  const tenantNameById = Object.fromEntries((tenants ?? []).map((t) => [t.id, t.name]));
  const admin = createAdminClient();

  const searchParams = spEarly;
  const period = normalizePeriod(searchParams.get("period"));
  const baseLocale = toBaseLocale(resolveLocale(searchParams.get("locale")));
  const receiptLabels = receiptMixLabelsFor(baseLocale);
  const now = new Date();

  // 차트용 넓은 날짜 경계
  const { fromStr, toStr, meta: chartBucketMeta } = buildChartBuckets(period, now, baseLocale);
  // 현황판용 좁은 날짜 경계
  const { narrowFromStr, narrowToStr } = buildNarrowRanges(period, now);

  const emptyBranch = (tenants ?? []).map((t) => ({
    ...t,
    orderCount: 0,
    revenue: 0,
    avgOrderValue: 0,
    expense: 0,
    profit: 0,
    margin: 0,
    receiptTypes: { delivery: 0, pickup: 0, store: 0, other: 0 },
    topMaterials: [],
    topProducts: []
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
      grandRevenue: 0,
      grandExpense: 0,
      grandProfit: 0,
      grandMargin: 0,
      globalTopMaterials: [],
      globalTopProducts: [],
      warning: !admin ? warnHqOrdersAggregateServiceKey(baseLocale) : null,
    });
  }

  // 🚀 [PERFORMANCE OPTIMIZATION] 1, 2번 데이터를 넓은 범위로 병렬 호출
  const [ordersRes, expensesRes] = await Promise.all([
    admin
      .from("orders")
      .select("tenant_id, summary, status, order_date, receipt_type, items")
      .in("tenant_id", tenantIds)
      .gte("order_date", fromStr)
      .lte("order_date", toStr),
    admin
      .from("expenses")
      .select("tenant_id, amount, category, description, expense_date")
      .in("tenant_id", tenantIds)
      .gte("expense_date", `${fromStr}T00:00:00.000Z`)
      .lte("expense_date", `${toStr}T23:59:59.999Z`)
  ]);

  if (ordersRes.error) {
    console.error("[hq/summary] orders", ordersRes.error);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }

  if (expensesRes.error) {
    console.error("[hq/summary] expenses load error:", expensesRes.error);
  }

  const orders = ordersRes.data;
  const expenses = expensesRes.data;

  // --- [차트 데이터 연산 - 넓은 범위(fromStr ~ toStr) 기준] ---
  const chartBucketKeys = new Set(chartBucketMeta.map((b) => b.key));
  const bucketByTenant = new Map<string, Map<string, number>>();
  for (const b of chartBucketMeta) {
    bucketByTenant.set(b.key, new Map(tenantIds.map((id) => [id, 0])));
  }

  for (const row of orders ?? []) {
    const tid = row.tenant_id as string;
    const d = orderDay(row.order_date);
    const summary = row.summary as { total?: number } | null;
    const total = summary && typeof summary.total === "number" ? summary.total : 0;
    const st = row.status as string;

    if (!d || st === "canceled" || !inDateRange(d, fromStr, toStr)) {
      continue;
    }

    const bk = chartBucketKey(d, period);
    if (bk && chartBucketKeys.has(bk)) {
      const dm = bucketByTenant.get(bk)!;
      dm.set(tid, (dm.get(tid) ?? 0) + total);
    }
  }

  const chartRows: Record<string, string | number>[] = chartBucketMeta.map(({ key, label }) => {
    const row: Record<string, string | number> = { name: label };
    const dm = bucketByTenant.get(key)!;
    for (const tid of tenantIds) {
      row[tid] = dm.get(tid) ?? 0;
    }
    return row;
  });

  const branchChartKeys = (tenants ?? []).map((t) => ({ id: t.id, name: t.name }));

  // --- [현황판 및 지점 상세 지표 집계 - 좁은 범위(narrowFromStr ~ narrowToStr) 기준] ---
  const expMap = new Map<string, number>();
  for (const tid of tenantIds) expMap.set(tid, 0);

  // 현황판용 좁은 범위 통합 베스트 자재 집계
  const globalMaterialsMap = new Map<string, number>();
  // 지점별 자재 집계용 맵
  const branchMaterialsMap = new Map<string, Map<string, number>>();
  for (const tid of tenantIds) {
    branchMaterialsMap.set(tid, new Map<string, number>());
  }

  if (expenses) {
    for (const e of expenses) {
      const tid = e.tenant_id;
      const amt = typeof e.amount === "number" && Number.isFinite(e.amount) ? e.amount : 0;
      const ed = orderDay(e.expense_date);

      // 현황판 좁은 범위 내에 해당하는 지출만 집계
      if (ed && inDateRange(ed, narrowFromStr, narrowToStr)) {
        expMap.set(tid, (expMap.get(tid) ?? 0) + amt);

        // 자재 랭킹 누적 (카테고리 분류)
        const cat = (e.category || "").trim().toLowerCase();
        if (cat === "materials" || cat === "자재" || cat === "자재비") {
          const desc = (e.description || "기타 자재").trim() || "기타 자재";
          globalMaterialsMap.set(desc, (globalMaterialsMap.get(desc) ?? 0) + amt);

          const matMap = branchMaterialsMap.get(tid)!;
          matMap.set(desc, (matMap.get(desc) ?? 0) + amt);
        }
      }
    }
  }

  const agg = new Map<string, { count: number; revenue: number }>();
  for (const tid of tenantIds) agg.set(tid, { count: 0, revenue: 0 });

  const receiptMix = {
    delivery_reservation: 0,
    pickup_reservation: 0,
    store_pickup: 0,
    other: 0,
  };

  const branchReceiptTypeMap = new Map<string, { delivery: number; pickup: number; store: number; other: number }>();
  for (const tid of tenantIds) {
    branchReceiptTypeMap.set(tid, { delivery: 0, pickup: 0, store: 0, other: 0 });
  }

  // 현황판용 좁은 범위 통합 베스트 상품 집계
  const globalProductsMap = new Map<string, number>();
  // 지점별 베스트 상품 집계용 맵
  const branchProductsMap = new Map<string, Map<string, number>>();
  for (const tid of tenantIds) {
    branchProductsMap.set(tid, new Map<string, number>());
  }

  let canceledCount = 0;
  let narrowActiveOrderCount = 0;

  for (const row of orders ?? []) {
    const tid = row.tenant_id as string;
    const d = orderDay(row.order_date);
    const summary = row.summary as { total?: number } | null;
    const total = summary && typeof summary.total === "number" ? summary.total : 0;
    const st = row.status as string;
    const rt = (row.receipt_type as string) || "other";

    // 현황판 좁은 범위 내에 해당하는 주문만 집계
    if (d && inDateRange(d, narrowFromStr, narrowToStr)) {
      if (st === "canceled") {
        canceledCount += 1;
        continue;
      }

      narrowActiveOrderCount += 1;

      const cur = agg.get(tid) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += total;
      agg.set(tid, cur);

      if (rt in receiptMix) {
        receiptMix[rt as keyof typeof receiptMix] += 1;
      } else {
        receiptMix.other += 1;
      }

      const curReceipt = branchReceiptTypeMap.get(tid) ?? { delivery: 0, pickup: 0, store: 0, other: 0 };
      if (rt === "delivery_reservation") {
        curReceipt.delivery += 1;
      } else if (rt === "pickup_reservation") {
        curReceipt.pickup += 1;
      } else if (rt === "store_pickup") {
        curReceipt.store += 1;
      } else {
        curReceipt.other += 1;
      }
      branchReceiptTypeMap.set(tid, curReceipt);

      // 베스트 상품 금액 누계 연산 (qty * price)
      const items = row.items as { name: string; quantity: number; price?: number }[] | null;
      if (Array.isArray(items)) {
        for (const item of items) {
          const name = (item.name || "일반 상품").trim() || "일반 상품";
          const qty = typeof item.quantity === "number" && Number.isFinite(item.quantity) ? item.quantity : 1;
          const price = typeof item.price === "number" && Number.isFinite(item.price) ? item.price : 0;
          const lineTotal = qty * price;

          globalProductsMap.set(name, (globalProductsMap.get(name) ?? 0) + lineTotal);

          const pMap = branchProductsMap.get(tid)!;
          pMap.set(name, (pMap.get(name) ?? 0) + lineTotal);
        }
      }
    }
  }

  const cancelRate =
    canceledCount + narrowActiveOrderCount > 0 ? canceledCount / (canceledCount + narrowActiveOrderCount) : 0;

  const branches = (tenants ?? []).map((t) => {
    const a = agg.get(t.id) ?? { count: 0, revenue: 0 };
    const avgOrderValue = a.count > 0 ? Math.round(a.revenue / a.count) : 0;
    const expense = expMap.get(t.id) ?? 0;
    const profit = a.revenue - expense;
    const margin = a.revenue > 0 ? Math.round((profit / a.revenue) * 100) : 0;
    const receiptTypes = branchReceiptTypeMap.get(t.id) ?? { delivery: 0, pickup: 0, store: 0, other: 0 };

    // 지점 단독 베스트 자재 TOP 10 (합산 금액 기준)
    const matMap = branchMaterialsMap.get(t.id) ?? new Map<string, number>();
    const matTotal = Array.from(matMap.values()).reduce((sum, v) => sum + v, 0);
    const topMaterials = Array.from(matMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percent: matTotal > 0 ? Math.round((amount / matTotal) * 100) : 0,
      }))
      .sort((x, y) => y.amount - x.amount)
      .slice(0, 10);

    // 지점 단독 베스트 상품 TOP 10 (합산 매출액 기준)
    const prodMap = branchProductsMap.get(t.id) ?? new Map<string, number>();
    const prodTotal = Array.from(prodMap.values()).reduce((sum, v) => sum + v, 0);
    const topProducts = Array.from(prodMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percent: prodTotal > 0 ? Math.round((amount / prodTotal) * 100) : 0,
      }))
      .sort((x, y) => y.amount - x.amount)
      .slice(0, 10);

    return { 
      ...t, 
      orderCount: a.count, 
      revenue: a.revenue, 
      avgOrderValue,
      expense,
      profit,
      margin,
      receiptTypes,
      topMaterials,
      topProducts
    };
  });

  const grandRevenue = branches.reduce((sum, b) => sum + b.revenue, 0);
  const grandExpense = branches.reduce((sum, b) => sum + b.expense, 0);
  const grandProfit = grandRevenue - grandExpense;
  const grandMargin = grandRevenue > 0 ? Math.round((grandProfit / grandRevenue) * 100) : 0;

  // 글로벌 베스트 자재 TOP 10 정렬 및 비율 연산 (합산 금액 기준)
  const globalMaterialsTotal = Array.from(globalMaterialsMap.values()).reduce((sum, v) => sum + v, 0);
  const globalTopMaterials = Array.from(globalMaterialsMap.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percent: globalMaterialsTotal > 0 ? Math.round((amount / globalMaterialsTotal) * 100) : 0,
    }))
    .sort((x, y) => y.amount - x.amount)
    .slice(0, 10);

  // 글로벌 베스트 상품 TOP 10 정렬 및 비율 연산 (합산 금액 기준)
  const globalProductsTotal = Array.from(globalProductsMap.values()).reduce((sum, v) => sum + v, 0);
  const globalTopProducts = Array.from(globalProductsMap.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percent: globalProductsTotal > 0 ? Math.round((amount / globalProductsTotal) * 100) : 0,
    }))
    .sort((x, y) => y.amount - x.amount)
    .slice(0, 10);

  return NextResponse.json({
    organizations: orgs ?? [],
    branches,
    period,
    canManageAnnouncements,
    receiptMix,
    receiptMixLabels: receiptLabels,
    ops: { canceledCount, activeOrderCount: narrowActiveOrderCount, cancelRate },
    chartRows,
    branchChartKeys,
    tenantNameById,
    grandRevenue,
    grandExpense,
    grandProfit,
    grandMargin,
    globalTopMaterials,
    globalTopProducts,
    warning: null,
  });
}
