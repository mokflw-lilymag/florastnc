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
              className="gap-1.5"
              disabled={workSwitching}
              onClick={enterWorkContext}
            >
              {workSwitching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
              {tf.f01674}
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
