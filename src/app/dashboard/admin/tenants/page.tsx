"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Loader2,
  Globe,
  Building2,
  Search,
  Download,
  RefreshCw,
  Users,
  TrendingUp,
  CreditCard,
  ExternalLink,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Infinity as InfinityIcon,
} from "lucide-react";
import { format, parseISO, addDays, addMonths, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

// ─── 타입 ────────────────────────────────────────────────
type TenantRow = {
  id: string;
  name: string;
  plan: string | null;
  status: string | null;
  created_at: string;
  subscription_end: string | null;
  is_premium: boolean | null;
  organization_id: string | null;
  country: string | null;
  currency: string | null;
};

const COUNTRY_META: Record<string, { flag: string; name: string }> = {
  KR: { flag: "🇰🇷", name: "대한민국" },
  VN: { flag: "🇻🇳", name: "베트남" },
  JP: { flag: "🇯🇵", name: "일본" },
  CN: { flag: "🇨🇳", name: "중국" },
  ID: { flag: "🇮🇩", name: "인도네시아" },
  MY: { flag: "🇲🇾", name: "말레이시아" },
  TH: { flag: "🇹🇭", name: "태국" },
  US: { flag: "🇺🇸", name: "미국" },
  GB: { flag: "🇬🇧", name: "영국" },
  FR: { flag: "🇫🇷", name: "프랑스" },
  DE: { flag: "🇩🇪", name: "독일" },
  ES: { flag: "🇪🇸", name: "스페인" },
  RU: { flag: "🇷🇺", name: "러시아" },
  SG: { flag: "🇸🇬", name: "싱가포르" },
  AU: { flag: "🇦🇺", name: "호주" },
  CA: { flag: "🇨🇦", name: "캐나다" },
};

const PLAN_STYLES: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  basic: "bg-blue-100 text-blue-700",
  pro: "bg-violet-100 text-violet-700",
  premium: "bg-amber-100 text-amber-700",
  enterprise: "bg-emerald-100 text-emerald-700",
};

const PLAN_LABELS: Record<string, string> = {
  free: "무료",
  basic: "베이직",
  pro: "프로",
  premium: "프리미엄",
  enterprise: "엔터프라이즈",
};

const PLANS = ["free", "basic", "pro", "premium", "enterprise"];

