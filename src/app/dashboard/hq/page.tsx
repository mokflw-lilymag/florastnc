"use client";

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
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);
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
        const dRes = await fetch(`/api/hq/summary?period=daily`, { credentials: "include" });
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
  }, []);

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
      const res = await fetch(`/api/hq/summary?period=${p}`, { credentials: "include" });
      if (!res.ok) return;
      const json = await res.json();
      setChartRows(json.chartRows ?? []);
      setBranchChartKeys(json.branchChartKeys ?? []);
      setChartPeriod(p);
    } finally {
      setChartSwitchLoading(false);
    }
  }, [forbidden, loading]);

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
        title={tr("본사·다매장 개요", "HQ & Multi-Store Overview")}
        description={tr("소속 지점 실적·수령 방식·매출 추이를 한눈에 봅니다. 공지·공동 상품은 사이드바 메뉴에서 관리합니다.", "View branch performance, receipt mix, and sales trends at a glance. Manage announcements/shared products from sidebar.")}
      />

      {forbidden ? (
        <Card className="max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>{tr("접근할 수 없습니다", "Access denied")}</CardTitle>
            <CardDescription>
              {tr("조직에 배정된 계정만 본사·다매장 개요를 이용할 수 있습니다. 플랫폼 관리자에게 멤버 배정을 요청하세요.", "Only organization-assigned accounts can view HQ overview. Ask platform admin for membership assignment.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              {tr("대시보드로", "Go to dashboard")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="text-sm text-muted-foreground shrink-0">
              {tr("상단 수치·지점 표는", "Top stats and branch table use")} <strong className="text-foreground font-semibold">{tr("최근 14일(일별)", "last 14 days (daily)")}</strong> {tr("기준입니다. 아래 차트만 기간을 바꿔 볼 수 있습니다.", "as baseline. Only chart period below can be changed.")}
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
                <CardTitle className="text-sm text-amber-900 dark:text-amber-100">{tr("안내", "Notice")}</CardTitle>
                <CardDescription className="text-amber-800 dark:text-amber-200">{warning}</CardDescription>
              </CardHeader>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{tr("지점 수", "Branch Count")}</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{branches.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{tr("합산 매출", "Total Sales")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {branches.reduce((s, b) => s + b.revenue, 0).toLocaleString()}{tr("원", "")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{tr("취소 건 / 비율", "Canceled / Ratio")}</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ops.canceledCount}{tr("건", "")}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {tr("전체 대비", "Share")} {(ops.cancelRate * 100).toFixed(1)}% {tr("(취소 포함 건수 기준)", "(based on all orders incl. canceled)")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{tr("유효 주문", "Valid Orders")}</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ops.activeOrderCount}{tr("건", "")}</div>
                <p className="text-xs text-muted-foreground mt-1">{tr("취소 제외", "Canceled excluded")}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  {tr("배송 예약", "Delivery Reservation")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{receiptMix.delivery_reservation}{tr("건", "")}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {mixTotal > 0
                    ? `${((receiptMix.delivery_reservation / mixTotal) * 100).toFixed(0)}%`
                    : "—"}{" "}
                  · {tr("취소 제외", "canceled excluded")}
                </p>
              </CardContent>
            </Card>
            <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  {tr("픽업·예약", "Pickup Reservation")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-900">{receiptMix.pickup_reservation}{tr("건", "")}</div>
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
                  {tr("매장 수령", "Store Pickup")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900">{receiptMix.store_pickup}{tr("건", "")}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {mixTotal > 0
                    ? `${((receiptMix.store_pickup / mixTotal) * 100).toFixed(0)}%`
                    : "—"}
                  {receiptMix.other > 0 ? ` · ${tr("기타", "Other")} ${receiptMix.other}${tr("건", "")}` : ""}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-50 pb-4">
              <div>
                <CardTitle className="text-lg font-light flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  {tr("매출 지표 추이", "Sales Trend")}
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  {tr("실시간 매출 데이터 흐름을 분석합니다 · 지점별 스택 · 취소 제외", "Analyze live sales flow · stacked by branch · canceled excluded")}
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
                    {p === "daily" ? tr("일별", "Daily") : p === "weekly" ? tr("주간별", "Weekly") : p === "monthly" ? tr("월별", "Monthly") : tr("년별", "Yearly")}
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
                      ? tr("일자", "Date")
                      : chartPeriod === "weekly"
                        ? tr("주간", "Week")
                        : chartPeriod === "monthly"
                          ? tr("월", "Month")
                          : tr("연도", "Year")
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
                {tr("지점별 비교", "Branch Comparison")}
              </CardTitle>
              <CardDescription>
                {tr("상단 KPI·일별 차트와 같은 기간(최근 14일) 집계입니다. 취소는 제외하고, 객단가는 유효 주문 기준입니다.", "Uses same period as top KPI/daily chart (last 14 days). Canceled excluded, AOV based on valid orders.")}{" "}
                <strong className="text-foreground font-medium">{tr("지점명", "Branch Name")}</strong>{tr("을 누르면 해당 지점 요약·최근 주문(읽기 전용)으로 이동합니다.", " links to branch summary and recent orders (read-only).")}
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
                      <TableHead>{tr("지점", "Branch")}</TableHead>
                      <TableHead>{tr("플랜", "Plan")}</TableHead>
                      <TableHead className="text-right">{tr("주문 수", "Orders")}</TableHead>
                      <TableHead className="text-right">{tr("매출", "Sales")}</TableHead>
                      <TableHead className="text-right">{tr("객단가", "AOV")}</TableHead>
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
                        <TableCell className="text-right">{b.revenue.toLocaleString()}{tr("원", "")}</TableCell>
                        <TableCell className="text-right">
                          {b.avgOrderValue.toLocaleString()}{tr("원", "")}
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
