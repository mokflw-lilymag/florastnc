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
        title="본사·다매장 개요"
        description="소속 지점 실적·수령 방식·매출 추이를 한눈에 봅니다. 공지·공동 상품은 사이드바 메뉴에서 관리합니다."
      />

      {forbidden ? (
        <Card className="max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>접근할 수 없습니다</CardTitle>
            <CardDescription>
              조직에 배정된 계정만 본사·다매장 개요를 이용할 수 있습니다. 플랫폼 관리자에게 멤버
              배정을 요청하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              대시보드로
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="text-sm text-muted-foreground shrink-0">
              상단 수치·지점 표는 <strong className="text-foreground font-semibold">최근 14일(일별)</strong> 기준입니다. 아래 차트만 기간을 바꿔 볼 수 있습니다.
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
                <CardTitle className="text-sm text-amber-900 dark:text-amber-100">안내</CardTitle>
                <CardDescription className="text-amber-800 dark:text-amber-200">{warning}</CardDescription>
              </CardHeader>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">지점 수</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{branches.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">합산 매출</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {branches.reduce((s, b) => s + b.revenue, 0).toLocaleString()}원
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">취소 건 / 비율</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ops.canceledCount}건</div>
                <p className="text-xs text-muted-foreground mt-1">
                  전체 대비 {(ops.cancelRate * 100).toFixed(1)}% (취소 포함 건수 기준)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">유효 주문</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ops.activeOrderCount}건</div>
                <p className="text-xs text-muted-foreground mt-1">취소 제외</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  배송 예약
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{receiptMix.delivery_reservation}건</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {mixTotal > 0
                    ? `${((receiptMix.delivery_reservation / mixTotal) * 100).toFixed(0)}%`
                    : "—"}{" "}
                  · 취소 제외
                </p>
              </CardContent>
            </Card>
            <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  픽업·예약
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-900">{receiptMix.pickup_reservation}건</div>
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
                  매장 수령
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900">{receiptMix.store_pickup}건</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {mixTotal > 0
                    ? `${((receiptMix.store_pickup / mixTotal) * 100).toFixed(0)}%`
                    : "—"}
                  {receiptMix.other > 0 ? ` · 기타 ${receiptMix.other}건` : ""}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-50 pb-4">
              <div>
                <CardTitle className="text-lg font-light flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  매출 지표 추이
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  실시간 매출 데이터 흐름을 분석합니다 · 지점별 스택 · 취소 제외
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
                    {p === "daily" ? "일별" : p === "weekly" ? "주간별" : p === "monthly" ? "월별" : "년별"}
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
                      ? "일자"
                      : chartPeriod === "weekly"
                        ? "주간"
                        : chartPeriod === "monthly"
                          ? "월"
                          : "연도"
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
                지점별 비교
              </CardTitle>
              <CardDescription>
                상단 KPI·일별 차트와 같은 기간(최근 14일) 집계입니다. 취소는 제외하고, 객단가는 유효 주문 기준입니다.{" "}
                <strong className="text-foreground font-medium">지점명</strong>을 누르면 해당 지점 요약·최근 주문(읽기 전용)으로
                이동합니다.
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
                      <TableHead>지점</TableHead>
                      <TableHead>플랜</TableHead>
                      <TableHead className="text-right">주문 수</TableHead>
                      <TableHead className="text-right">매출</TableHead>
                      <TableHead className="text-right">객단가</TableHead>
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
                        <TableCell className="text-right">{b.revenue.toLocaleString()}원</TableCell>
                        <TableCell className="text-right">
                          {b.avgOrderValue.toLocaleString()}원
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
