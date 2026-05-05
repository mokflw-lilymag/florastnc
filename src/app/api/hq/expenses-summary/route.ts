import { NextResponse } from "next/server";
import { endOfDay, format, parseISO, startOfDay } from "date-fns";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errExpenseDateOrder,
  errExpenseTooManyRows,
  warnExpenseServiceKeySkipped,
  warnExpenseTableMissing,
} from "@/lib/hq/hq-branch-work-api-errors";
import { HQ_EXPENSE_CATEGORY_FALLBACK } from "@/lib/hq/expense-constants";
import { errAdminDataLoadFailed, errAdminForbidden, errAdminUnauthorized } from "@/lib/admin/admin-api-errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type ExpenseRow = {
  id: string;
  tenant_id: string;
  amount: number | null;
  category: string | null;
  expense_date: string;
  description: string | null;
  payment_method: string | null;
};

function parseYmd(s: string | null, fallback: Date): Date {
  if (!s || !DATE_RE.test(s)) return fallback;
  try {
    return parseISO(s);
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, searchParams.get("uiLocale"));

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

  const orgIds = [...new Set(memberships.map((m) => m.organization_id))];

  const { data: orgs } = await supabase.from("organizations").select("id,name").in("id", orgIds);

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id,name,organization_id,plan")
    .in("organization_id", orgIds)
    .order("name");

  const tenantIds = (tenants ?? []).map((t) => t.id);
  const tenantNameById = Object.fromEntries((tenants ?? []).map((t) => [t.id, t.name]));

  const now = new Date();
  const defaultFrom = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const fromDate = startOfDay(parseYmd(searchParams.get("from"), defaultFrom));
  const toDate = endOfDay(parseYmd(searchParams.get("to"), now));

  if (fromDate > toDate) {
    return NextResponse.json({ error: errExpenseDateOrder(bl) }, { status: 400 });
  }

  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const emptyBranches = (tenants ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    organization_id: t.organization_id,
    plan: t.plan,
    expenseCount: 0,
    totalAmount: 0,
    categoryRows: [] as Array<{ category: string; amount: number; count: number }>,
  }));

  const admin = createAdminClient();
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
      categoryStats: [] as Array<{
        category: string;
        amount: number;
        count: number;
        percent: number;
      }>,
      recentLines: [] as Array<{
        id: string;
        tenant_id: string;
        tenant_name: string;
        amount: number;
        category: string;
        expense_date: string;
        description: string;
        payment_method: string;
      }>,
      warning: !admin ? warnExpenseServiceKeySkipped(bl) : null,
    });
  }

  const pageSize = 1000;
  let offset = 0;
  const rows: ExpenseRow[] = [];
  let fetchError: { message: string } | null = null;

  for (;;) {
    const { data, error } = await admin
      .from("expenses")
      .select("id, tenant_id, amount, category, expense_date, description, payment_method")
      .in("tenant_id", tenantIds)
      .gte("expense_date", fromIso)
      .lte("expense_date", toIso)
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
          categoryStats: [],
          recentLines: [],
          warning: warnExpenseTableMissing(bl),
        });
      }
      console.error("[hq/expenses-summary]", error);
      return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
    }

    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    offset += pageSize;
    if (offset > 80_000) {
      fetchError = { message: errExpenseTooManyRows(bl) };
      break;
    }
  }

  type CatAcc = { amount: number; count: number };
  const byTenant = new Map<string, { count: number; total: number; byCategory: Map<string, CatAcc> }>();
  for (const tid of tenantIds) {
    byTenant.set(tid, { count: 0, total: 0, byCategory: new Map() });
  }

  const globalByCategory = new Map<string, CatAcc>();

  for (const r of rows) {
    const tid = r.tenant_id;
    if (!UUID_RE.test(tid)) continue;
    const bucket = byTenant.get(tid);
    if (!bucket) continue;
    const amt = typeof r.amount === "number" && Number.isFinite(r.amount) ? r.amount : 0;
    const cat = (r.category && String(r.category).trim()) || HQ_EXPENSE_CATEGORY_FALLBACK;
    bucket.count += 1;
    bucket.total += amt;
    const tCat = bucket.byCategory.get(cat) ?? { amount: 0, count: 0 };
    tCat.amount += amt;
    tCat.count += 1;
    bucket.byCategory.set(cat, tCat);

    const gCat = globalByCategory.get(cat) ?? { amount: 0, count: 0 };
    gCat.amount += amt;
    gCat.count += 1;
    globalByCategory.set(cat, gCat);
  }

  const branches = (tenants ?? []).map((t) => {
    const b = byTenant.get(t.id) ?? { count: 0, total: 0, byCategory: new Map() };
    const categoryRows = Array.from(b.byCategory.entries())
      .map(([category, { amount, count }]) => ({ category, amount, count }))
      .sort((x, y) => y.amount - x.amount);
    return {
      id: t.id,
      name: t.name,
      organization_id: t.organization_id,
      plan: t.plan,
      expenseCount: b.count,
      totalAmount: b.total,
      categoryRows,
    };
  });

  const grandTotal = branches.reduce((s, b) => s + b.totalAmount, 0);
  const grandCount = branches.reduce((s, b) => s + b.expenseCount, 0);

  const categoryStats = Array.from(globalByCategory.entries())
    .map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      percent: grandTotal > 0 ? Math.round((amount / grandTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const sortedForRecent = [...rows].sort((a, b) => {
    const da = new Date(a.expense_date).getTime();
    const db = new Date(b.expense_date).getTime();
    return db - da;
  });
  const recentLines = sortedForRecent.slice(0, 100).map((r) => ({
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
    categoryStats,
    recentLines,
    warning: fetchError?.message ?? null,
  });
}
