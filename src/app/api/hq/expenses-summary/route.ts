import { NextResponse } from "next/server";
import {
  differenceInDays,
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
import { errExpenseTooManyRows, warnExpenseTableMissing } from "@/lib/hq/hq-branch-work-api-errors";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminDataLoadFailed, errAdminForbidden, errAdminUnauthorized } from "@/lib/admin/admin-api-errors";

const HQ_EXPENSE_CATEGORY_FALLBACK = "other";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ExpenseRow {
  id: string;
  tenant_id: string;
  amount: number;
  category: string;
  expense_date: string;
  description: string;
  payment_method: string;
  material_id?: string | null;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale") ?? sp.get("locale"));

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

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const orgIds = memberships.map((m) => m.organization_id);

  const [orgsRes, tenantsRes] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .in("id", orgIds),
    supabase
      .from("tenants")
      .select("id, name, organization_id, plan")
      .in("organization_id", orgIds)
  ]);

  const orgs = orgsRes.data;
  const tenants = tenantsRes.data;

  const tenantIds = (tenants ?? []).map((t) => t.id);
  const tenantNameById = Object.fromEntries((tenants ?? []).map((t) => [t.id, t.name]));
  const admin = createAdminClient();

  const emptyBranches = (tenants ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    organization_id: t.organization_id,
    plan: t.plan,
    expenseCount: 0,
    totalAmount: 0,
    lastYearTotal: 0,
    lastYearMaterialTotal: 0,
    categoryRows: [],
    topMaterials: [],
  }));

  // 1) 날짜 필터 수집 (요약 카드 및 최근 지출 내역용)
  const filterFromStr = sp.get("from");
  const filterToStr = sp.get("to");
  let fromDate = new Date();
  let toDate = new Date();

  if (filterFromStr && filterToStr) {
    fromDate = parseISO(filterFromStr);
    toDate = parseISO(filterToStr);
  } else {
    fromDate = subDays(new Date(), 30);
    toDate = new Date();
  }

  // 올해 선택 기간 범위
  const fromIso = format(startOfDay(fromDate), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  const toIso = format(endOfDay(toDate), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

  const now = new Date();
  const year2026 = "2026";
  const year2025 = "2025";
  const year2024 = "2024";

  // 3개년 분석용은 날짜필터와 완전히 무관하게 "재작년 전체, 작년 전체, 올해 1월 1일 ~ 오늘(당일)"까지로 픽스
  const threeYearFromDate = startOfYear(subYears(now, 2)); // 2024년 1월 1일
  const threeYearFromIso = format(startOfDay(threeYearFromDate), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  const threeYearToIso = format(endOfDay(now), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

  // 작년 동기 범위 (작년 1월 1일 ~ 작년 오늘 전체 누적)
  const lastYearFromDate = subYears(startOfYear(now), 1);
  const lastYearToDate = subYears(now, 1);
  const lastYearFromIso = format(startOfDay(lastYearFromDate), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  const lastYearToIso = format(endOfDay(lastYearToDate), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

  if (!admin || tenantIds.length === 0) {
    return NextResponse.json({
      organizations: orgs ?? [],
      branches: emptyBranches,
      range: {
        from: format(fromDate, "yyyy-MM-dd"),
        to: format(toDate, "yyyy-MM-dd"),
      },
      grandTotal: 0,
      grandCount: 0,
      lastYearGrandTotal: 0,
      categoryStats: [],
      threeYearCategoryStats: [],
      threeYearCategoryMonthlyStats: [],
      threeYearBranchCategoryStats: [],
      threeYearBranchCategoryMonthlyStats: [],
      targetMonthLabel: format(fromDate, "M") + "월",
      recentLines: [],
      globalTopMaterials: [],
      lastYearTopMaterials: [],
      warning: null,
      trendDataList: [],
    });
  }

  let offset = 0;
  const pageSize = 1000;
  const rows: ExpenseRow[] = [];
  let fetchError: { message: string } | null = null;

  // 2024년 1월 1일부터 오늘까지 전체 데이터 일괄 쿼리
  for (;;) {
    const { data, error } = await admin
      .from("expenses")
      .select("id, tenant_id, amount, category, expense_date, description, payment_method, material_id")
      .in("tenant_id", tenantIds)
      .gte("expense_date", threeYearFromIso)
      .lte("expense_date", threeYearToIso)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({
          organizations: orgs ?? [],
          branches: emptyBranches,
          range: {
            from: format(fromDate, "yyyy-MM-dd"),
            to: format(toDate, "yyyy-MM-dd"),
          },
          grandTotal: 0,
          grandCount: 0,
          lastYearGrandTotal: 0,
          categoryStats: [],
          threeYearCategoryStats: [],
          threeYearCategoryMonthlyStats: [],
          threeYearBranchCategoryStats: [],
          threeYearBranchCategoryMonthlyStats: [],
          targetMonthLabel: format(fromDate, "M") + "월",
          recentLines: [],
          globalTopMaterials: [],
          lastYearTopMaterials: [],
          warning: warnExpenseTableMissing(bl),
          trendDataList: [],
        });
      }
      console.error("[hq/expenses-summary]", error);
      return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
    }

    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    offset += pageSize;
    if (offset > 120_000) {
      fetchError = { message: errExpenseTooManyRows(bl) };
      break;
    }
  }

  // 작년 동기 데이터 수집 (작년 요약 카드용)
  let lastYearOffset = 0;
  const lastYearRows: ExpenseRow[] = [];

  for (;;) {
    const { data, error } = await admin
      .from("expenses")
      .select("id, tenant_id, amount, category, expense_date, description, payment_method, material_id")
      .in("tenant_id", tenantIds)
      .gte("expense_date", lastYearFromIso)
      .lte("expense_date", lastYearToIso)
      .order("id", { ascending: true })
      .range(lastYearOffset, lastYearOffset + pageSize - 1);

    if (error) {
      console.error("[hq/expenses-summary lastYear fetch error]:", error);
      break;
    }

    const chunk = data ?? [];
    lastYearRows.push(...chunk);
    if (chunk.length < pageSize) break;
    lastYearOffset += pageSize;
    if (lastYearOffset > 50_000) break;
  }

  // 3개년 연간 및 월별 카테고리별 연간 합계 맵
  const threeYearMap = new Map<string, { amount2024: number; amount2025: number; amount2026: number }>();
  const threeYearMonthlyMap = new Map<string, { amount2024: number; amount2025: number; amount2026: number }>();
  const targetMonth = format(fromDate, "MM");

  // 지점별 3개년 카테고리 비교 맵 (필터 무관 연도 고정 누계)
  const branchThreeYearMap = new Map<string, { tenant_id: string; category: string; amount2024: number; amount2025: number; amount2026: number }>();
  const branchThreeYearMonthlyMap = new Map<string, { tenant_id: string; category: string; amount2024: number; amount2025: number; amount2026: number }>();

  // 금년(올해 2026년) 지점별/글로벌 집계
  type CatAcc = { amount: number; count: number };
  const byTenant = new Map<string, { count: number; total: number; byCategory: Map<string, CatAcc>; byMaterial: Map<string, number> }>();
  for (const tid of tenantIds) {
    byTenant.set(tid, { count: 0, total: 0, byCategory: new Map(), byMaterial: new Map() });
  }

  const globalByCategory = new Map<string, CatAcc>();
  const globalByMaterial = new Map<string, number>();

  for (const r of rows) {
    const tid = r.tenant_id;
    const amt = typeof r.amount === "number" && Number.isFinite(r.amount) ? r.amount : 0;
    const cat = (r.category && String(r.category).trim()) || HQ_EXPENSE_CATEGORY_FALLBACK;
    const ed = r.expense_date;

    const yr = ed.slice(0, 4);
    const mo = ed.slice(5, 7);

    // [중요] 3개년 누적 비교는 날짜 필터와 상관없이 무조건 1월 1일 ~ 연말/오늘까지 누적으로 합산!
    const tStat = threeYearMap.get(cat) ?? { amount2024: 0, amount2025: 0, amount2026: 0 };
    if (yr === year2024) {
      tStat.amount2024 += amt;
    } else if (yr === year2025) {
      tStat.amount2025 += amt;
    } else if (yr === year2026) {
      tStat.amount2026 += amt;
    }
    threeYearMap.set(cat, tStat);

    if (UUID_RE.test(tid)) {
      const bKey = `${tid}_${cat}`;
      const bStat = branchThreeYearMap.get(bKey) ?? { tenant_id: tid, category: cat, amount2024: 0, amount2025: 0, amount2026: 0 };
      if (yr === year2024) {
        bStat.amount2024 += amt;
      } else if (yr === year2025) {
        bStat.amount2025 += amt;
      } else if (yr === year2026) {
        bStat.amount2026 += amt;
      }
      branchThreeYearMap.set(bKey, bStat);
    }

    // 4대 요약 카드 및 점유율 분포용은 "올해 연도(2026년) 선택 날짜 필터 기간"인 것만 카운트!
    const isWithinSyncPeriod = ed >= fromIso && ed <= toIso;
    if (yr === year2026 && isWithinSyncPeriod) {
      if (!UUID_RE.test(tid)) continue;
      const bucket = byTenant.get(tid);
      if (bucket) {
        bucket.count += 1;
        bucket.total += amt;
        const tCat = bucket.byCategory.get(cat) ?? { amount: 0, count: 0 };
        tCat.amount += amt;
        tCat.count += 1;
        bucket.byCategory.set(cat, tCat);
      }

      const gCat = globalByCategory.get(cat) ?? { amount: 0, count: 0 };
      gCat.amount += amt;
      gCat.count += 1;
      globalByCategory.set(cat, gCat);

      const isMaterialCat = cat === "materials" || cat === "자재" || cat === "자재비";
      if (isMaterialCat) {
        const rawName = (r.description && String(r.description).trim()) || "";
        const matName = rawName || "기타 자재";
        if (bucket) {
          bucket.byMaterial.set(matName, (bucket.byMaterial.get(matName) ?? 0) + amt);
        }
        globalByMaterial.set(matName, (globalByMaterial.get(matName) ?? 0) + amt);
      }
    }
  }

  // 작년 동기 지출 가공
  const lastYearGlobalByCategory = new Map<string, number>();
  const lastYearByTenant = new Map<string, { count: number; total: number; materialTotal: number; byMaterial: Map<string, number> }>();
  for (const tid of tenantIds) {
    lastYearByTenant.set(tid, { count: 0, total: 0, materialTotal: 0, byMaterial: new Map() });
  }
  const lastYearGlobalByMaterial = new Map<string, number>();

  for (const r of lastYearRows) {
    const tid = r.tenant_id;
    if (!UUID_RE.test(tid)) continue;
    const bucket = lastYearByTenant.get(tid);
    if (!bucket) continue;
    const amt = typeof r.amount === "number" && Number.isFinite(r.amount) ? r.amount : 0;
    const cat = (r.category && String(r.category).trim()) || HQ_EXPENSE_CATEGORY_FALLBACK;

    bucket.count += 1;
    bucket.total += amt;

    // 카테고리별 작년 글로벌 합산
    lastYearGlobalByCategory.set(cat, (lastYearGlobalByCategory.get(cat) ?? 0) + amt);

    const isMaterialCat = cat === "materials" || cat === "자재" || cat === "자재비";
    if (isMaterialCat) {
      bucket.materialTotal += amt;
      const rawName = (r.description && String(r.description).trim()) || "";
      const matName = rawName || "기타 자재";
      bucket.byMaterial.set(matName, (bucket.byMaterial.get(matName) ?? 0) + amt);
      lastYearGlobalByMaterial.set(matName, (lastYearGlobalByMaterial.get(matName) ?? 0) + amt);
    }
  }

  const branches = (tenants ?? []).map((t) => {
    const b = byTenant.get(t.id) ?? { count: 0, total: 0, byCategory: new Map(), byMaterial: new Map() };
    const ly = lastYearByTenant.get(t.id) ?? { count: 0, total: 0, materialTotal: 0, byMaterial: new Map() };

    const categoryRows = Array.from(b.byCategory.entries())
      .map(([category, { amount, count }]) => ({ category, amount, count }))
      .sort((x, y) => y.amount - x.amount);

    const branchMaterialTotal = categoryRows
      .filter(r => r.category === "materials" || r.category === "자재" || r.category === "자재비")
      .reduce((sum, r) => sum + r.amount, 0);

    const topMaterials = Array.from(b.byMaterial.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percent: branchMaterialTotal > 0 ? Math.round((amount / branchMaterialTotal) * 1000) / 10 : 0
      }))
      .sort((x, y) => y.amount - x.amount)
      .slice(0, 5);

    return {
      id: t.id,
      name: t.name,
      organization_id: t.organization_id,
      plan: t.plan,
      expenseCount: b.count,
      totalAmount: b.total,
      lastYearTotal: ly.total,
      lastYearMaterialTotal: ly.materialTotal,
      categoryRows,
      topMaterials,
    };
  });

  const grandTotal = branches.reduce((s, b) => s + b.totalAmount, 0);
  const grandCount = branches.reduce((s, b) => s + b.expenseCount, 0);
  const lastYearGrandTotal = branches.reduce((s, b) => s + b.lastYearTotal, 0);

  const categoryStats = Array.from(globalByCategory.entries())
    .map(([category, { amount, count }]) => {
      const lastYearAmount = lastYearGlobalByCategory.get(category) ?? 0;
      return {
        category,
        amount,
        count,
        percent: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) / 10 : 0,
        lastYearAmount,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const threeYearCategoryStats = Array.from(threeYearMap.entries())
    .map(([category, stats]) => ({
      category,
      amount2024: stats.amount2024,
      amount2025: stats.amount2025,
      amount2026: stats.amount2026,
    }))
    .sort((a, b) => (b.amount2026 + b.amount2025 + b.amount2024) - (a.amount2026 + a.amount2025 + a.amount2024));

  const threeYearBranchCategoryStats = Array.from(branchThreeYearMap.values());

  const globalMaterialTotal = categoryStats
    .filter(r => r.category === "materials" || r.category === "자재" || r.category === "자재비")
    .reduce((sum, r) => sum + r.amount, 0);

  const globalTopMaterials = Array.from(globalByMaterial.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percent: globalMaterialTotal > 0 ? Math.round((amount / globalMaterialTotal) * 100) / 10 : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const lastYearGlobalMaterialTotal = Array.from(lastYearGlobalByMaterial.values()).reduce((sum, amt) => sum + amt, 0);
  const lastYearTopMaterials = Array.from(lastYearGlobalByMaterial.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percent: lastYearGlobalMaterialTotal > 0 ? Math.round((amount / lastYearGlobalMaterialTotal) * 100) / 10 : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const filteredRows = rows.filter((r) => r.expense_date >= fromIso && r.expense_date <= toIso);

  const sortedForRecent = [...filteredRows].sort((a, b) => {
    const da = new Date(a.expense_date).getTime();
    const db = new Date(b.expense_date).getTime();
    return db - da;
  });

  const recentLines = sortedForRecent.slice(0, 2000).map((r) => ({
    id: r.id,
    tenant_id: r.tenant_id,
    tenant_name: tenantNameById[r.tenant_id] ?? r.tenant_id.slice(0, 8),
    amount: typeof r.amount === "number" && Number.isFinite(r.amount) ? r.amount : 0,
    category: (r.category && String(r.category).trim()) || HQ_EXPENSE_CATEGORY_FALLBACK,
    expense_date: r.expense_date,
    description: (r.description && String(r.description).trim()) || "—",
    payment_method: (r.payment_method && String(r.payment_method).trim()) || "—",
  }));

  return NextResponse.json({
    organizations: orgs ?? [],
    branches,
    range: {
      from: format(fromDate, "yyyy-MM-dd"),
      to: format(toDate, "yyyy-MM-dd"),
    },
    grandTotal,
    grandCount,
    lastYearGrandTotal,
    categoryStats,
    threeYearCategoryStats,
    threeYearBranchCategoryStats,
    targetMonthLabel: format(fromDate, "M") + "월",
    recentLines,
    globalTopMaterials,
    lastYearTopMaterials,
    warning: fetchError?.message ?? null,
  });
}
