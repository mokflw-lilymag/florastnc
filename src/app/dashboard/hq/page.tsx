"use client";
import { getMessages } from "@/i18n/getMessages";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Building2,
  Loader2,
  TrendingUp,
  ShoppingCart,
  Truck,
  Store,
  Package,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { usePartnerTouchUi } from "@/hooks/use-partner-touch-ui";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { HqRevenueStackedChart } from "@/components/hq/hq-revenue-stacked-chart";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

type BranchRow = {
  id: string;
  name: string;
  organization_id: string | null;
  plan: string | null;
  orderCount: number;
  revenue: number;
  avgOrderValue: number;
};

type HqChartPeriod = "daily" | "weekly" | "monthly" | "yearly";

export default function HqDashboardPage() {
  const router = useRouter();
  const { profile, isLoading } = useAuth();
  const touchUi = usePartnerTouchUi();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [orgNames, setOrgNames] = useState<{ id: string; name: string }[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [receiptMix, setReceiptMix] = useState({
    delivery_reservation: 0,
    pickup_reservation: 0,
    store_pickup: 0,
    other: 0,
  });
  const [ops, setOps] = useState({ canceledCount: 0, activeOrderCount: 0, cancelRate: 0 });
  const [chartPeriod, setChartPeriod] = useState<HqChartPeriod>("daily");
  const [chartRows, setChartRows] = useState<Record<string, string | number>[]>([]);
  const [branchChartKeys, setBranchChartKeys] = useState<{ id: string; name: string }[]>([]);
  const [chartSwitchLoading, setChartSwitchLoading] = useState(false);
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const dailyChartCache = useRef<{
    chartRows: Record<string, string | number>[];
    branchChartKeys: { id: string; name: string }[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setForbidden(false);
      try {
        const dRes = await fetch(
          `/api/hq/summary?period=daily&locale=${encodeURIComponent(locale)}&uiLocale=${encodeURIComponent(locale)}`,
          { credentials: "include" }
        );
        if (dRes.status === 403) {
          if (!cancelled) {
            setForbidden(true);
            setBranches([]);
            setOrgNames([]);
            setWarning(null);
            setChartRows([]);
            setBranchChartKeys([]);
            dailyChartCache.current = null;
          }
          return;
        }
        if (!dRes.ok) {
          return;
        }
        const dJson = await dRes.json();
        if (!cancelled) {
          const rows = dJson.chartRows ?? [];
          const keys = dJson.branchChartKeys ?? [];
          dailyChartCache.current = { chartRows: rows, branchChartKeys: keys };
          setBranches(dJson.branches ?? []);
          setOrgNames(dJson.organizations ?? []);
          setWarning(dJson.warning ?? null);
          setReceiptMix(
            dJson.receiptMix ?? {
              delivery_reservation: 0,
              pickup_reservation: 0,
              store_pickup: 0,
              other: 0,
            }
          );
          setOps(dJson.ops ?? { canceledCount: 0, activeOrderCount: 0, cancelRate: 0 });
          setChartRows(rows);
          setBranchChartKeys(keys);
          setChartPeriod("daily");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const applyChartPeriod = useCallback(async (p: HqChartPeriod) => {
    if (forbidden || loading) return;
    if (p === "daily") {
      const c = dailyChartCache.current;
      if (c) {
        setChartPeriod("daily");
        setChartRows(c.chartRows);
        setBranchChartKeys(c.branchChartKeys);
      }
      return;
    }
    setChartSwitchLoading(true);
    try {
      const res = await fetch(
        `/api/hq/summary?period=${p}&locale=${encodeURIComponent(locale)}&uiLocale=${encodeURIComponent(locale)}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const json = await res.json();
      setChartRows(json.chartRows ?? []);
      setBranchChartKeys(json.branchChartKeys ?? []);
      setChartPeriod(p);
    } finally {
      setChartSwitchLoading(false);
    }
  }, [forbidden, loading, locale]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const mixTotal =
    receiptMix.delivery_reservation +
    receiptMix.pickup_reservation +
    receiptMix.store_pickup +
    receiptMix.other;

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={tf.f01278}
        description={tf.f01437}
      />

      {forbidden ? (
        <Card className="max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>{tf.f01814}</CardTitle>
            <CardDescription>
              {tf.f01850}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              {tf.f01080}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="text-sm text-muted-foreground shrink-0">
              {tf.f01333} <strong className="text-foreground font-semibold">{tf.f02006}</strong> {tf.f01016}
            </span>
            {orgNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {orgNames.map((o) => (
                  <Badge key={o.id} variant="secondary" className="font-medium">
                    <Building2 className="h-3 w-3 mr-1" />
                    {o.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {warning && (
            <Card className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/30">
              <CardHeader className="py-3">
                <CardTitle className="text-sm text-amber-900 dark:text-amber-100">{tf.f01522}</CardTitle>
                <CardDescription className="text-amber-800 dark:text-amber-200">{warning}</CardDescription>
              </CardHeader>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{tf.f01911}</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{branches.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{tf.f02171}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {branches.reduce((s, b) => s + b.revenue, 0).toLocaleString()}{tf.f00487}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{tf.f02033}</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ops.canceledCount}{tf.f00033}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {tf.f01796} {(ops.cancelRate * 100).toFixed(1)}% {tf.f00794}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{tf.f01661}</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ops.activeOrderCount}{tf.f00033}</div>
                <p className="text-xs text-muted-foreground mt-1">{tf.f02037}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  {tf.f00245}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{receiptMix.delivery_reservation}{tf.f00033}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {mixTotal > 0
                    ? `${((receiptMix.delivery_reservation / mixTotal) * 100).toFixed(0)}%`
                    : "—"}{" "}
                  · {tf.f02037}
                </p>
              </CardContent>
            </Card>
            <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  {tf.f02154}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-900">{receiptMix.pickup_reservation}{tf.f00033}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {mixTotal > 0
                    ? `${((receiptMix.pickup_reservation / mixTotal) * 100).toFixed(0)}%`
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-100 bg-gradient-to-br from-white to-amber-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Store className="h-4 w-4 text-amber-700" />
                  {tf.f00191}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900">{receiptMix.store_pickup}{tf.f00033}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {mixTotal > 0
                    ? `${((receiptMix.store_pickup / mixTotal) * 100).toFixed(0)}%`
                    : "—"}
                  {receiptMix.other > 0 ? ` · ${tf.f00115} ${receiptMix.other}${tf.f00033}` : ""}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-50 pb-4">
              <div>
                <CardTitle className="text-lg font-light flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  {tf.f01175}
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  {tf.f01508}
                </CardDescription>
              </div>
              <div className="flex flex-wrap bg-slate-50 p-1 rounded-xl gap-1 w-full sm:w-auto">
                {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={chartSwitchLoading}
                    className={cn(
                      "rounded-lg font-bold transition-all flex-1 sm:flex-none min-h-10",
                      touchUi ? "text-xs px-3" : "text-[10px] h-7 px-3",
                      chartPeriod === p ? "bg-white shadow-sm text-indigo-600" : "text-slate-400"
                    )}
                    onClick={() => applyChartPeriod(p)}
                  >
                    {p === "daily" ? tf.f01713 : p === "weekly" ? tf.f01865 : p === "monthly" ? tf.f01648 : tf.f01049}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-6 min-h-[350px]">
              {loading || chartSwitchLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
                </div>
              ) : (
                <HqRevenueStackedChart
                  chartRows={chartRows}
                  branchKeys={branchChartKeys}
                  xLabel={
                    chartPeriod === "daily"
                      ? tf.f01717
                      : chartPeriod === "weekly"
                        ? tf.f01863
                        : chartPeriod === "monthly"
                          ? tf.f01645
                          : tf.f01566
                  }
                  chartHeight={350}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {tf.f01918}
              </CardTitle>
              <CardDescription>
                {tf.f01336}{" "}
                <strong className="text-foreground font-medium">{tf.f01917}</strong>{tf.f01663}
              </CardDescription>
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
                      <TableHead>{tf.f02143}</TableHead>
                      <TableHead className="text-right">{tf.f01869}</TableHead>
                      <TableHead className="text-right">{tf.f01173}</TableHead>
                      <TableHead className="text-right">{tf.f00867}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/hq/branches/${b.id}`}
                            className="text-primary hover:underline underline-offset-4"
                          >
                            {b.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{b.plan ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{b.orderCount}</TableCell>
                        <TableCell className="text-right">{b.revenue.toLocaleString()}{tf.f00487}</TableCell>
                        <TableCell className="text-right">
                          {b.avgOrderValue.toLocaleString()}{tf.f00487}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