function PlanBadge({ plan }: { plan: string | null }) {
  const p = plan ?? "free";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${PLAN_STYLES[p] ?? "bg-slate-100 text-slate-500"}`}>
      {PLAN_LABELS[p] ?? p}
    </span>
  );
}

export default function TenantsAdminPage() {
  const supabase = createClient();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();

  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("ALL");
  const [filterPlan, setFilterPlan] = useState("ALL");

  // 구독 관리 다이얼로그
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantRow | null>(null);
  const [newPlan, setNewPlan] = useState("");
  const [newStatus, setNewStatus] = useState<"active" | "suspended">("active");
  const [newEnd, setNewEnd] = useState<Date | undefined>(undefined);
  const [changingPlan, setChangingPlan] = useState(false);

  // 만료일 단축 버튼 — 현재 만료일 기준 연장(과거면 오늘 기준)
  const extendBy = (months: number | "test" | "expire" | "lifetime") => {
    if (months === "expire") {
      setNewEnd(new Date());
      return;
    }
    if (months === "lifetime") {
      setNewEnd(new Date(2099, 11, 31, 23, 59, 59));
      return;
    }
    if (months === "test") {
      setNewEnd(addDays(new Date(), 7));
      return;
    }
    const cur = newEnd ?? null;
    const base = cur && !isAfter(new Date(), cur) ? cur : new Date();
    setNewEnd(addMonths(base, months));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 테넌트 기본 정보
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, name, plan, status, created_at, subscription_end, is_premium, organization_id")
        .order("created_at", { ascending: false });

      if (!tenantData) { setTenants([]); return; }

      // system_settings에서 country 정보 조인 (data 컬럼이 JSONB)
      const tenantIds = tenantData.map((t) => t.id);
      const { data: settings } = await supabase
        .from("system_settings")
        .select("tenant_id, data")
        .in("tenant_id", tenantIds);

      const settingsMap: Record<string, { country?: string; currency?: string }> = {};
      for (const s of settings ?? []) {
        if (s.data && typeof s.data === "object") {
          settingsMap[s.tenant_id] = {
            country: (s.data as Record<string, unknown>).country as string ?? null,
            currency: (s.data as Record<string, unknown>).currency as string ?? null,
          };
        }
      }

      const merged: TenantRow[] = tenantData.map((t) => ({
        ...t,
        country: settingsMap[t.id]?.country ?? null,
        currency: settingsMap[t.id]?.currency ?? null,
      }));
      setTenants(merged);
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

  const handleSaveSubscription = async () => {
    if (!selectedTenant || !newPlan) return;
    setChangingPlan(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          plan: newPlan,
          is_premium: newPlan === "premium" || newPlan === "enterprise",
          status: newStatus,
          subscription_end: newEnd ? newEnd.toISOString() : null,
        })
        .eq("id", selectedTenant.id);
      if (error) throw error;
      const endLabel = newEnd
        ? (newEnd.getFullYear() >= 2099 ? "평생" : format(newEnd, "yyyy.MM.dd"))
        : "무제한";
      toast.success(`✅ ${selectedTenant.name} 저장 완료 · ${PLAN_LABELS[newPlan] ?? newPlan} · ${endLabel}`);
      setPlanDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally {
      setChangingPlan(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ["이름", "플랜", "국가", "통화", "가입일", "구독만료일", "상태"];
    const rows = filtered.map((t) => [
      t.name,
      PLAN_LABELS[t.plan ?? "free"] ?? t.plan ?? "-",
      COUNTRY_META[t.country ?? ""]?.name ?? t.country ?? "-",
      t.currency ?? "-",
      format(parseISO(t.created_at), "yyyy-MM-dd"),
      t.subscription_end ? format(parseISO(t.subscription_end), "yyyy-MM-dd") : "-",
      t.status ?? "-",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenants_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (authLoading || (isSuperAdmin && loading)) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>;
  }
  if (!isSuperAdmin) return <AccessDenied requiredTier="System Admin" />;

  // ─── 필터 ──────────────────────────────────────────────
  const filtered = tenants.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCountry !== "ALL" && t.country !== filterCountry) return false;
    if (filterPlan !== "ALL" && (t.plan ?? "free") !== filterPlan) return false;
    return true;
  });

  const countries = [...new Set(tenants.map((t) => t.country).filter(Boolean))] as string[];

  // KPI
  const byPlan = PLANS.map((p) => ({ plan: p, count: tenants.filter((t) => (t.plan ?? "free") === p).length }));
  const byCountry = Object.entries(
    tenants.reduce((acc, t) => {
      const c = t.country ?? "KR";
      acc[c] = (acc[c] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-8">
      {/* 헤더 */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">글로벌 테넌트 현황</h1>
            <p className="text-slate-500 text-sm">전체 가입 업체 {tenants.length}개 · {countries.length}개국</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} className="gap-1.5 h-9">
            <RefreshCw className="w-3.5 h-3.5" /> 새로고침
          </Button>
          <Button variant="outline" onClick={handleExportCsv} className="gap-1.5 h-9">
            <Download className="w-3.5 h-3.5" /> CSV 내보내기
          </Button>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-slate-500">전체 테넌트</span>
            </div>
            <p className="text-2xl font-black">{tenants.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500">진출 국가</span>
            </div>
            <p className="text-2xl font-black">{countries.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-violet-500" />
              <span className="text-xs text-slate-500">유료 플랜</span>
            </div>
            <p className="text-2xl font-black">{tenants.filter((t) => t.plan && t.plan !== "free").length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-slate-500">프리미엄</span>
            </div>
            <p className="text-2xl font-black">{tenants.filter((t) => t.is_premium).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* 국가별 분포 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">국가별 테넌트 TOP 5</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byCountry.map(([code, count]) => {
              const meta = COUNTRY_META[code];
              const ratio = Math.round((count / tenants.length) * 100);
              return (
                <div key={code} className="flex items-center gap-2">
                  <span className="text-base">{meta?.flag ?? "🌐"}</span>
                  <span className="text-xs font-medium w-20 shrink-0">{meta?.name ?? code}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${ratio}%` }} />
                  </div>
                  <span className="text-xs font-mono text-slate-500 w-10 text-right">{count}개</span>
                </div>
              );
            })}
            {byCountry.length === 0 && <p className="text-sm text-slate-400 text-center py-4">국가 설정 데이터 없음</p>}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">플랜별 분포</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byPlan.filter((p) => p.count > 0).map(({ plan, count }) => {
              const ratio = Math.round((count / tenants.length) * 100);
              return (
                <div key={plan} className="flex items-center gap-2">
                  <PlanBadge plan={plan} />
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${ratio}%` }} />
                  </div>
                  <span className="text-xs font-mono text-slate-500 w-10 text-right">{count}개</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* 필터 + 테이블 */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-100">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              전체 테넌트 목록 ({filtered.length}개)
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-8 h-8 text-xs w-48"
                  placeholder="업체명 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterCountry} onValueChange={(v) => setFilterCountry(v ?? "ALL")}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="국가 전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">🌐 전체 국가</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {COUNTRY_META[c]?.flag} {COUNTRY_META[c]?.name ?? c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPlan} onValueChange={(v) => setFilterPlan(v ?? "ALL")}>
                <SelectTrigger className="h-8 text-xs w-28">
                  <SelectValue placeholder="플랜" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체 플랜</SelectItem>
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>{PLAN_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">업체명</TableHead>
                  <TableHead className="text-xs">국가</TableHead>
                  <TableHead className="text-xs">플랜</TableHead>
                  <TableHead className="text-xs">통화</TableHead>
                  <TableHead className="text-xs">가입일</TableHead>
                  <TableHead className="text-xs">구독만료</TableHead>
                  <TableHead className="text-xs w-24">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                      조건에 맞는 테넌트가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => {
                    const meta = COUNTRY_META[t.country ?? ""];
                    const isExpiringSoon = t.subscription_end
                      ? new Date(t.subscription_end) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                      : false;
                    return (
                      <TableRow key={t.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-sm py-3">{t.name}</TableCell>
                        <TableCell>
                          <span className="text-base mr-1">{meta?.flag ?? "🌐"}</span>
                          <span className="text-xs text-slate-500">{meta?.name ?? (t.country ?? "-")}</span>
                        </TableCell>
                        <TableCell><PlanBadge plan={t.plan} /></TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">{t.currency ?? "-"}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {format(parseISO(t.created_at), "yyyy.MM.dd")}
                        </TableCell>
                        <TableCell>
                          {t.subscription_end ? (
                            <span className={`text-xs ${isExpiringSoon ? "text-red-500 font-bold" : "text-slate-500"}`}>
                              {format(parseISO(t.subscription_end), "yyyy.MM.dd")}
                              {isExpiringSoon && " ⚠️"}
                            </span>
                          ) : <span className="text-xs text-slate-300">-</span>}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2 gap-1"
                            onClick={() => {
                              setSelectedTenant(t);
                              setNewPlan(t.plan ?? "free");
                              setNewStatus((t.status as "active" | "suspended") ?? "active");
                              setNewEnd(t.subscription_end ? new Date(t.subscription_end) : undefined);
                              setPlanDialogOpen(true);
                            }}
                          >
                            <ExternalLink className="w-3 h-3" />
                            구독 관리
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 구독 관리 다이얼로그 */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>구독 관리 — {selectedTenant?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <p className="text-sm text-slate-500">
              현재 플랜: <PlanBadge plan={selectedTenant?.plan ?? null} />
              {selectedTenant?.subscription_end && (
                <span className="ml-2 text-xs text-slate-400">
                  · 기존 만료일 {format(parseISO(selectedTenant.subscription_end), "yyyy.MM.dd")}
                </span>
              )}
            </p>

            {/* 플랜 + 상태 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">플랜</Label>
                <Select value={newPlan} onValueChange={(v) => setNewPlan(v ?? "free")}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="새 플랜 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANS.map((p) => (
                      <SelectItem key={p} value={p}>{PLAN_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">상태</Label>
                <Select
                  value={newStatus}
                  onValueChange={(v) => setNewStatus((v as "active" | "suspended") ?? "active")}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">활성</SelectItem>
                    <SelectItem value="suspended">정지</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 만료일 빠른 연장 */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">기간 빠른 연장(현재 만료일 기준)</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => extendBy(1)}>1개월</Button>
                <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => extendBy(3)}>3개월</Button>
                <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => extendBy(6)}>6개월</Button>
                <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => extendBy(12)}>12개월</Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs border-blue-200 text-blue-700 bg-blue-50/40 hover:bg-blue-50"
                  onClick={() => extendBy("test")}
                >
                  테스트 7일
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs border-rose-200 text-rose-700 bg-rose-50/40 hover:bg-rose-50"
                  onClick={() => extendBy("expire")}
                >
                  즉시 만료
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs border-emerald-200 text-emerald-700 bg-emerald-50/40 hover:bg-emerald-50 gap-1"
                  onClick={() => extendBy("lifetime")}
                >
                  <InfinityIcon className="w-3.5 h-3.5" /> 평생
                </Button>
              </div>
            </div>

            {/* 정확한 만료일 픽커 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">만료일 직접 선택</Label>
              <div className="relative">
                <Popover>
                  <PopoverTrigger
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full justify-start text-left h-10 px-3",
                      newEnd ? "text-slate-900 font-semibold" : "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                    {newEnd
                      ? newEnd.getFullYear() >= 2099
                        ? "평생 (2099-12-31)"
                        : format(newEnd, "yyyy년 MM월 dd일")
                      : "무제한 (만료일 없음)"}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" initialFocus={false}>
                    <Calendar
                      mode="single"
                      selected={newEnd}
                      onSelect={setNewEnd}
                    />
                  </PopoverContent>
                </Popover>
                {newEnd && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    onClick={() => setNewEnd(undefined)}
                    aria-label="만료일 지우기"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 요약 패널 */}
            {newEnd ? (
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span className="text-emerald-700 text-xs font-medium">변경 후 만료일</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-900 font-bold text-sm">
                    {newEnd.getFullYear() >= 2099
                      ? "평생"
                      : format(newEnd, "yyyy.MM.dd")}
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 flex items-center justify-between">
                <span className="text-amber-700 text-xs font-medium">변경 후 만료일</span>
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <span>무제한</span>
                  <AlertCircle className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlanDialogOpen(false)}>취소</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSaveSubscription}
              disabled={changingPlan || !newPlan}
            >
              {changingPlan ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
