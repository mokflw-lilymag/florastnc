"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Globe,
  BarChart3,
  History,
  Store,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  buildSubscriptionOverview,
  resolveSubscriptionTenure,
  tenureDaysLabelKo,
} from "@/lib/subscription/subscription-tenure";
import {
  ExpiringTenantsPanel,
  SubscriptionOverviewCards,
} from "@/components/admin/ExpiringTenantsPanel";
import { TENANT_COUNTRY_META } from "@/lib/admin/tenant-country-meta";

// ─── 타입 ────────────────────────────────────────────────
type TenantBillingRow = {
  id: string;
  name: string;
  plan: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  status: string | null;
  is_premium: boolean | null;
  country: string | null;
  currency: string | null;
};

// 플랜별 월 단가 (원화 환산 기준)
const PLAN_MRR_USD: Record<string, number> = {
  free: 0,
  ribbon_only: 15000,
  light: 25000,
  pro: 40000,
  pro_plus: 60000,
};

const PLAN_LABELS: Record<string, string> = {
  free: "무료 체험판",
  ribbon_only: "리본 라이센스 (리본 전용)",
  light: "플로비서 라이트",
  pro: "플로비서 프로",
  pro_plus: "플로비서 프로 플러스",
};

const PLAN_COLORS = ["#10b981", "#8b5cf6", "#14b8a6", "#3b82f6", "#64748b"];
const PLANS = ["pro_plus", "pro", "light", "ribbon_only", "free"];

