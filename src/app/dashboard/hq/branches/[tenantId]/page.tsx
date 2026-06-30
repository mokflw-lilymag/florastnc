"use client";
import { getMessages } from "@/i18n/getMessages";

import { useEffect, useState, use } from "react";
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
  const [settlement, setSettlement] = useState<any | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);

  // 선택된 날짜와 지점(tenantId)의 일일정산 데이터를 실시간으로 가져옵니다.
  useEffect(() => {
    const fetchDailySettlement = async () => {
      if (!tenantId || !selectedDate) return;
      setSettlementLoading(true);
      try {
        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();
        const { data: row, error: err } = await supabase
          .from("daily_settlements")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("date", selectedDate)
          .maybeSingle();
        if (!err && row) {
          setSettlement(row);
        } else {
          setSettlement(null);
        }
      } catch (err) {
        console.error("일일정산 조회 중 에러 발생:", err);
        setSettlement(null);
      } finally {
        setSettlementLoading(false);
      }
    };
    fetchDailySettlement();
  }, [tenantId, selectedDate]);
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
      setError(null);
      try {
        const res = await fetch(
          `/api/hq/branches/${tenantId}?locale=${encodeURIComponent(locale)}&uiLocale=${encodeURIComponent(locale)}`,
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
        const json = (await res.json()) as BranchDetailResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(tf.f01047);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, locale]);

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tf.f01661}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orderCount}{tf.f00033}</div>
              <p className="text-xs text-muted-foreground mt-1">{tf.f02038}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tf.f01177}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.revenue.toLocaleString()}{tf.f00487}</div>
              <p className="text-xs text-muted-foreground mt-1">{tf.f02035}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tf.f00867}</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgOrderValue.toLocaleString()}{tf.f00487}</div>
              <p className="text-xs text-muted-foreground mt-1">{tf.f01662}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tf.f02036}</CardTitle>
              <Badge variant="outline" className="font-normal">
                {tf.f01105}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.canceledCount}{tf.f00033}</div>
              <p className="text-xs text-muted-foreground mt-1">{tf.f01973}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {tf.f02013}
          </CardTitle>
          <CardDescription>{tf.f01652}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{tf.f02176}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tf.f00624}</TableHead>
                  <TableHead>{tf.f01717}</TableHead>
                  <TableHead>{tf.f00640}</TableHead>
                  <TableHead>{tf.f00378}</TableHead>
                  <TableHead className="text-right">{tf.f00097}</TableHead>
                  <TableHead className="text-center">{tf.f00319}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                    <TableCell className="text-sm">{o.order_date}</TableCell>
                    <TableCell className="text-sm">{o.ordererName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatReceiptType(o.receipt_type)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {o.total.toLocaleString()}{tf.f00487}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold border-none",
                          o.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : o.status === "processing"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {o.status === "completed"
                          ? tf.f00471
                          : o.status === "processing"
                            ? tf.f00654
                            : o.status === "canceled"
                              ? tf.f00702
                              : o.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 매장 일일 마감 정산 관제 카드 */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <FileText className="h-5 w-5 text-indigo-600" />
              매장 일일 마감 정산 현황
            </CardTitle>
            <CardDescription>지점 사장님이 마감 시 등록한 당일 현금 시재 및 결산 내역을 조회합니다.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> 조회 날짜:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-slate-200 rounded-xl h-9 px-3 text-xs font-bold bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {settlementLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-2 text-indigo-600" />
              <span className="text-xs font-medium">일일 정산 데이터를 불러오는 중...</span>
            </div>
          ) : settlement ? (
            <div className="space-y-6">
              <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
                <div className="bg-slate-50 border p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500">1. 전일 시재 이월금</span>
                  <div className="text-base font-extrabold text-slate-800">
                    ₩{settlement.previous_vault_balance?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600">2. 당일 현금 매출</span>
                  <div className="text-base font-extrabold text-emerald-700">
                    + ₩{settlement.cash_sales_today?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-rose-500">3. 당일 현금 지출</span>
                  <div className="text-base font-extrabold text-rose-700">
                    - ₩{settlement.cash_expense_today?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-rose-500">4. 현금 배송비 지출</span>
                  <div className="text-base font-extrabold text-rose-700">
                    - ₩{settlement.delivery_cost_cash_today?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-indigo-600">5. 최종 금고 마감 잔액</span>
                  <div className="text-base font-extrabold text-indigo-700">
                    = ₩{(
                      (settlement.previous_vault_balance || 0) +
                      (settlement.cash_sales_today || 0) -
                      (settlement.cash_expense_today || 0) -
                      (settlement.delivery_cost_cash_today || 0)
                    ).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="border p-4 rounded-xl space-y-2 bg-slate-50/30">
                  <span className="text-xs font-bold text-slate-600 block">💰 실물 금고 입금 (최종 입금액)</span>
                  <div className="text-lg font-black text-slate-900">
                    ₩{settlement.vault_deposit?.toLocaleString() || 0}
                  </div>
                  <p className="text-[10px] text-slate-400 font-light leading-relaxed">
                    * 위 최종 금고 마감 잔액 중, 실제로 금고나 은행 계좌에 이체 또는 보관 처리한 실물 시재 금액입니다.
                  </p>
                </div>
                <div className="border p-4 rounded-xl space-y-2 bg-slate-50/30">
                  <span className="text-xs font-bold text-slate-600 block">📝 마감 정산 메모 (비고)</span>
                  <div className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[40px]">
                    {settlement.notes || "등록된 마감 메모가 없습니다."}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/30">
              <span className="text-sm text-slate-400 font-medium block">
                📅 선택하신 날짜({selectedDate})에 등록된 일일 마감 정산 내역이 없습니다.
              </span>
              <span className="text-[11px] text-slate-400 font-light mt-1 block">
                해당 지점에서 당일 결산 작성을 완료하면 실시간으로 여기에 노출됩니다.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

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
