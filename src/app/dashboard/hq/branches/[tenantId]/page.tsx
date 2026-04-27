"use client";

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
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);
  const formatReceiptType = (value: string) => {
    const map: Record<string, string> = {
      delivery: tr("배송", "Delivery"),
      pickup: tr("픽업", "Pickup"),
      pickup_reservation: tr("픽업 예약", "Pickup Reservation"),
      delivery_reservation: tr("배송 예약", "Delivery Reservation"),
      store_pickup: tr("매장 수령", "Store Pickup"),
    };
    return map[value] ?? value;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/hq/branches/${tenantId}`, {
          credentials: "include",
        });
        if (res.status === 401) {
          if (!cancelled) setError(tr("로그인이 필요합니다.", "Login required."));
          return;
        }
        if (res.status === 403) {
          if (!cancelled) setError(tr("이 지점을 볼 권한이 없거나 소속 조직이 아닙니다.", "No permission for this branch or not in your organization."));
          return;
        }
        if (res.status === 404) {
          if (!cancelled) setError(tr("지점을 찾을 수 없습니다.", "Branch not found."));
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          if (!cancelled) setError((j as { error?: string }).error || tr("불러오지 못했습니다.", "Failed to load."));
          return;
        }
        const json = (await res.json()) as BranchDetailResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(tr("네트워크 오류가 발생했습니다.", "Network error occurred."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

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
        <PageHeader title={tr("지점 상세", "Branch Details")} description={tr("소속 지점 요약(읽기 전용)", "Branch summary (read-only)")} />
        <Card className="max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>{tr("표시할 수 없습니다", "Cannot display")}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/hq"
              className={cn(buttonVariants({ variant: "outline" }), "inline-flex gap-2")}
            >
              <ArrowLeft className="h-4 w-4" />
              {tr("본사 개요로", "Back to HQ")}
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
        body: JSON.stringify({ tenantId }),
        credentials: "include",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((j as { error?: string }).error ?? tr("업무 전환에 실패했습니다.", "Failed to switch work context."));
        return;
      }
      await refreshAuth();
      toast.success(`${tenant.name} ${tr("업무 모드로 전환했습니다.", "work mode enabled.")}`);
      router.push("/dashboard");
    } catch {
      toast.error(tr("네트워크 오류", "Network error"));
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
        body: JSON.stringify({ tenantId }),
        credentials: "include",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((j as { error?: string }).error ?? tr("적용에 실패했습니다.", "Apply failed."));
        return;
      }
      toast.success(
        `${tr("공유 상품 적용", "Shared catalog applied")}: ${tr("신규", "new")} ${(j as { inserted?: number }).inserted ?? 0}${tr("건", "")} · ${tr("갱신", "updated")} ${(j as { updated?: number }).updated ?? 0}${tr("건", "")} · ${tr("건너뜀", "skipped")} ${(j as { skipped?: number }).skipped ?? 0}${tr("건", "")}`
      );
    } catch {
      toast.error(tr("네트워크 오류", "Network error"));
    } finally {
      setCatalogApplying(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={tenant.name}
          description={`${tr("플랜", "Plan")} ${tenant.plan ?? "—"} · ${tr("최근 14일", "Last 14 days")} (${range.from} ~ ${range.to})`}
        />
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={workSwitching}
              onClick={enterWorkContext}
            >
              {workSwitching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
              {tr("이 지점으로 업무하기", "Work as this branch")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5"
              disabled={catalogApplying}
              onClick={applySharedCatalog}
            >
              {catalogApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              {tr("공유 상품 일괄 등록", "Apply Shared Catalog")}
            </Button>
          </div>
          <Link
            href="/dashboard/hq"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 gap-1.5 w-fit sm:ml-auto")}
          >
            <ArrowLeft className="h-4 w-4" />
            {tr("본사 개요", "HQ Overview")}
          </Link>
        </div>
      </div>

      {warning ? (
        <Card className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-amber-900 dark:text-amber-100">{tr("안내", "Notice")}</CardTitle>
            <CardDescription className="text-amber-800 dark:text-amber-200">{warning}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tr("유효 주문", "Valid Orders")}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orderCount}{tr("건", "")}</div>
              <p className="text-xs text-muted-foreground mt-1">{tr("취소 제외 · 본사 개요 표와 동일 규칙", "Canceled excluded · same rules as HQ overview")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tr("매출 합계", "Total Sales")}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.revenue.toLocaleString()}{tr("원", "")}</div>
              <p className="text-xs text-muted-foreground mt-1">{tr("취소 건 제외 합산", "Total excluding canceled orders")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tr("객단가", "AOV")}</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgOrderValue.toLocaleString()}{tr("원", "")}</div>
              <p className="text-xs text-muted-foreground mt-1">{tr("유효 주문 기준 평균", "Average by valid orders")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tr("취소 건수", "Canceled Count")}</CardTitle>
              <Badge variant="outline" className="font-normal">
                {tr("동일 기간", "Same period")}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.canceledCount}{tr("건", "")}</div>
              <p className="text-xs text-muted-foreground mt-1">{tr("참고 지표", "Reference metric")}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {tr("최근 주문", "Recent Orders")}
          </CardTitle>
          <CardDescription>{tr("위 기간 안에서 최신 순 최대 10건입니다.", "Up to 10 latest orders in selected period.")}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{tr("해당 기간 주문이 없습니다.", "No orders in this period.")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr("주문번호", "Order No.")}</TableHead>
                  <TableHead>{tr("일자", "Date")}</TableHead>
                  <TableHead>{tr("주문자", "Orderer")}</TableHead>
                  <TableHead>{tr("수령", "Receipt")}</TableHead>
                  <TableHead className="text-right">{tr("금액", "Amount")}</TableHead>
                  <TableHead className="text-center">{tr("상태", "Status")}</TableHead>
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
                      {o.total.toLocaleString()}{tr("원", "")}
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
                          ? tr("완료", "Done")
                          : o.status === "processing"
                            ? tr("준비중", "Preparing")
                            : o.status === "canceled"
                              ? tr("취소", "Canceled")
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

      <p className="text-xs text-muted-foreground">
        {tr("「이 지점으로 업무하기」는 상단 배너에서 언제든 종료할 수 있습니다. 공유 상품은", "\"Work as this branch\" can be ended anytime from top banner. Shared catalog is")}{" "}
        <code className="text-[10px]">organization_catalog_schema.sql</code> 적용 후 사이드바{" "}
        <Link href="/dashboard/hq/shared-products" className="underline font-medium text-foreground">
          {tr("공동상품관리", "Shared Products")}
        </Link>
        {tr("에서 관리합니다.", "managed there.")}
      </p>
    </div>
  );
}
