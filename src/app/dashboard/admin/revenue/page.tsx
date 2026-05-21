"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Building2,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import type { TenantRevenueSummary } from "@/lib/revenue/types";

interface OverviewResponse {
  period_start: string;
  period_end: string;
  platform_total: number;
  tenant_count: number;
  tenants: TenantRevenueSummary[];
  schema_ready: boolean;
  hint?: string;
}

function formatKrw(n: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminRevenueOverviewPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (
    ko: string,
    en: string,
    vi?: string,
  ) => pickUiText(baseLocale, ko, en, vi);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/revenue/overview?days=30&uiLocale=${encodeURIComponent(locale)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) load();
    else if (!authLoading && !isSuperAdmin) setLoading(false);
  }, [authLoading, isSuperAdmin, load]);

  if (authLoading || (isSuperAdmin && loading && !data)) {
    return (
      <div className="container mx-auto p-8">
        <p className="text-muted-foreground">{tr("불러오는 중…", "Loading…", "Đang tải…")}</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-emerald-600 text-white p-2 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter">
              {tr("매출 엔진 Overview", "Revenue Engine Overview", "Tổng quan doanh thu")}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {tr(
              "Floxync 캠페인·알림으로 귀속된 증분 매출 (북극성 KPI)",
              "Incremental revenue attributed to Floxync campaigns (North Star KPI)",
              "Doanh thu gán cho chiến dịch Floxync",
            )}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {tr("새로고침", "Refresh", "Làm mới")}
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-destructive/50">
          <CardContent className="pt-6 text-destructive">{error}</CardContent>
        </Card>
      )}

      {data && !data.schema_ready && (
        <Card className="mb-6 border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-900 text-base">
              <AlertTriangle className="w-5 h-5" />
              {tr("DB 스키마 미적용", "Schema not applied", "Chưa áp schema")}
            </CardTitle>
            <CardDescription className="text-amber-800">
              {tr(
                "Supabase SQL Editor에서 supabase/revenue_engine_schema.sql 을 실행해 주세요.",
                "Run supabase/revenue_engine_schema.sql in Supabase SQL Editor.",
                "Chạy supabase/revenue_engine_schema.sql trên Supabase.",
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{tr("플랫폼 합계 (30일)", "Platform total (30d)", "Tổng 30 ngày")}</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  {formatKrw(data.platform_total)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{tr("귀속 매장 수", "Tenants with attribution", "Số cửa hàng")}</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {data.tenant_count}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{tr("집계 기간", "Period", "Kỳ")}</CardDescription>
                <CardTitle className="text-sm font-medium leading-snug">
                  {new Date(data.period_start).toLocaleDateString("ko-KR")}
                  {" → "}
                  {new Date(data.period_end).toLocaleDateString("ko-KR")}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{tr("테넌트별 증분 매출", "Per-tenant attributed revenue", "Doanh thu theo cửa hàng")}</CardTitle>
              <CardDescription>
                {tr(
                  "marketing_attributions 기준 · Phase 0",
                  "Based on marketing_attributions · Phase 0",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.tenants.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  {tr(
                    "아직 귀속된 주문이 없습니다. Phase 1 캠페인 실행 후 표시됩니다.",
                    "No attributed orders yet. Will appear after Phase 1 campaigns.",
                  )}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4">{tr("매장", "Tenant", "Cửa hàng")}</th>
                        <th className="py-2 pr-4 text-right">{tr("귀속 매출", "Attributed", "Gán")}</th>
                        <th className="py-2 pr-4 text-right">{tr("건수", "Count", "Số")}</th>
                        <th className="py-2 text-right">{tr("캠페인", "Campaigns", "Chiến dịch")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tenants.map((t) => (
                        <tr key={t.tenant_id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">
                            {t.tenant_name ?? t.tenant_id.slice(0, 8)}
                          </td>
                          <td className="py-3 pr-4 text-right font-semibold text-emerald-700">
                            {formatKrw(t.total_attributed)}
                          </td>
                          <td className="py-3 pr-4 text-right">{t.attribution_count}</td>
                          <td className="py-3 text-right">
                            <Badge variant="secondary">{t.campaign_count}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
