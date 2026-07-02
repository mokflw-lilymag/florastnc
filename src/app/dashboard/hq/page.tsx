"use client";
import { getMessages } from "@/i18n/getMessages";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Building2,
  Loader2,
  TrendingUp,
  ShoppingCart,
  Truck,
  Store,
  Package,
  ArrowRight,
  TrendingDown,
  Percent,
  Coins,
  ShieldCheck,
  CalendarDays,
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

type TopMaterial = { name: string; amount: number; percent: number };
type TopProduct = { name: string; amount: number; percent: number };

type BranchRow = {
  id: string;
  name: string;
  organization_id: string | null;
  plan: string | null;
  orderCount: number;
  revenue: number;
  avgOrderValue: number;
  expense: number;
  profit: number;
  margin: number;
  receiptTypes?: {
    delivery: number;
    pickup: number;
    store: number;
    other: number;
  };
  topMaterials?: TopMaterial[];
  topProducts?: TopProduct[];
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

  // 통합 재무 통계 상태 관리
  const [grandRevenue, setGrandRevenue] = useState(0);
  const [grandExpense, setGrandExpense] = useState(0);
  const [grandProfit, setGrandProfit] = useState(0);
  const [grandMargin, setGrandMargin] = useState(0);

  // 전 지점 통합 베스트 자재 & 상품 통계 상태
  const [globalTopMaterials, setGlobalTopMaterials] = useState<{ name: string; amount: number; percent: number }[]>([]);
  const [globalTopProducts, setGlobalTopProducts] = useState<{ name: string; amount: number; percent: number }[]>([]);

  // 랭킹 관제탑 지점 스위처 ("all" = 전 지점 통합)
  const [selectedRankingBranchId, setSelectedRankingBranchId] = useState<string>("all");

  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  
  const L = (ko: string, en: string) => (baseLocale === "ko" ? ko : en);

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
            setGlobalTopMaterials([]);
            setGlobalTopProducts([]);
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
          setGrandRevenue(dJson.grandRevenue ?? 0);
          setGrandExpense(dJson.grandExpense ?? 0);
          setGrandProfit(dJson.grandProfit ?? 0);
          setGrandMargin(dJson.grandMargin ?? 0);
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
          setGlobalTopMaterials(dJson.globalTopMaterials ?? []);
          setGlobalTopProducts(dJson.globalTopProducts ?? []);
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

  const narrowPeriodLabel = useMemo(() => {
    if (chartPeriod === "daily") return L("오늘 하루 기준", "Today");
    if (chartPeriod === "weekly") return L("이번 주 누적 (월~오늘) 기준", "This Week (Mon-Today)");
    if (chartPeriod === "monthly") return L("이번 달 누적 (1일~오늘) 기준", "This Month (1st-Today)");
    return L("올해 누적 (1월 1일~오늘) 기준", "This Year (Jan 1st-Today)");
  }, [chartPeriod, baseLocale]);

  const chartPeriodLabel = useMemo(() => {
    if (chartPeriod === "daily") return L("최근 14일 추이", "Last 14 Days Trend");
    if (chartPeriod === "weekly") return L("최근 8주 추이", "Last 8 Weeks Trend");
    if (chartPeriod === "monthly") return L("최근 6개월 추이", "Last 6 Months Trend");
    return L("최근 5년 추이", "Last 5 Years Trend");
  }, [chartPeriod, baseLocale]);

  const applyChartPeriod = useCallback(async (p: HqChartPeriod) => {
    if (forbidden || loading) return;
    setChartSwitchLoading(true);
    try {
      const res = await fetch(
        `/api/hq/summary?period=${p}&locale=${encodeURIComponent(locale)}&uiLocale=${encodeURIComponent(locale)}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const json = await res.json();
      
      // 차트 및 지점 목록 전체 동기화 리로드
      setChartRows(json.chartRows ?? []);
      setBranchChartKeys(json.branchChartKeys ?? []);
      setBranches(json.branches ?? []);
      setGrandRevenue(json.grandRevenue ?? 0);
      setGrandExpense(json.grandExpense ?? 0);
      setGrandProfit(json.grandProfit ?? 0);
      setGrandMargin(json.grandMargin ?? 0);
      setReceiptMix(
        json.receiptMix ?? {
          delivery_reservation: 0,
          pickup_reservation: 0,
          store_pickup: 0,
          other: 0,
        }
      );
      setOps(json.ops ?? { canceledCount: 0, activeOrderCount: 0, cancelRate: 0 });
      setGlobalTopMaterials(json.globalTopMaterials ?? []);
      setGlobalTopProducts(json.globalTopProducts ?? []);
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
    <div className="max-w-none p-6 space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={tf.f01278}
        description={L("조직 내 모든 지점의 매출과 지출 장부를 통합 분석하여 본사 차원의 손익마진을 실시간 통제합니다.", "Analyze revenues and expenses across all branches for corporate net profit control.")}
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
          {/* 소속 조직 표시 및 퀵가이드 링크 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="text-sm text-muted-foreground shrink-0">
                📊 {L("현재 대시보드 통계 및 지점 표는", "Current statistics and tables are based on")} <strong className="text-indigo-600 font-extrabold">{narrowPeriodLabel}</strong> {L("입니다.", ".")}
              </span>
              {orgNames.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {orgNames.map((o) => (
                    <Badge key={o.id} variant="secondary" className="font-semibold bg-indigo-50 text-indigo-600 rounded-xl px-2.5 py-0.5 border border-indigo-100">
                      <Building2 className="h-3 w-3 mr-1" />
                      {o.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Link href="/dashboard/hq/branch-expenses">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-1 border-none shadow-sm">
                <span>지출/사입비 관제탑 바로가기</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {warning && (
            <Card className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/30">
              <CardHeader className="py-3">
                <CardTitle className="text-sm text-amber-900 dark:text-amber-100">{tf.f01522}</CardTitle>
                <CardDescription className="text-amber-800 dark:text-amber-200">{warning}</CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* 💰 4대 럭셔리 당기 손익(Net Profit) 요약 현황판 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-indigo-50/30 to-indigo-100/20 border border-indigo-100/40 p-1">
              <CardHeader className="flex flex-row items-center justify-between pb-1">
                <CardTitle className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{L("조회 기간 전 지점 매출액", "Selected Period Branch Revenue")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-indigo-600 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-slate-900 leading-none">
                  ₩{grandRevenue.toLocaleString()}
                </div>
                <p className="text-[10px] text-indigo-500/70 font-semibold mt-2">{L("지점별 발생 실시간 매출 합계", "Aggregated branch sales")}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-rose-50/30 to-rose-100/20 border border-rose-100/40 p-1">
              <CardHeader className="flex flex-row items-center justify-between pb-1">
                <CardTitle className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{L("조회 기간 전 지점 지출액", "Selected Period Branch Expense")}</CardTitle>
                <TrendingDown className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-slate-900 leading-none">
                  ₩{grandExpense.toLocaleString()}
                </div>
                <p className="text-[10px] text-rose-500/70 font-semibold mt-2">{L("지점별 사입비 및 경비 총액", "Aggregated expenses & flower costs")}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-emerald-50/30 to-emerald-100/20 border border-emerald-100/40 p-1">
              <CardHeader className="flex flex-row items-center justify-between pb-1">
                <CardTitle className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{L("조회 기간 지점 통합 순수익", "Selected Period Net Profit")}</CardTitle>
                <Coins className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-slate-900 leading-none">
                  ₩{grandProfit.toLocaleString()}
                </div>
                <p className="text-[10px] text-emerald-500/70 font-semibold mt-2">{L("지점 매출에서 지출을 제외한 실순익", "Net profit margin estimate")}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-teal-50/30 to-teal-100/20 border border-teal-100/40 p-1">
              <CardHeader className="flex flex-row items-center justify-between pb-1">
                <CardTitle className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">{L("지점 통합 평균 마진율", "Branch Average Margin Rate")}</CardTitle>
                <Percent className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-slate-900 leading-none">
                  {grandMargin}%
                </div>
                <p className="text-[10px] text-teal-500/70 font-semibold mt-2">{L("전체 지점 평균 순수익 비율", "Branch average profit ratio")}</p>
              </CardContent>
            </Card>
          </div>

          {/* 수령 타입 비율 */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
              <span>📊 {L(`전 지점 수령 방식 누적 통계 (${narrowPeriodLabel})`, `Global Branch Receipt Stats (${narrowPeriodLabel})`)}</span>
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
          </div>

          {/* 매출 차트 */}
          <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-50 pb-4">
              <div>
                <CardTitle className="text-lg font-light flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  {tf.f01175}
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-indigo-600/90">
                  {L(`조직 내 전체 지점의 매출 흐름 분석 (${chartPeriodLabel})`, `Revenues trend across organization (${chartPeriodLabel})`)}
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



          {/* 🚦 지점별 수익성 신호등 대조 테이블 */}
          <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden border border-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Store className="h-5 w-5 text-indigo-600" />
                {L("지점별 수익성 신호등 대조 분석", "Branch Profitability Traffic Light Analysis")}
              </CardTitle>
              <CardDescription className="text-xs">
                {L("각 지점의 발생 매출액과 지출 총액을 대조하여 순수익을 집계하고 이익률에 따라 신호등 밸런스를 측정합니다.", "Cross check sales and costs per branch to audit profit margins.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-50 rounded-2xl">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-b border-slate-100 hover:bg-transparent">
                        <TableHead className="font-bold text-xs text-slate-500">{tf.f00663}</TableHead>
                        <TableHead className="font-bold text-xs text-slate-500 text-center">{L("주문 건수", "Orders")}</TableHead>
                        <TableHead className="font-bold text-xs text-slate-500 text-center w-[170px]">{L(`배송/픽업/매장 비율 (${narrowPeriodLabel})`, `Receipt Ratio (${narrowPeriodLabel})`)}</TableHead>
                        <TableHead className="font-bold text-xs text-slate-500 text-right">{L("발생 매출액", "Revenues")}</TableHead>
                        <TableHead className="font-bold text-xs text-slate-500 text-right">{L("지출 총액", "Expenses")}</TableHead>
                        <TableHead className="font-bold text-xs text-slate-500 text-right">{L("당기 순수익", "Net Profit")}</TableHead>
                        <TableHead className="font-bold text-xs text-slate-500 text-center w-[100px]">{L("수익성 신호등", "Profit Status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((b) => {
                        // 이익 마진율 기준 신호등 판독
                        const margin = b.margin;
                        let badgeClass = "bg-rose-50 text-rose-700 border-rose-100";
                        let badgeLabel = L("🔴 경고 (25% 미만)", "🔴 Warning (<25%)");
                        
                        if (b.revenue === 0 && b.expense === 0) {
                          badgeClass = "bg-slate-50 text-slate-400 border-slate-200";
                          badgeLabel = L("⚪ 데이터 없음", "⚪ No Data");
                        } else if (margin >= 50) {
                          badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100 font-extrabold animate-pulse";
                          badgeLabel = L("🟢 우수 (50% 이상)", "🟢 Excellent (>=50%)");
                        } else if (margin >= 25) {
                          badgeClass = "bg-amber-50 text-amber-700 border-amber-100 font-bold";
                          badgeLabel = L("🟡 보통 (25%~50%)", "🟡 Moderate (25%-50%)");
                        }

                        // 수령 방식 분포 계산
                        const rt = b.receiptTypes ?? { delivery: 0, pickup: 0, store: 0, other: 0 };
                        const totalRt = rt.delivery + rt.pickup + rt.store + rt.other;
                        const delPct = totalRt > 0 ? (rt.delivery / totalRt) * 100 : 0;
                        const pikPct = totalRt > 0 ? (rt.pickup / totalRt) * 100 : 0;
                        const stoPct = totalRt > 0 ? (rt.store / totalRt) * 100 : 0;
                        const othPct = totalRt > 0 ? (rt.other / totalRt) * 100 : 0;

                        const isHq = b.plan === "hq" || b.name.includes("본사") || b.name.includes("본점") || b.name.includes("HQ");

                        return (
                          <TableRow key={b.id} className="border-b border-slate-50 hover:bg-slate-50/20 text-xs">
                            <TableCell className="font-bold text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <Link
                                  href={`/dashboard/hq/branches/${b.id}`}
                                  className="text-indigo-600 hover:underline underline-offset-4 flex items-center gap-1.5"
                                >
                                  <span>🏢 {b.name}</span>
                                </Link>
                                {isHq && (
                                  <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white border-none text-[8px] h-4.5 px-1.5 py-0 rounded-md font-black shadow-sm leading-none shrink-0 scale-90">
                                    {L("본사", "HQ")}
                                  </Badge>
                                )}
                              </div>
                              {b.plan && !isHq && (
                                <span className="block text-[9px] text-slate-400 mt-0.5">{b.plan}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center tabular-nums font-medium text-slate-600">{b.orderCount}건</TableCell>
                            
                            {/* 인라인 누적 막대 그래프 및 보조 수치 라벨 */}
                            <TableCell className="text-center">
                              <div className="flex flex-col gap-1 w-[160px] mx-auto">
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                  {totalRt > 0 ? (
                                    <>
                                      {rt.delivery > 0 && (
                                        <div 
                                          style={{ width: `${delPct}%` }} 
                                          className="bg-blue-500 h-full" 
                                          title={`배송: ${rt.delivery}건 (${delPct.toFixed(0)}%)`}
                                        />
                                      )}
                                      {rt.pickup > 0 && (
                                        <div 
                                          style={{ width: `${pikPct}%` }} 
                                          className="bg-emerald-500 h-full" 
                                          title={`픽업: ${rt.pickup}건 (${pikPct.toFixed(0)}%)`}
                                        />
                                      )}
                                      {rt.store > 0 && (
                                        <div 
                                          style={{ width: `${stoPct}%` }} 
                                          className="bg-amber-500 h-full" 
                                          title={`매장: ${rt.store}건 (${stoPct.toFixed(0)}%)`}
                                        />
                                      )}
                                      {rt.other > 0 && (
                                        <div 
                                          style={{ width: `${othPct}%` }} 
                                          className="bg-slate-400 h-full" 
                                          title={`기타: ${rt.other}건 (${othPct.toFixed(0)}%)`}
                                        />
                                      )}
                                    </>
                                  ) : (
                                    <div className="w-full h-full bg-slate-100/60" />
                                  )}
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-bold leading-none mt-0.5 px-0.5 gap-1.5">
                                  <span className="text-blue-500/70 whitespace-nowrap">🚚 배송 {rt.delivery}</span>
                                  <span className="text-emerald-500/70 whitespace-nowrap">📦 픽업 {rt.pickup}</span>
                                  <span className="text-amber-600/70 whitespace-nowrap">🏪 매장 {rt.store}</span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-right tabular-nums font-bold text-slate-800">₩{b.revenue.toLocaleString()}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium text-slate-400">₩{b.expense.toLocaleString()}</TableCell>
                            <TableCell className="text-right tabular-nums font-extrabold text-indigo-700">₩{b.profit.toLocaleString()}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={cn("rounded-xl text-[10px] px-2 py-0.5 whitespace-nowrap", badgeClass)}>
                                {badgeLabel}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 🏆 전 지점 통합 및 지점별 베스트 자재 & 상품 소비/판매 TOP 10 */}
          <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden border border-slate-100 p-1">
            <CardHeader className="border-b border-slate-50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-extrabold text-slate-800">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                {L("베스트 자재 & 상품 TOP 10", "Best Materials & Products TOP 10")}
              </CardTitle>
              <CardDescription className="text-xs">
                {L("원자재/꽃 사입비 지출 10위와 가장 매출 기여도가 높은 꽃/식물 상품 10위를 금액 기준으로 비교합니다.", "Compare best materials purchased and items sold based on total aggregate currency amount.")}
              </CardDescription>

              {/* 지점 선택 탭 세그먼트 */}
              <div className="flex flex-wrap gap-1.5 mt-4 bg-slate-50 p-1 rounded-2xl w-fit">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-xl font-bold transition-all px-3.5 py-1.5 text-xs min-h-8 border-none",
                    selectedRankingBranchId === "all"
                      ? "bg-white shadow-sm text-indigo-600 font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                  onClick={() => setSelectedRankingBranchId("all")}
                >
                  🏢 {L("전 지점 통합", "All Branches")}
                </Button>
                {branches.map((b) => (
                  <Button
                    key={b.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-xl font-bold transition-all px-3.5 py-1.5 text-xs min-h-8 border-none",
                      selectedRankingBranchId === b.id
                        ? "bg-white shadow-sm text-indigo-600 font-extrabold"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                    onClick={() => setSelectedRankingBranchId(b.id)}
                  >
                    🏢 {b.name}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {(() => {
                let materials: TopMaterial[] = [];
                let products: TopProduct[] = [];

                if (selectedRankingBranchId === "all") {
                  materials = globalTopMaterials;
                  products = globalTopProducts;
                } else {
                  const target = branches.find((b) => b.id === selectedRankingBranchId);
                  materials = target?.topMaterials ?? [];
                  products = target?.topProducts ?? [];
                }

                const hasNoExpense = materials.length === 0;
                const hasNoOrders = products.length === 0;

                return (
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* 좌열: 베스트 사입 자재 10위 */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          🌱 {L("사입 자재 지출 TOP 10 (합산금액 기준)", "Top 10 Materials Purchased (Amount)")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">({narrowPeriodLabel})</span>
                      </div>
                      
                      {hasNoExpense ? (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center py-8">
                          <span className="text-[11px] text-slate-400 block">
                            {L("해당 기간 동안 등록된 원자재 사입비 지출 내역이 없습니다.", "No materials expense entries in this period.")}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          {materials.map((m, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-[11px] font-semibold">
                                <span className="text-slate-700">{idx + 1}. {m.name}</span>
                                <span className="text-indigo-600 font-bold tabular-nums">₩{m.amount.toLocaleString()} ({m.percent}%)</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div style={{ width: `${m.percent}%` }} className="bg-indigo-500 h-full rounded-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 우열: 베스트 판매 상품 10위 */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          🌸 {L("판매 상품 매출 TOP 10 (합산금액 기준)", "Top 10 Products Sold (Revenue)")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">({narrowPeriodLabel})</span>
                      </div>

                      {hasNoOrders ? (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center py-8">
                          <span className="text-[11px] text-slate-400 block">
                            {L("해당 기간 동안 판매 완료된 주문 상품 매출 내역이 없습니다.", "No product sales data in this period.")}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          {products.map((p, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-[11px] font-semibold">
                                <span className="text-slate-700">{idx + 1}. {p.name}</span>
                                <span className="text-emerald-600 font-bold tabular-nums">₩{p.amount.toLocaleString()} ({p.percent}%)</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div style={{ width: `${p.percent}%` }} className="bg-emerald-500 h-full rounded-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* 🌸 꽃집 대표 3대 대목 시즌 통합 수익 분석 카드 */}
          <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-indigo-50/20 to-slate-50/40 border border-indigo-100/30">
            <CardHeader className="pb-3 border-b border-indigo-100/10">
              <CardTitle className="text-sm flex items-center gap-2 font-bold text-slate-800">
                <CalendarDays className="h-4.5 w-4.5 text-indigo-600" />
                {L("🌸 꽃집 대표 3대 대목 시즌 통합 수익 진단 판", "Major Seasonal Peak Financial Diagnostic")}
              </CardTitle>
              <CardDescription className="text-xs">
                {L("꽃 도매 사입비와 포장 부자재비 지출이 1년 중 가장 집중되는 3대 대목의 통합 재무 마진을 진단합니다.", "Audit corporate margins during Peak Seasons where raw flower costs spike.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div 
                onClick={() => router.push("/dashboard/hq/branch-expenses?season=parents")}
                className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm cursor-pointer flex flex-col justify-between transition-all duration-300 group"
              >
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block flex items-center justify-between">
                    <span>🌸 {L("어버이날 대목 (5/1 ~ 5/8)", "Parents' Day Peak")}</span>
                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">{L("자재 사입비 비중이 가장 높은 꽃집 최대의 대목 기간", "Highest seasonal inventory pre-order density.")}</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-xs">
                  <span className="text-[10px] text-indigo-600 font-bold group-hover:underline">{L("시즌 지출 분석 ➡️", "Analyze Season Costs")}</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] rounded-lg">55% ~ 65%</Badge>
                </div>
              </div>

              <div 
                onClick={() => router.push("/dashboard/hq/branch-expenses?season=graduation")}
                className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm cursor-pointer flex flex-col justify-between transition-all duration-300 group"
              >
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block flex items-center justify-between">
                    <span>🎓 {L("졸업식 대목 (2/1 ~ 2/28)", "Graduation Peak")}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">{L("졸업/입학 특수로 인한 꽃다발 및 부자재 소모 폭증 시기", "Spike in wrap paper and bouquet inventory.")}</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-xs">
                  <span className="text-[10px] text-indigo-600 font-bold group-hover:underline">{L("시즌 지출 분석 ➡️", "Analyze Season Costs")}</span>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] rounded-lg">50% ~ 60%</Badge>
                </div>
              </div>

              <div 
                onClick={() => router.push("/dashboard/hq/branch-expenses?season=christmas")}
                className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm cursor-pointer flex flex-col justify-between transition-all duration-300 group"
              >
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block flex items-center justify-between">
                    <span>🎄 {L("크리스마스 대목 (12/20 ~ 12/31)", "Christmas Peak")}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">{L("연말 트리/장식 및 단체 선물용 대량 지출·매출 복합 시기", "Year-end decoration bulk inventory prep.")}</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-xs">
                  <span className="text-[10px] text-indigo-600 font-bold group-hover:underline">{L("시즌 지출 분석 ➡️", "Analyze Season Costs")}</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] rounded-lg">50% ~ 55%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
