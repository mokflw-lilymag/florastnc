"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, PieChart, Receipt, RefreshCw } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

type CategoryStat = {
  category: string;
  amount: number;
  count: number;
  percent: number;
};

type CategoryRow = { category: string; amount: number; count: number };

type BranchAgg = {
  id: string;
  name: string;
  organization_id: string | null;
  plan: string | null;
  expenseCount: number;
  totalAmount: number;
  categoryRows: CategoryRow[];
};

type RecentLine = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  amount: number;
  category: string;
  expense_date: string;
  description: string;
  payment_method: string;
};

function categorySummaryShort(rows: CategoryRow[], amountSuffix: string, maxParts = 3): string {
  if (rows.length === 0) return "—";
  return rows
    .slice(0, maxParts)
    .map((r) => `${r.category} ${r.amount.toLocaleString()}${amountSuffix}`)
    .join(" · ");
}

export default function HqBranchExpensesPage() {
  const router = useRouter();
  const { profile, isLoading: authLoading } = useAuth();
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchAgg[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [range, setRange] = useState({ from: "", to: "" });
  const [grandTotal, setGrandTotal] = useState(0);
  const [grandCount, setGrandCount] = useState(0);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [recentLines, setRecentLines] = useState<RecentLine[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);
  const amountSuffix = tr("원", "");
  const formatPaymentMethod = (value: string) => {
    const map: Record<string, string> = {
      card: tr("카드", "Card"),
      cash: tr("현금", "Cash"),
      bank_transfer: tr("계좌이체", "Bank Transfer"),
      transfer: tr("계좌이체", "Bank Transfer"),
      other: tr("기타", "Other"),
    };
    return map[value] ?? value;
  };

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setForbidden(false);
    try {
      const q = new URLSearchParams({ from, to });
      const res = await fetch(`/api/hq/expenses-summary?${q}`, { credentials: "include" });
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        return;
      }
      const json = await res.json();
      setOrganizations(json.organizations ?? []);
      setBranches(json.branches ?? []);
      setRange(json.range ?? { from, to });
      setGrandTotal(json.grandTotal ?? 0);
      setGrandCount(json.grandCount ?? 0);
      setCategoryStats(json.categoryStats ?? []);
      setRecentLines(json.recentLines ?? []);
      setWarning(json.warning ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const now = new Date();
    const from = format(startOfMonth(now), "yyyy-MM-dd");
    const to = format(now, "yyyy-MM-dd");
    setFromInput(from);
    setToInput(to);
    void load(from, to);
  }, [authLoading, load]);

  const applyRange = () => {
    if (!fromInput || !toInput) return;
    void load(fromInput, toInput);
  };

  const branchCategoryDetailRows = useMemo(() => {
    const out: Array<{
      branchId: string;
      branchName: string;
      category: string;
      count: number;
      amount: number;
      pctBranch: number;
      pctGrand: number;
    }> = [];
    for (const b of branches) {
      for (const r of b.categoryRows) {
        out.push({
          branchId: b.id,
          branchName: b.name,
          category: r.category,
          count: r.count,
          amount: r.amount,
          pctBranch:
            b.totalAmount > 0 ? Math.round((r.amount / b.totalAmount) * 1000) / 10 : 0,
          pctGrand:
            grandTotal > 0 ? Math.round((r.amount / grandTotal) * 1000) / 10 : 0,
        });
      }
    }
    out.sort((a, b) => {
      const nameCmp = a.branchName.localeCompare(b.branchName, "ko");
      if (nameCmp !== 0) return nameCmp;
      return b.amount - a.amount;
    });
    return out;
  }, [branches, grandTotal]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  if (forbidden) {
    return (
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <PageHeader
          title={tr("지점별 지출", "Branch Expenses")}
          description={tr("소속 조직 매장들의 지출 합계와 최근 내역을 한 화면에서 봅니다.", "View total and recent expenses across organization branches.")}
          icon={Receipt}
        />
        <Card className="max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>{tr("접근할 수 없습니다", "Access denied")}</CardTitle>
            <CardDescription>
              {tr("조직에 배정된 계정만 지점별 지출을 볼 수 있습니다.", "Only organization-assigned accounts can view branch expenses.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/dashboard/hq")}>
              {tr("본사 개요로", "Back to HQ")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedBranches = [...branches].sort((a, b) => b.totalAmount - a.totalAmount);

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={tr("지점별 지출", "Branch Expenses")}
        description={tr("조직 전체·지점별·카테고리별 지출과 건수를 한 번에 봅니다. 건별 입력·수정은 각 매장 계정의 지출 메뉴에서 합니다.", "View totals by organization/branch/category. Per-line edits are done in each branch expense menu.")}
        icon={Receipt}
      />

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{tr("조회 기간", "Date Range")}</CardTitle>
          <CardDescription>
            {range.from && range.to ? (
              <>
                {tr("현재 표", "Current range")}: <strong className="text-foreground">{range.from}</strong> ~{" "}
                <strong className="text-foreground">{range.to}</strong>
              </>
            ) : (
              tr("시작일·종료일을 선택한 뒤 조회합니다.", "Select start/end dates and search.")
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="hq-exp-from">{tr("시작일", "From")}</Label>
            <Input
              id="hq-exp-from"
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              className="w-[11rem]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hq-exp-to">{tr("종료일", "To")}</Label>
            <Input
              id="hq-exp-to"
              type="date"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className="w-[11rem]"
            />
          </div>
          <Button type="button" className="gap-2" onClick={applyRange} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {tr("조회", "Search")}
          </Button>
        </CardContent>
      </Card>

      {organizations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {organizations.map((o) => (
            <Badge key={o.id} variant="secondary" className="font-medium">
              {o.name}
            </Badge>
          ))}
        </div>
      )}

      {warning ? (
        <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
          {warning}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">{tr("합계 지출", "Total Expense")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{grandTotal.toLocaleString()}{tr("원", "")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">{tr("지출 건수", "Expense Count")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{grandCount.toLocaleString()}{tr("건", "")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-indigo-600" />
            {tr("카테고리별 지출 (전체 조직)", "Expense by Category (Organization-wide)")}
          </CardTitle>
          <CardDescription>
            {tr("선택한 기간 동안 모든 지점을 합친 분류별 금액·건수·전체 대비 비율입니다.", "Category amount/count/share across all branches in selected range.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
            </div>
          ) : categoryStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{tr("표시할 카테고리가 없습니다.", "No category data to display.")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr("카테고리", "Category")}</TableHead>
                  <TableHead className="text-right">{tr("건수", "Count")}</TableHead>
                  <TableHead className="text-right">{tr("금액", "Amount")}</TableHead>
                  <TableHead className="text-right w-[72px]">{tr("비율", "Ratio")}</TableHead>
                  <TableHead className="min-w-[140px]">{tr("구성비", "Composition")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryStats.map((c) => (
                  <TableRow key={c.category}>
                    <TableCell className="font-medium">{c.category}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.count.toLocaleString()}건</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {c.amount.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {c.percent}%
                    </TableCell>
                    <TableCell>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                          style={{ width: `${Math.min(c.percent, 100)}%` }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {tr("지점별 합계", "Branch Totals")}
          </CardTitle>
          <CardDescription>{tr("금액 내림차순입니다. 지점명을 누르면 해당 지점 요약으로 이동합니다.", "Sorted by amount desc. Click branch name to open its summary.")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr("지점", "Branch")}</TableHead>
                  <TableHead className="text-right">{tr("건수", "Count")}</TableHead>
                  <TableHead className="text-right">{tr("합계", "Total")}</TableHead>
                  <TableHead className="min-w-[200px]">{tr("카테고리 요약", "Category Summary")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBranches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/hq/branches/${b.id}`}
                        className="text-primary hover:underline underline-offset-4"
                      >
                        {b.name}
                      </Link>
                      {b.plan ? (
                        <Badge variant="outline" className="ml-2 text-[10px] font-normal">
                          {b.plan}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{b.expenseCount}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {b.totalAmount.toLocaleString()}{tr("원", "")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[360px]">
                      {categorySummaryShort(b.categoryRows, amountSuffix)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("지점 · 카테고리별 상세", "Branch · Category Details")}</CardTitle>
          <CardDescription>
            {tr("각 지점에서 분류별로 얼마를 썼는지 건수·금액·지점 내 비중·전체 대비 비중으로 나눕니다.", "Shows count/amount/share-in-branch/share-in-total by category for each branch.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
            </div>
          ) : branchCategoryDetailRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{tr("해당 기간에 지출이 없습니다.", "No expenses in this period.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("지점", "Branch")}</TableHead>
                    <TableHead>{tr("카테고리", "Category")}</TableHead>
                    <TableHead className="text-right">{tr("건수", "Count")}</TableHead>
                    <TableHead className="text-right">{tr("금액", "Amount")}</TableHead>
                    <TableHead className="text-right">{tr("지점 내", "Within Branch")}</TableHead>
                    <TableHead className="text-right">{tr("전체 대비", "vs Total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchCategoryDetailRows.map((row) => (
                    <TableRow key={`${row.branchId}-${row.category}`}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <Link
                          href={`/dashboard/hq/branches/${row.branchId}`}
                          className="text-primary hover:underline underline-offset-4"
                        >
                          {row.branchName}
                        </Link>
                      </TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.count.toLocaleString()}건</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {row.amount.toLocaleString()}{tr("원", "")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.pctBranch}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.pctGrand}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("최근 지출 내역", "Recent Expenses")}</CardTitle>
          <CardDescription>{tr("선택한 기간 안에서 최신순 최대 100건입니다.", "Up to 100 latest entries in selected range.")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : recentLines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{tr("해당 기간에 등록된 지출이 없습니다.", "No expenses recorded in this period.")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr("일자", "Date")}</TableHead>
                  <TableHead>{tr("지점", "Branch")}</TableHead>
                  <TableHead>{tr("분류", "Category")}</TableHead>
                  <TableHead>{tr("적요", "Description")}</TableHead>
                  <TableHead>{tr("결제", "Payment")}</TableHead>
                  <TableHead className="text-right">{tr("금액", "Amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLines.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm tabular-nums whitespace-nowrap">
                      {baseLocale === "ko"
                        ? format(new Date(r.expense_date), "M/d HH:mm", { locale: ko })
                        : format(new Date(r.expense_date), "MM/dd HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Link
                        href={`/dashboard/hq/branches/${r.tenant_id}`}
                        className="text-primary hover:underline underline-offset-4"
                      >
                        {r.tenant_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{r.category}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate" title={r.description}>
                      {r.description}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatPaymentMethod(r.payment_method)}</TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {r.amount.toLocaleString()}{tr("원", "")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
