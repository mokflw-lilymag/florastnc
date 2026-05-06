"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  CheckCircle2,
  RefreshCw,
  DollarSign,
  Globe,
  BarChart3,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

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

// 플랜별 월 단가 (USD 기준)
const PLAN_MRR_USD: Record<string, number> = {
  free: 0,
  basic: 19,
  pro: 49,
  premium: 99,
  enterprise: 299,
};

const PLAN_LABELS: Record<string, string> = {
  free: "무료",
  basic: "베이직",
  pro: "프로",
  premium: "프리미엄",
  enterprise: "엔터프라이즈",
};

const COUNTRY_META: Record<string, { flag: string; name: string }> = {
  KR: { flag: "🇰🇷", name: "대한민국" },
  VN: { flag: "🇻🇳", name: "베트남" },
  JP: { flag: "🇯🇵", name: "일본" },
  ID: { flag: "🇮🇩", name: "인도네시아" },
  MY: { flag: "🇲🇾", name: "말레이시아" },
  TH: { flag: "🇹🇭", name: "태국" },
  US: { flag: "🇺🇸", name: "미국" },
  GB: { flag: "🇬🇧", name: "영국" },
  SG: { flag: "🇸🇬", name: "싱가포르" },
};

const PLAN_COLORS = ["#6d28d9", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
const PLANS = ["enterprise", "premium", "pro", "basic", "free"];

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

  const handleGrantPremium = async (tenantId: string, tenantName: string) => {
    const { error } = await supabase
      .from("tenants")
      .update({ plan: "premium", is_premium: true })
      .eq("id", tenantId);
    if (error) { toast.error("실패: " + error.message); return; }
    toast.success(`✅ ${tenantName} 프리미엄 부여 완료`);
    load();
  };

  if (authLoading || (isSuperAdmin && loading)) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>;
  }
  if (!isSuperAdmin) return <AccessDenied requiredTier="System Admin" />;

  // ─── 계산 ──────────────────────────────────────────────
  const totalMRR = tenants.reduce((s, t) => s + (PLAN_MRR_USD[t.plan ?? "free"] ?? 0), 0);
  const paidCount = tenants.filter((t) => t.plan && t.plan !== "free").length;
  const expiringSoon = tenants.filter((t) => {
    if (!t.subscription_end) return false;
    return differenceInDays(parseISO(t.subscription_end), new Date()) <= 7 && differenceInDays(parseISO(t.subscription_end), new Date()) >= 0;
  });
  const expired = tenants.filter((t) => {
    if (!t.subscription_end) return false;
    return new Date(t.subscription_end) < new Date() && t.plan !== "free";
  });

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
            <h1 className="text-2xl font-black tracking-tight">구독 / 결제 대시보드</h1>
            <p className="text-slate-500 text-sm">플랜별 구독 현황 및 만료 예정 테넌트 관리</p>
          </div>
        </div>
        <Button variant="outline" onClick={load} className="gap-1.5 h-9">
          <RefreshCw className="w-3.5 h-3.5" /> 새로고침
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "예상 MRR (USD)", value: `$${totalMRR.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "유료 구독 수", value: paidCount, icon: CreditCard, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "7일 내 만료", value: expiringSoon.length, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "연체/만료", value: expired.length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
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

      {/* 도넛 + 국가별 MRR */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><BarChart3 className="w-4 h-4" />플랜별 분포</CardTitle></CardHeader>
          <CardContent><DonutChart data={donutData} /></CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><Globe className="w-4 h-4" />국가별 MRR (USD)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {countryMRR.filter(([, v]) => v > 0).map(([code, mrr]) => {
              const meta = COUNTRY_META[code];
              const maxMRR = countryMRR[0]?.[1] ?? 1;
              return (
                <div key={code} className="flex items-center gap-2">
                  <span className="text-base">{meta?.flag ?? "🌐"}</span>
                  <span className="text-xs font-medium w-20 shrink-0">{meta?.name ?? code}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(mrr / maxMRR) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-slate-500 w-16 text-right">${mrr.toLocaleString()}</span>
                </div>
              );
            })}
            {countryMRR.filter(([, v]) => v > 0).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">유료 구독 데이터 없음</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 만료 임박 */}
      {expiringSoon.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              7일 내 구독 만료 예정 ({expiringSoon.length}개)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">업체명</TableHead>
                  <TableHead className="text-xs">국가</TableHead>
                  <TableHead className="text-xs">플랜</TableHead>
                  <TableHead className="text-xs">만료일</TableHead>
                  <TableHead className="text-xs">D-day</TableHead>
                  <TableHead className="text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringSoon.map((t) => {
                  const meta = COUNTRY_META[t.country ?? ""];
                  const dday = differenceInDays(parseISO(t.subscription_end!), new Date());
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-sm">{t.name}</TableCell>
                      <TableCell><span className="text-base mr-1">{meta?.flag ?? "🌐"}</span></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{PLAN_LABELS[t.plan ?? "free"] ?? t.plan}</Badge></TableCell>
                      <TableCell className="text-xs">{format(parseISO(t.subscription_end!), "yyyy.MM.dd")}</TableCell>
                      <TableCell><span className="text-xs font-bold text-amber-600">D-{dday}</span></TableCell>
                      <TableCell>
                        <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          onClick={() => handleGrantPremium(t.id, t.name)}>
                          <CheckCircle2 className="w-3 h-3" />
                          프리미엄 연장
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
                <TableHead className="text-xs">구독 만료</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.filter((t) => t.plan && t.plan !== "free").map((t) => {
                const meta = COUNTRY_META[t.country ?? ""];
                const mrr = PLAN_MRR_USD[t.plan ?? "free"] ?? 0;
                const isExpired = t.subscription_end ? new Date(t.subscription_end) < new Date() : false;
                return (
                  <TableRow key={t.id} className={isExpired ? "bg-red-50/30" : ""}>
                    <TableCell className="font-medium text-sm py-3">{t.name}</TableCell>
                    <TableCell><span className="text-base">{meta?.flag ?? "🌐"}</span></TableCell>
                    <TableCell>
                      <Badge variant={isExpired ? "destructive" : "secondary"} className="text-xs">
                        {PLAN_LABELS[t.plan ?? "free"] ?? t.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold text-emerald-700">${mrr}/mo</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {t.subscription_start ? format(parseISO(t.subscription_start), "yyyy.MM.dd") : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.subscription_end ? (
                        <span className={isExpired ? "text-red-500 font-bold" : "text-slate-500"}>
                          {format(parseISO(t.subscription_end), "yyyy.MM.dd")}
                          {isExpired && " (만료)"}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {isExpired && (
                        <Button size="sm" variant="outline" className="h-6 text-xs gap-1 text-emerald-600 border-emerald-300"
                          onClick={() => handleGrantPremium(t.id, t.name)}>
                          <CheckCircle2 className="w-3 h-3" /> 연장
                        </Button>
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