// ─── 간단한 도넛 차트 (SVG) ─────────────────────────────
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="text-center text-slate-400 text-sm py-4">데이터 없음</div>;

  let offset = 0;
  const r = 45;
  const cx = 60;
  const cy = 60;
  const circ = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {data.map((d, i) => {
          const pct = d.value / total;
          const dash = pct * circ;
          const gap = circ - dash;
          const rotation = (offset / total) * 360 - 90;
          offset += d.value;
          if (d.value === 0) return null;
          return (
            <circle
              key={i}
              r={r}
              cx={cx}
              cy={cy}
              fill="none"
              stroke={d.color}
              strokeWidth="20"
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotation} ${cx} ${cy})`}
              style={{ transition: "stroke-dasharray 0.3s ease" }}
            />
          );
        })}
        <circle r="28" cx={cx} cy={cy} fill="white" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="bold" fill="#1e293b">
          {total}
        </text>
      </svg>
      <div className="space-y-1.5">
        {data.filter((d) => d.value > 0).map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-slate-600">{d.label}</span>
            <span className="font-bold ml-auto pl-2">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BillingAdminPage() {
  const supabase = createClient();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();

  const [tenants, setTenants] = useState<TenantBillingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: tData } = await supabase
        .from("tenants")
        .select("id, name, plan, subscription_start, subscription_end, status, is_premium")
        .order("subscription_end", { ascending: true, nullsFirst: true });

      const ids = (tData ?? []).map((t) => t.id);
      const { data: sData } = await supabase
        .from("system_settings")
        .select("tenant_id, data")
        .in("tenant_id", ids);

      const settingsMap: Record<string, { country?: string; currency?: string }> = {};
      for (const s of sData ?? []) {
        settingsMap[s.tenant_id] = {
          country: (s.data as Record<string, unknown>)?.country as string ?? null,
          currency: (s.data as Record<string, unknown>)?.currency as string ?? null,
        };
      }

      setTenants((tData ?? []).map((t) => ({
        ...t,
        country: settingsMap[t.id]?.country ?? null,
        currency: settingsMap[t.id]?.currency ?? null,
      })));
    } catch (e) {
      console.error(e);
      toast.error("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) load();
    else if (!authLoading && !isSuperAdmin) setLoading(false);
  }, [authLoading, isSuperAdmin, load]);

  if (authLoading || (isSuperAdmin && loading)) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>;
  }
  if (!isSuperAdmin) return <AccessDenied requiredTier="System Admin" />;

  // ─── 계산 ──────────────────────────────────────────────
  const overview = useMemo(() => buildSubscriptionOverview(tenants), [tenants]);
  const totalMRR = tenants.reduce((s, t) => s + (PLAN_MRR_USD[t.plan ?? "free"] ?? 0), 0);
  const paidCount = tenants.filter((t) => t.plan && t.plan !== "free").length;

  const donutData = PLANS.map((p, i) => ({
    label: PLAN_LABELS[p],
    value: tenants.filter((t) => (t.plan ?? "free") === p).length,
    color: PLAN_COLORS[i],
  }));

  // 국가별 MRR
  const countryMRR = Object.entries(
    tenants.reduce((acc, t) => {
      const c = t.country ?? "KR";
      acc[c] = (acc[c] ?? 0) + (PLAN_MRR_USD[t.plan ?? "free"] ?? 0);
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8">
      {/* 헤더 */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">SaaS 구독 대시보드</h1>
            <p className="text-slate-500 text-sm">
              Floxync 플랜·MRR·만료 현황 (매장 지갑·출금은{" "}
              <Link href="/dashboard/billing-admin" className="text-emerald-600 hover:underline font-medium">
                지갑·출금
              </Link>
              과 별도)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/admin/subscription-events"
            className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 h-9" })}
          >
            <History className="w-3.5 h-3.5" /> 결제 이력
          </Link>
          <Button variant="outline" onClick={load} className="gap-1.5 h-9">
            <RefreshCw className="w-3.5 h-3.5" /> 새로고침
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "예상 MRR (KRW)", value: `₩${totalMRR.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "유료 구독 수", value: paidCount, icon: CreditCard, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "7일 내 만료", value: overview.expiring7, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "연체/만료", value: overview.expired, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
        ].map((k) => (
          <Card key={k.label} className="border-0 shadow-sm ring-1 ring-slate-100">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg ${k.bg} flex items-center justify-center`}>
                  <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
                </div>
                <span className="text-xs text-slate-500">{k.label}</span>
              </div>
              <p className="text-2xl font-black">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SubscriptionOverviewCards overview={overview} />

      <ExpiringTenantsPanel
        overview={overview}
        locale="ko"
        maxRows={15}
        tenantsHref="/dashboard/tenants"
        billingHref="/dashboard/admin/billing"
      />

      {/* 도넛 + 국가별 MRR */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><BarChart3 className="w-4 h-4" />플랜별 분포</CardTitle></CardHeader>
          <CardContent><DonutChart data={donutData} /></CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><Globe className="w-4 h-4" />국가별 MRR (KRW)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {countryMRR.filter(([, v]) => v > 0).map(([code, mrr]) => {
              const meta = TENANT_COUNTRY_META[code];
              const maxMRR = countryMRR[0]?.[1] ?? 1;
              return (
                <div key={code} className="flex items-center gap-2">
                  <span className="text-base">{meta?.flag ?? "🌐"}</span>
                  <span className="text-xs font-medium w-20 shrink-0">{meta?.name ?? code}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(mrr / maxMRR) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-slate-500 w-20 text-right">₩{mrr.toLocaleString()}</span>
                </div>
              );
            })}
            {countryMRR.filter(([, v]) => v > 0).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">유료 구독 데이터 없음</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 전체 구독 목록 */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-100">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-1.5">
            <CreditCard className="w-4 h-4" />
            전체 구독 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs">업체명</TableHead>
                <TableHead className="text-xs">국가</TableHead>
                <TableHead className="text-xs">플랜</TableHead>
                <TableHead className="text-xs">월 구독료</TableHead>
                <TableHead className="text-xs">구독 시작</TableHead>
                <TableHead className="text-xs">잔여</TableHead>
                <TableHead className="text-xs">구독 만료</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.filter((t) => t.plan && t.plan !== "free").map((t) => {
                const meta = TENANT_COUNTRY_META[t.country ?? ""];
                const mrr = PLAN_MRR_USD[t.plan ?? "free"] ?? 0;
                const tenure = resolveSubscriptionTenure(t);
                return (
                  <TableRow key={t.id} className={tenure.isExpired ? "bg-red-50/30" : tenure.bucket === "warning" || tenure.bucket === "critical" ? "bg-amber-50/20" : ""}>
                    <TableCell className="font-medium text-sm py-3">{t.name}</TableCell>
                    <TableCell><span className="text-base">{meta?.flag ?? "🌐"}</span></TableCell>
                    <TableCell>
                      <Badge variant={tenure.isExpired ? "destructive" : "secondary"} className="text-xs">
                        {PLAN_LABELS[t.plan ?? "free"] ?? t.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold text-emerald-700">₩{mrr.toLocaleString()}/mo</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {t.subscription_start ? format(parseISO(t.subscription_start), "yyyy.MM.dd") : "-"}
                    </TableCell>
                    <TableCell className="text-xs font-bold tabular-nums">
                      {tenureDaysLabelKo(tenure)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {tenure.endDate ? (
                        <span className={tenure.isExpired ? "text-red-500 font-bold" : "text-slate-500"}>
                          {format(tenure.endDate, "yyyy.MM.dd")}
                          {tenure.isExpired && " (만료)"}
                        </span>
                      ) : tenure.isLifetime ? "평생" : "-"}
                    </TableCell>
                    <TableCell>
                      {tenure.isExpired && (
                        <Link
                          href="/dashboard/tenants"
                          className={buttonVariants({
                            size: "sm",
                            variant: "outline",
                            className: "h-6 text-xs gap-1 text-emerald-600 border-emerald-300 inline-flex items-center",
                          })}
                        >
                          <Store className="w-3 h-3" /> 연장
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {tenants.filter((t) => t.plan && t.plan !== "free").length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm">유료 구독 데이터 없음</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
