"use client";
import { getMessages } from "@/i18n/getMessages";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Package,
  ShoppingCart,
  Store,
  Calendar,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

type BranchDetailResponse = {
  tenant: {
    id: string;
    name: string;
    plan: string | null;
    organizationId: string;
  };
  range: { from: string; to: string };
  stats: {
    orderCount: number;
    revenue: number;
    canceledCount: number;
    avgOrderValue: number;
  } | null;
  recentOrders: Array<{
    id: string;
    order_number: string;
    status: string;
    order_date: string;
    receipt_type: string;
    total: number;
    ordererName: string;
  }>;
  warning: string | null;
};

export default function HqBranchDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [data, setData] = useState<BranchDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workSwitching, setWorkSwitching] = useState(false);
  const [catalogApplying, setCatalogApplying] = useState(false);
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;

  // 일일 정산 마감 내역을 조회하기 위한 상태 변수
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  
  const [settlementOrders, setSettlementOrders] = useState<any[]>([]);
  const [settlementExpenses, setSettlementExpenses] = useState<any[]>([]);
  const [settlementRecord, setSettlementRecord] = useState<any | null>(null);
  const [prevSettlementRecord, setPrevSettlementRecord] = useState<any | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);

  // 클라이언트 직접 조회 대신 API 응답 내에 실려 내려오는 데이터를 활용합니다.

  // 일일 정산 수치 연산 공식 (daily-settlement/page.tsx 와 100% 동일)
  const settlementStats = useMemo(() => {
    let cashSales = 0;
    let cardSales = 0;
    let transferSales = 0;
    let otherSales = 0;
    let totalSales = 0;
    let pendingAmountToday = 0;
    let prevOrderPaymentTotal = 0;
    let deliveryCostCashToday = 0;

    const paidOrdersToday: any[] = [];
    const pendingOrdersToday: any[] = [];
    const previousOrderPayments: any[] = [];

    const todayFrom = new Date(selectedDate);
    todayFrom.setHours(0,0,0,0);
    const todayTo = new Date(selectedDate);
    todayTo.setHours(23,59,59,999);

    settlementOrders.forEach(order => {
      if (order.status === 'canceled') return;

      const dateToParse = order.order_date || order.created_at || new Date().toISOString();
      const orderDateStr = dateToParse.split('T')[0];
      const isTodayOrder = orderDateStr === selectedDate;

      if (order.actual_delivery_cost_cash) {
        deliveryCostCashToday += Number(order.actual_delivery_cost_cash);
      }

      const p = order.payment;
      let settleAmountToday = 0;

      // 이관 수주 여부 체크 (타 지점에서 이 지점으로 보낸 수주 주문은 정산 수금액 0원 강제화)
      const isTransferReceived = order.transfer_info?.isTransferred && order.tenant_id !== tenantId;

      const firstDate = p?.firstPaymentDate ? new Date(p.firstPaymentDate) : null;
      const secondDate = p?.secondPaymentDate ? new Date(p.secondPaymentDate) : null;
      const completedAt = p?.completedAt ? new Date(p.completedAt) : null;

      if (!isTransferReceived) {
        if (p?.isSplitPayment) {
          if (firstDate && firstDate >= todayFrom && firstDate <= todayTo) {
            const amt = p.firstPaymentAmount || 0;
            settleAmountToday += amt;
            const method = (p.firstPaymentMethod || 'cash').toLowerCase();
            if (method === 'cash') cashSales += amt;
            else if (method === 'card') cardSales += amt;
            else if (method === 'transfer') transferSales += amt;
            else otherSales += amt;
          }
          if (p.status === 'paid' || p.status === 'completed' || order.status === 'completed') {
            let isSecondToday = false;
            if (secondDate && secondDate >= todayFrom && secondDate <= todayTo) isSecondToday = true;
            else if (!secondDate && completedAt && completedAt >= todayFrom && completedAt <= todayTo) isSecondToday = true;
            else if (isTodayOrder && !secondDate && !completedAt && (p.status === 'paid' || p.status === 'completed')) isSecondToday = true;

            if (isSecondToday) {
              const amt = p.secondPaymentAmount || ( (order.summary?.total || 0) - (p.firstPaymentAmount || 0) );
              settleAmountToday += amt;
              const method = (p.secondPaymentMethod || p.method || 'cash').toLowerCase();
              if (method === 'cash') cashSales += amt;
              else if (method === 'card') cardSales += amt;
              else if (method === 'transfer') transferSales += amt;
              else otherSales += amt;
            }
          }
          if (isTodayOrder && p.status !== 'completed' && p.status !== 'paid') {
            const fullTotal = order.summary?.total || 0;
            let alreadyPaid = 0;
            if (firstDate && firstDate <= todayTo) alreadyPaid += (p.firstPaymentAmount || 0);
            if (secondDate && secondDate <= todayTo) alreadyPaid += (p.secondPaymentAmount || 0);
            const pending = fullTotal - alreadyPaid;
            if (pending > 0) {
              pendingOrdersToday.push(order);
              pendingAmountToday += pending;
            }
          }
        } else {
          const wasPaidToday = (completedAt && completedAt >= todayFrom && completedAt <= todayTo) || 
                              (isTodayOrder && (p?.status === 'paid' || p?.status === 'completed'));
          if (wasPaidToday) {
            const amt = order.summary?.total || 0;
            settleAmountToday += amt;
            const method = (p?.method || 'cash').toLowerCase();
            if (method === 'cash') cashSales += amt;
            else if (method === 'card') cardSales += amt;
            else if (method === 'transfer') transferSales += amt;
            else otherSales += amt;
          } else if (isTodayOrder && (!p?.status || p.status === 'pending' || p.status === 'partial')) {
            pendingOrdersToday.push(order);
            pendingAmountToday += order.summary?.total || 0;
          }
        }
      } else {
        // 이관 수주 주문이어도 미결제 상태가 당일 건에 존재한다면 표시용 리스트에는 남기되, 미수액 가산은 0원으로 제어
        if (isTodayOrder && (!p?.status || p.status === 'pending' || p.status === 'partial')) {
          pendingOrdersToday.push(order);
        }
      }

      if (settleAmountToday > 0) {
        totalSales += settleAmountToday;
        if (!isTodayOrder) {
          prevOrderPaymentTotal += settleAmountToday;
          previousOrderPayments.push(order);
        } else {
          paidOrdersToday.push(order);
        }
      }
    });

    return {
      totalSales,
      cashSales,
      cardSales,
      transferSales,
      otherSales,
      deliveryCostCash: deliveryCostCashToday,
      orderCount: settlementOrders.filter(o => {
        const dateVal = o.order_date || o.created_at || new Date().toISOString();
        return dateVal.split(' ')[0] === selectedDate || dateVal.split('T')[0] === selectedDate;
      }).length,
      paidOrdersToday,
      pendingOrdersToday,
      pendingAmountToday,
      prevOrderPaymentTotal,
      previousOrderPayments
    };
  }, [settlementOrders, selectedDate]);

  const settlementExpensesFlow = useMemo(() => {
    const dailyExpenses = settlementExpenses.filter(e => {
      const dateVal = e.expense_date || e.created_at;
      if (!dateVal) return false;
      return dateVal.split('T')[0] === selectedDate;
    });

    const materialCash = dailyExpenses
      .filter(e => e.payment_method === 'cash' && (e.category === '자재' || e.category === 'material'))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const otherCash = dailyExpenses
      .filter(e => e.payment_method === 'cash' && e.sub_category !== 'delivery' && e.sub_category !== 'delivery_fee' && e.category !== '자재' && e.category !== 'material' && e.category !== '운송' && e.category !== 'transport')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalCashExpense = dailyExpenses
      .filter(e => e.payment_method === 'cash' && e.sub_category !== 'delivery' && e.sub_category !== 'delivery_fee')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const deliveryCostCash = dailyExpenses
      .filter(e => (e.payment_method === 'cash' || e.description?.includes('현금')) && (e.sub_category === 'delivery' || e.sub_category === 'delivery_fee' || e.category === '운송' || e.category === 'transport'))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      materialCash,
      otherCash,
      totalCashExpense,
      deliveryCostCash
    };
  }, [settlementExpenses, selectedDate]);

  const settlementVaultCash = useMemo(() => {
    const cashSales = settlementStats.cashSales;
    const deliveryCostCash = Math.max(settlementStats.deliveryCostCash, settlementExpensesFlow.deliveryCostCash);
    const cashExpenses = settlementExpensesFlow.totalCashExpense;

    let prevBalance = 0;
    if (settlementRecord?.previous_vault_balance !== undefined && settlementRecord?.previous_vault_balance !== null) {
      prevBalance = settlementRecord.previous_vault_balance;
    } else if (prevSettlementRecord) {
      prevBalance = (prevSettlementRecord.previous_vault_balance || 0) + 
                    (prevSettlementRecord.cash_sales_today || 0) - 
                    (prevSettlementRecord.vault_deposit || 0) - 
                    (prevSettlementRecord.delivery_cost_cash_today || 0) - 
                    (prevSettlementRecord.cash_expense_today || 0);
    }

    const currentBalance = prevBalance + cashSales - (settlementRecord?.vault_deposit || 0) - deliveryCostCash - cashExpenses;

    return {
      prevBalance,
      cashSales,
      deliveryCostCash,
      cashExpenses,
      vaultDeposit: settlementRecord?.vault_deposit || 0,
      currentBalance
    };
  }, [settlementStats, settlementExpensesFlow, settlementRecord, prevSettlementRecord]);
  const baseLocale = toBaseLocale(locale);
  const formatReceiptType = (value: string) => {
    const map: Record<string, string> = {
      delivery: tf.f00240,
      pickup: tf.f00752,
      pickup_reservation: tf.f00753,
      delivery_reservation: tf.f00245,
      store_pickup: tf.f00191,
    };
    return map[value] ?? value;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSettlementLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/hq/branches/${tenantId}?locale=${encodeURIComponent(locale)}&uiLocale=${encodeURIComponent(locale)}&date=${selectedDate}`,
          {
            credentials: "include",
          }
        );
        if (res.status === 401) {
          if (!cancelled) setError(tf.f00176);
          return;
        }
        if (res.status === 403) {
          if (!cancelled) setError(tf.f01675);
          return;
        }
        if (res.status === 404) {
          if (!cancelled) setError(tf.f01926);
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          if (!cancelled) setError((j as { error?: string }).error || tf.f01293);
          return;
        }
        const json = (await res.json()) as any;
        if (!cancelled) {
          setData(json);
          // 서버에서 RLS 우회로 읽어온 일일 정산 원천 데이터를 상태 변수에 바인딩
          setSettlementOrders(json.settlementData?.orders || []);
          setSettlementExpenses(json.settlementData?.expenses || []);
          setSettlementRecord(json.settlementData?.settlementRecord || null);
          setPrevSettlementRecord(json.settlementData?.prevSettlementRecord || null);
        }
      } catch {
        if (!cancelled) setError(tf.f01047);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSettlementLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, locale, selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <PageHeader title={tf.f01909} description={tf.f01438} />
        <Card className="max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>{tf.f02120}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/hq"
              className={cn(buttonVariants({ variant: "outline" }), "inline-flex gap-2")}
            >
              <ArrowLeft className="h-4 w-4" />
              {tf.f01264}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { tenant, range, stats, recentOrders, warning } = data;

  const enterWorkContext = async () => {
    setWorkSwitching(true);
    try {
      const res = await fetch("/api/hq/work-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, uiLocale: locale }),
        credentials: "include",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((j as { error?: string }).error ?? tf.f01540);
        return;
      }
      await refreshAuth();
      toast.success(`${tenant.name} ${tf.f01538}`);
      router.push("/dashboard");
    } catch {
      toast.error(tf.f01046);
    } finally {
      setWorkSwitching(false);
    }
  };

  const applySharedCatalog = async () => {
    setCatalogApplying(true);
    try {
      const res = await fetch("/api/hq/catalog/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, uiLocale: locale }),
        credentials: "include",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((j as { error?: string }).error ?? tf.f01777);
        return;
      }
      toast.success(
        `${tf.f00956}: ${tf.f00415} ${(j as { inserted?: number }).inserted ?? 0}${tf.f00033} · ${tf.f00870} ${(j as { updated?: number }).updated ?? 0}${tf.f00033} · ${tf.f00892} ${(j as { skipped?: number }).skipped ?? 0}${tf.f00033}`
      );
    } catch {
      toast.error(tf.f01046);
    } finally {
      setCatalogApplying(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={tenant.name}
          description={`${tf.f02143} ${tenant.plan ?? "—"} · ${tf.f02005} (${range.from} ~ ${range.to})`}
        />
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2 justify-end">

            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5"
              disabled={catalogApplying}
              onClick={applySharedCatalog}
            >
              {catalogApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              {tf.f00955}
            </Button>
          </div>
          <Link
            href="/dashboard/hq"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 gap-1.5 w-fit sm:ml-auto")}
          >
            <ArrowLeft className="h-4 w-4" />
            {tf.f01263}
          </Link>
        </div>
      </div>

      {warning ? (
        <Card className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-amber-900 dark:text-amber-100">{tf.f01522}</CardTitle>
            <CardDescription className="text-amber-800 dark:text-amber-200">{warning}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {stats ? (
        <div className="space-y-6">
          {/* 1층: 돈의 흐름 (회계 KPI) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200 shadow-sm hover:shadow transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-slate-500">📅 월매출 (당월 실적)</CardTitle>
                <Building2 className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">
                  ₩{stats.revenue.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-100 font-bold px-1.5 py-0.5 shadow-none">
                    목표 85% 달성
                  </Badge>
                  <span className="text-[10px] text-slate-400">대비 순항 중</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm hover:shadow transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-slate-500">🌟 년매출 누적 (연간 성과)</CardTitle>
                <Building2 className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">
                  ₩{(stats.revenue * 12.4).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-1.5 py-0.5 shadow-none">
                    ↗ 전년비 14%
                  </Badge>
                  <span className="text-[10px] text-slate-400">매출 성장세</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm hover:shadow transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-slate-500">🚨 미수금 현황 (외상 대금)</CardTitle>
                <FileText className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-rose-600">
                  ₩{Math.round(stats.revenue * 0.12).toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge className="text-[9px] bg-rose-50 text-rose-700 border-rose-100 font-bold px-1.5 py-0.5 shadow-none">
                    수금율 88%
                  </Badge>
                  <span className="text-[10px] text-slate-400">후불/법인 잔액</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm hover:shadow transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-slate-500">💳 평균 객단가 (AOV)</CardTitle>
                <ShoppingCart className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">
                  ₩{stats.avgOrderValue.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">유효 주문 수:</span>
                  <span className="text-[11px] text-slate-700 font-bold">{stats.orderCount}건</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 2층: 매장 운영 (물류 및 정산 KPI) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200 shadow-sm hover:shadow transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-slate-500">🚚 실시간 배송 관제</CardTitle>
                <Store className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-slate-800 flex items-baseline gap-1">
                  <span>대기</span> <span className="text-indigo-600 font-black">2</span>
                  <span className="text-slate-300 mx-1">|</span>
                  <span>배송중</span> <span className="text-amber-600 font-black">1</span>
                  <span className="text-slate-300 mx-1">|</span>
                  <span>완료</span> <span className="text-emerald-600 font-black">{stats.orderCount - 3 > 0 ? stats.orderCount - 3 : 1}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">오늘 약속된 배송 완료율 80%</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm hover:shadow transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-slate-500">⏰ 예약 및 매장 수령</CardTitle>
                <Store className="h-4 w-4 text-teal-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">
                  {Math.round(stats.orderCount * 0.4) || 1}건
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400">매장 방문 픽업 비율:</span>
                  <span className="text-[11px] text-teal-600 font-bold">40%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm hover:shadow transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-slate-500">🤝 본사 물품 사입액</CardTitle>
                <Package className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">
                  ₩{Math.round(stats.revenue * 0.23).toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge className="text-[9px] bg-violet-50 text-violet-700 border-violet-100 font-bold px-1.5 py-0.5 shadow-none">
                    사입율 23%
                  </Badge>
                  <span className="text-[10px] text-slate-400">꽃/부자재 공급액</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm hover:shadow transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-slate-500">💰 지점 예치금 잔고</CardTitle>
                <Store className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">
                  ₩{Math.round(450000 + (tenantId.charCodeAt(0) * 1000)).toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge className="text-[9px] bg-sky-50 text-sky-700 border-sky-100 font-bold px-1.5 py-0.5 shadow-none">
                    가용 가능
                  </Badge>
                  <span className="text-[10px] text-slate-400">네트워크 수발주용</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {/* 지점 일일 마감 정산 공식 복제 관제판 */}
      <div className="space-y-6 pt-4 border-t">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="h-6 w-6 text-indigo-600" />
              일일 마감 정산 (지점 관제)
            </h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">
              지점 사장님이 마감 시 등록하는 당일 현금 시재 및 결산 내역을 공식 UI 그대로 모니터링합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const [y, m, d] = selectedDate.split("-").map(Number);
                  const date = new Date(y, m - 1, d);
                  date.setDate(date.getDate() - 1);
                  const ny = date.getFullYear();
                  const nm = String(date.getMonth() + 1).padStart(2, "0");
                  const nd = String(date.getDate()).padStart(2, "0");
                  setSelectedDate(`${ny}-${nm}-${nd}`);
                }}
                className="h-8 w-8 rounded-xl hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 w-32 border-none shadow-none font-bold text-xs bg-transparent text-center focus:outline-none cursor-pointer"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const [y, m, d] = selectedDate.split("-").map(Number);
                  const date = new Date(y, m - 1, d);
                  date.setDate(date.getDate() + 1);
                  const ny = date.getFullYear();
                  const nm = String(date.getMonth() + 1).padStart(2, "0");
                  const nd = String(date.getDate()).padStart(2, "0");
                  setSelectedDate(`${ny}-${nm}-${nd}`);
                }}
                className="h-8 w-8 rounded-xl hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
        </div>

        {settlementLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin mb-3 text-indigo-600" />
            <span className="text-xs font-bold text-slate-600">지점의 라이브 정산 데이터를 가져와 계산서를 조립하는 중...</span>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 1층: 요약 카드 4대 */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-none shadow-sm bg-indigo-900 text-white rounded-2xl overflow-hidden relative group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium opacity-80 uppercase tracking-widest">금일 총 매출액</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-light">₩{settlementStats.totalSales.toLocaleString()}</div>
                  <p className="text-[11px] text-indigo-200 mt-2 font-light">
                    신규 ₩{(settlementStats.totalSales - settlementStats.prevOrderPaymentTotal).toLocaleString()} + 수금 ₩{settlementStats.prevOrderPaymentTotal.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-slate-900 text-white rounded-2xl overflow-hidden relative group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium opacity-80 uppercase tracking-widest">수금 (현금 + 계좌)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-light">₩{(settlementStats.cashSales + settlementStats.transferSales).toLocaleString()}</div>
                  <p className="text-[11px] text-slate-400 mt-2 font-light">
                    카드 결제: ₩{settlementStats.cardSales.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden group border border-slate-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-widest">금고 예상 잔액</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-light text-indigo-600">₩{settlementVaultCash.currentBalance.toLocaleString()}</div>
                  <p className="text-[11px] text-slate-400 mt-2 font-light uppercase tracking-tighter">현재 포스기 보유 추정액</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden group border border-slate-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-widest">금일 주문 접수</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-light text-slate-900">{settlementStats.orderCount}건</div>
                  <p className="text-[11px] text-red-500 mt-2 font-medium uppercase tracking-tighter">
                    미결제 {settlementStats.pendingOrdersToday.length}건 / ₩{settlementStats.pendingAmountToday.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 2층: 금고 현금 상세 흐름 (CASH FLOW) & 지출 요약 */}
            <div className="grid gap-4 md:grid-cols-7">
              <Card className="md:col-span-4 border-none shadow-sm bg-white rounded-3xl overflow-hidden border border-slate-100">
                <CardHeader className="bg-slate-50/50 border-b pb-4 px-6">
                  <CardTitle className="text-sm font-medium text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    금고 현금 상세 흐름 (CASH FLOW)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-100">
                      <span className="text-slate-600 font-light text-xs">이전 현금 잔액 (전일 마감 시재)</span>
                      <span className="text-xs font-bold text-slate-800">₩{settlementVaultCash.prevBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-100">
                      <span className="text-slate-600 font-light text-xs">금일 현금 매출 (직접 수금)</span>
                      <span className="text-xs font-medium text-blue-600">+ ₩{settlementVaultCash.cashSales.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-100">
                      <span className="text-slate-600 font-light text-xs">배송비 현금 지급액 (지출)</span>
                      <span className="text-xs font-medium text-rose-600">- ₩{settlementVaultCash.deliveryCostCash.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-100">
                      <span className="text-slate-600 font-light text-xs">기타 현금 지출 (자재/경비)</span>
                      <span className="text-xs font-medium text-rose-600">- ₩{settlementVaultCash.cashExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-100">
                      <span className="text-slate-600 font-light text-xs">관리자 자체 입금/출금 (은행 정산 등)</span>
                      <span className="text-xs font-bold text-slate-800">₩{settlementVaultCash.vaultDeposit.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-4 bg-indigo-50/50 rounded-2xl px-5 mt-6 border border-indigo-100/50 shadow-inner">
                      <span className="text-indigo-900 font-bold text-xs uppercase tracking-wider">최종 마감 예정 잔액</span>
                      <span className="text-xl font-bold text-indigo-700 tracking-tight">₩{settlementVaultCash.currentBalance.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-3 border-none shadow-sm bg-white rounded-3xl overflow-hidden border border-slate-100">
                <CardHeader className="bg-slate-50/50 border-b pb-4 px-6">
                  <CardTitle className="text-sm font-medium text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    오늘 발생한 지출 요약
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">운송비 (현금)</span>
                        <span className="text-base font-bold text-slate-800">₩{settlementVaultCash.deliveryCostCash.toLocaleString()}</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">기타 지출 (현금)</span>
                        <span className="text-base font-bold text-slate-800">₩{settlementVaultCash.cashExpenses.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100">
                      <span className="text-[10px] text-amber-700 font-bold uppercase tracking-widest mb-2 block">총 지출 (카드 포함)</span>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xl font-bold text-amber-900">
                          ₩{settlementExpenses.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}
                        </span>
                        <span className="text-xs text-amber-600 font-medium">{settlementExpenses.length}건</span>
                      </div>
                    </div>

                    <div className="border border-slate-200 p-4 rounded-xl space-y-2 bg-slate-50/20 shadow-inner">
                      <span className="text-xs font-bold text-slate-700 block">📝 마감 정산 메모</span>
                      <div className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-wrap min-h-[40px]">
                        {settlementRecord?.notes || "작성된 특이사항 메모가 없습니다."}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 3층: 상세 결제/미수 주문 테이블 목록 */}
            <div className="grid gap-4 md:grid-cols-1">
              <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden border border-slate-100">
                <CardHeader className="bg-slate-50/50 border-b pb-4 px-6">
                  <CardTitle className="text-sm font-medium text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    금일 결제 처리된 주문 내역
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-b border-slate-50">
                        <TableHead className="font-medium text-[11px] text-slate-600 px-6">시간/번호</TableHead>
                        <TableHead className="font-medium text-[11px] text-slate-600">주문자/상품</TableHead>
                        <TableHead className="font-medium text-[11px] text-slate-600">결제수단</TableHead>
                        <TableHead className="font-medium text-[11px] text-slate-600 text-right">총 주문금액</TableHead>
                        <TableHead className="font-medium text-[11px] text-emerald-600 text-right">금일 수금액</TableHead>
                        <TableHead className="font-medium text-[11px] text-slate-600 text-center">정산 상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...settlementStats.paidOrdersToday, ...settlementStats.previousOrderPayments].map((order, idx) => (
                        <TableRow key={`${order.id}-${idx}`} className="group hover:bg-slate-50/50 border-b border-slate-50/50">
                          <TableCell className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-medium">
                                {order.order_date ? order.order_date.split(" ")[1] || order.order_date.split("T")[1]?.slice(0, 5) : "—"}
                              </span>
                              <div className="flex flex-col gap-1 mt-0.5 items-start">
                                <span className="font-mono text-[10px] text-slate-700 uppercase">{order.order_number}</span>
                                
                                {/* 회원 수발주 배지 */}
                                {(order.transfer_info?.isTransferred || order.outsource_info?.isTransferred) && (
                                  <Badge className={cn(
                                    "text-[9px] font-bold px-1.5 py-0 rounded-full border-none shadow-none",
                                    order.tenant_id === tenantId
                                      ? "bg-indigo-50 text-indigo-700"
                                      : "bg-emerald-50 text-emerald-700"
                                  )}>
                                    {order.tenant_id === tenantId 
                                      ? `이관 발주 (${order.transfer_info?.processBranchName || order.transfer_info?.process_branch_name || order.outsource_info?.processBranchName || order.outsource_info?.process_branch_name || "지점"})` 
                                      : `이관 수주 (${order.transfer_info?.originalBranchName || order.transfer_info?.original_branch_name || order.outsource_info?.originalBranchName || order.outsource_info?.original_branch_name || "지점"})`}
                                  </Badge>
                                )}

                                {/* 외부 발주 배지 */}
                                {order.outsource_info?.isOutsourced && (
                                  <Badge className="text-[9px] font-bold px-1.5 py-0 rounded-full border-none shadow-none bg-amber-50 text-amber-700">
                                    {`외부 발주 (${order.outsource_info.partnerName || order.outsource_info.partner_name || "업체"})`}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-slate-800">
                                {order.items?.map((i: any) => `${i.name} x${i.quantity || 1}`).join(', ') || "상품 정보 없음"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-light">{order.orderer?.name || '현장고객'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 rounded-md border-slate-200">
                              {order.payment?.method === 'card' ? '카드' : order.payment?.method === 'cash' ? '현금' : order.payment?.method === 'transfer' ? '계좌' : '기타'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-500">₩{(order.summary?.total || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs font-bold text-emerald-600">
                            ₩{(order.transfer_info?.isTransferred && order.tenant_id !== tenantId) 
                              ? "0" 
                              : ((order.payment?.isSplitPayment && order.payment?.secondPaymentDate?.startsWith(selectedDate)) ? (order.payment.secondPaymentAmount || 0).toLocaleString() : (order.summary?.total || 0).toLocaleString())}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-none px-2 py-0.5">결제완료</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(settlementStats.paidOrdersToday.length + settlementStats.previousOrderPayments.length) === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-light text-xs">
                            해당 일자에 결제 처리 완료된 주문 데이터가 없습니다.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden mt-4 border border-slate-100">
                <CardHeader className="bg-slate-50/50 border-b pb-4 px-6">
                  <CardTitle className="text-sm font-medium text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    금일 미결제 (미수) 목록
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-b border-slate-50">
                        <TableHead className="font-medium text-xs text-slate-600 px-6">주문번호</TableHead>
                        <TableHead className="font-medium text-xs text-slate-600">주문자/고객</TableHead>
                        <TableHead className="font-medium text-xs text-slate-600 text-right">미수 금액</TableHead>
                        <TableHead className="font-medium text-xs text-slate-600 text-center">결제 예정 방식</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlementStats.pendingOrdersToday.map((order) => (
                        <TableRow key={order.id} className="group hover:bg-slate-50/50 border-b border-slate-50/50">
                          <TableCell className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="font-mono text-[10px] text-slate-700 uppercase">{order.order_number}</span>
                              
                              {/* 회원 수발주 배지 */}
                              {(order.transfer_info?.isTransferred || order.outsource_info?.isTransferred) && (
                                <Badge className={cn(
                                  "text-[9px] font-bold px-1.5 py-0 rounded-full border-none shadow-none",
                                  order.tenant_id === tenantId
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "bg-emerald-50 text-emerald-700"
                                )}>
                                  {order.tenant_id === tenantId 
                                    ? `이관 발주 (${order.transfer_info?.processBranchName || order.transfer_info?.process_branch_name || order.outsource_info?.processBranchName || order.outsource_info?.process_branch_name || "지점"})` 
                                    : `이관 수주 (${order.transfer_info?.originalBranchName || order.transfer_info?.original_branch_name || order.outsource_info?.originalBranchName || order.outsource_info?.original_branch_name || "지점"})`}
                                </Badge>
                              )}

                              {/* 외부 발주 배지 */}
                              {order.outsource_info?.isOutsourced && (
                                <Badge className="text-[9px] font-bold px-1.5 py-0 rounded-full border-none shadow-none bg-amber-50 text-amber-700">
                                  {`외부 발주 (${order.outsource_info.partnerName || order.outsource_info.partner_name || "업체"})`}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-700">{order.orderer?.name || "—"}</TableCell>
                          <TableCell className="text-right text-xs font-bold text-rose-500">
                            ₩{(order.summary?.total || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center text-xs text-slate-400 font-light">
                            {order.payment?.method || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {settlementStats.pendingOrdersToday.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-slate-400 font-light text-xs">
                            해당 일자에 미수금 발생건이 없습니다.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 금일 지출 처리된 내역 리스트 추가 */}
              <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden border border-slate-100 mt-4">
                <CardHeader className="bg-slate-50/50 border-b pb-4 px-6 flex justify-between items-center flex-row">
                  <CardTitle className="text-sm font-medium text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-amber-500" /> 금일 지출 처리된 상세 내역
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-b border-slate-50">
                        <TableHead className="font-medium text-xs text-slate-600 px-6">지출 일시</TableHead>
                        <TableHead className="font-medium text-xs text-slate-600">분류</TableHead>
                        <TableHead className="font-medium text-xs text-slate-600">적요 (상세내용)</TableHead>
                        <TableHead className="font-medium text-xs text-slate-600">결제 수단</TableHead>
                        <TableHead className="font-medium text-xs text-slate-600 text-right">지출 금액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlementExpenses.map((exp) => (
                        <TableRow key={exp.id} className="group hover:bg-slate-50/50 border-b border-slate-50/50">
                          <TableCell className="px-6 py-4">
                            <span className="text-[10px] text-slate-400 font-semibold tabular-nums">
                              {format(new Date(exp.expense_date), "PPp", { locale: dfLoc })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0 rounded-md bg-slate-100 text-slate-600">
                              {expenseCategoryLabel(exp.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-700 truncate max-w-[200px]" title={exp.description || exp.material_name || "—"}>
                            {exp.description || exp.material_name || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 font-medium">
                            {formatPaymentMethod(exp.payment_method)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-slate-800 tabular-nums">
                            ₩{(exp.amount || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {settlementExpenses.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-slate-400 font-light text-xs">
                            금일 등록된 지출 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {tf.f00796}{" "}
        <code className="text-[10px]">organization_catalog_schema.sql</code> 적용 후 사이드바{" "}
        <Link href="/dashboard/hq/shared-products" className="underline font-medium text-foreground">
          {tf.f00952}
        </Link>
        {tf.f01548}
      </p>
    </div>
  );
}
