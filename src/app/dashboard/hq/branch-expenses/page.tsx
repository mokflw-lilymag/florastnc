"use client";
import { getMessages } from "@/i18n/getMessages";

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
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);  const amountSuffix = tf.f00487;
  const formatPaymentMethod = (value: string) => {
    const map: Record<string, string> = {
      card: tf.f00704,
      cash: tf.f00769,
      bank_transfer: tf.f00057,
      transfer: tf.f00057,
      other: tf.f00115,
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
          title={tf.f01923}
          description={tf.f01436}
          icon={Receipt}
        />
        <Card className="max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>{tf.f01814}</CardTitle>
            <CardDescription>
              {tf.f01852}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/dashboard/hq")}>
              {tf.f01264}
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
        title={tf.f01923}
        description={tf.f01844}
        icon={Receipt}
      />

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{tf.f01858}</CardTitle>
          <CardDescription>
            {range.from && range.to ? (
              <>
                {tf.f02193}: <strong className="text-foreground">{range.from}</strong> ~{" "}
                <strong className="text-foreground">{range.to}</strong>
              </>
            ) : (
              tf.f01489
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="hq-exp-from">{tf.f01488}</Label>
            <Input
              id="hq-exp-from"
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              className="w-[11rem]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hq-exp-to">{tf.f01861}</Label>
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
            {tf.f01857}
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
            <CardTitle className="text-sm text-muted-foreground font-medium">{tf.f02167}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{grandTotal.toLocaleString()}{tf.f00487}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">{tf.f01930}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{grandCount.toLocaleString()}{tf.f00033}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-indigo-600" />
            {tf.f02067}
          </CardTitle>
          <CardDescription>
            {tf.f01408}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
            </div>
          ) : categoryStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{tf.f02121}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tf.f02060}</TableHead>
                  <TableHead className="text-right">{tf.f00896}</TableHead>
                  <TableHead className="text-right">{tf.f00097}</TableHead>
                  <TableHead className="text-right w-[72px]">{tf.f01306}</TableHead>
                  <TableHead className="min-w-[140px]">{tf.f00989}</TableHead>
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
            {tf.f01924}
          </CardTitle>
          <CardDescription>{tf.f00997}</CardDescription>
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
                  <TableHead>{tf.f00663}</TableHead>
                  <TableHead className="text-right">{tf.f00896}</TableHead>
                  <TableHead className="text-right">{tf.f02164}</TableHead>
                  <TableHead className="min-w-[200px]">{tf.f02066}</TableHead>
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
                      {b.totalAmount.toLocaleString()}{tf.f00487}
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
          <CardTitle>{tf.f01906}</CardTitle>
          <CardDescription>
            {tf.f00851}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
            </div>
          ) : branchCategoryDetailRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{tf.f02178}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tf.f00663}</TableHead>
                    <TableHead>{tf.f02060}</TableHead>
                    <TableHead className="text-right">{tf.f00896}</TableHead>
                    <TableHead className="text-right">{tf.f00097}</TableHead>
                    <TableHead className="text-right">{tf.f01907}</TableHead>
                    <TableHead className="text-right">{tf.f01796}</TableHead>
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
                        {row.amount.toLocaleString()}{tf.f00487}
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
          <CardTitle>{tf.f02015}</CardTitle>
          <CardDescription>{tf.f01409}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : recentLines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{tf.f02177}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tf.f01717}</TableHead>
                  <TableHead>{tf.f00663}</TableHead>
                  <TableHead>{tf.f01290}</TableHead>
                  <TableHead>{tf.f01772}</TableHead>
                  <TableHead>{tf.f00909}</TableHead>
                  <TableHead className="text-right">{tf.f00097}</TableHead>
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
                      {r.amount.toLocaleString()}{tf.f00487}
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
