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
          if (!cancelled) setError("로그인이 필요합니다.");
          return;
        }
        if (res.status === 403) {
          if (!cancelled) setError("이 지점을 볼 권한이 없거나 소속 조직이 아닙니다.");
          return;
        }
        if (res.status === 404) {
          if (!cancelled) setError("지점을 찾을 수 없습니다.");
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          if (!cancelled) setError((j as { error?: string }).error || "불러오지 못했습니다.");
          return;
        }
        const json = (await res.json()) as BranchDetailResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("네트워크 오류가 발생했습니다.");
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
        <PageHeader title="지점 상세" description="소속 지점 요약(읽기 전용)" />
        <Card className="max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>표시할 수 없습니다</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/hq"
              className={cn(buttonVariants({ variant: "outline" }), "inline-flex gap-2")}
            >
              <ArrowLeft className="h-4 w-4" />
              본사 개요로
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
        toast.error((j as { error?: string }).error ?? "업무 전환에 실패했습니다.");
        return;
      }
      await refreshAuth();
      toast.success(`${tenant.name} 업무 모드로 전환했습니다.`);
      router.push("/dashboard");
    } catch {
      toast.error("네트워크 오류");
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
        toast.error((j as { error?: string }).error ?? "적용에 실패했습니다.");
        return;
      }
      toast.success(
        `공유 상품 적용: 신규 ${(j as { inserted?: number }).inserted ?? 0}건 · 갱신 ${(j as { updated?: number }).updated ?? 0}건 · 건너뜀 ${(j as { skipped?: number }).skipped ?? 0}건`
      );
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setCatalogApplying(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={tenant.name}
          description={`플랜 ${tenant.plan ?? "—"} · 최근 14일(${range.from} ~ ${range.to}) 기준`}
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
              이 지점으로 업무하기
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
              공유 상품 일괄 등록
            </Button>
          </div>
          <Link
            href="/dashboard/hq"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 gap-1.5 w-fit sm:ml-auto")}
          >
            <ArrowLeft className="h-4 w-4" />
            본사 개요
          </Link>
        </div>
      </div>

      {warning ? (
        <Card className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-amber-900 dark:text-amber-100">안내</CardTitle>
            <CardDescription className="text-amber-800 dark:text-amber-200">{warning}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">유효 주문</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orderCount}건</div>
              <p className="text-xs text-muted-foreground mt-1">취소 제외 · 본사 개요 표와 동일 규칙</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">매출 합계</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.revenue.toLocaleString()}원</div>
              <p className="text-xs text-muted-foreground mt-1">취소 건 제외 합산</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">객단가</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgOrderValue.toLocaleString()}원</div>
              <p className="text-xs text-muted-foreground mt-1">유효 주문 기준 평균</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">취소 건수</CardTitle>
              <Badge variant="outline" className="font-normal">
                동일 기간
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.canceledCount}건</div>
              <p className="text-xs text-muted-foreground mt-1">참고 지표</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            최근 주문
          </CardTitle>
          <CardDescription>위 기간 안에서 최신 순 최대 10건입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">해당 기간 주문이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>주문번호</TableHead>
                  <TableHead>일자</TableHead>
                  <TableHead>주문자</TableHead>
                  <TableHead>수령</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                    <TableCell className="text-sm">{o.order_date}</TableCell>
                    <TableCell className="text-sm">{o.ordererName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.receipt_type}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {o.total.toLocaleString()}원
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
                          ? "완료"
                          : o.status === "processing"
                            ? "준비중"
                            : o.status === "canceled"
                              ? "취소"
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
        「이 지점으로 업무하기」는 상단 배너에서 언제든 종료할 수 있습니다. 공유 상품은{" "}
        <code className="text-[10px]">organization_catalog_schema.sql</code> 적용 후 사이드바{" "}
        <Link href="/dashboard/hq/shared-products" className="underline font-medium text-foreground">
          공동상품관리
        </Link>
        에서 관리합니다.
      </p>
    </div>
  );
}
