"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  TrendingUp,
  Globe,
  Bell,
  CheckCircle2,
  BarChart3,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { getRegionalIntegrations } from "@/lib/regional-integrations";

// ─── 타입 ────────────────────────────────────────────────
type RequestRow = {
  country_code: string;
  platform: string;
  request_count: number;
  last_requested_at: string;
};

type TenantRow = { id: string; name: string };

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
};

const CATEGORY_LABELS: Record<string, string> = {
  delivery: "🚚 배달",
  messaging: "💬 메신저",
  ecommerce: "🛒 쇼핑몰",
};

// platform slug → label 역방향 조회
function getPlatformLabel(platform: string, countryCode: string): string {
  const config = getRegionalIntegrations(countryCode);
  const all = [...config.delivery, ...config.messaging, ...config.ecommerce];
  return all.find((a) => a.platform === platform)?.label ?? platform;
}

function getPlatformCategory(platform: string, countryCode: string): string {
  const config = getRegionalIntegrations(countryCode);
  if (config.delivery.some((a) => a.platform === platform)) return "delivery";
  if (config.messaging.some((a) => a.platform === platform)) return "messaging";
  if (config.ecommerce.some((a) => a.platform === platform)) return "ecommerce";
  return "기타";
}

// ─── 히트맵 셀 색상 ──────────────────────────────────────
function heatColor(count: number, max: number): string {
  if (max === 0 || count === 0) return "bg-slate-100 text-slate-400";
  const ratio = count / max;
  if (ratio >= 0.75) return "bg-violet-600 text-white font-bold";
  if (ratio >= 0.5) return "bg-violet-400 text-white font-bold";
  if (ratio >= 0.25) return "bg-violet-200 text-violet-800 font-semibold";
  return "bg-violet-50 text-violet-600";
}

// ─── 메인 페이지 ─────────────────────────────────────────
export default function RegionalDemandPage() {
  const supabase = createClient();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();

  const [rows, setRows] = useState<RequestRow[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCountry, setFilterCountry] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [activatingPlatform, setActivatingPlatform] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_integration_demand");
      if (error) {
        // rpc 없으면 직접 쿼리
        const { data: raw } = await supabase
          .from("integration_notify_requests")
          .select("country_code, platform, requested_at");
        // 클라이언트 사이드 집계
        const map: Record<string, RequestRow> = {};
        for (const r of raw ?? []) {
          const key = `${r.country_code}::${r.platform}`;
          if (!map[key]) {
            map[key] = { country_code: r.country_code, platform: r.platform, request_count: 0, last_requested_at: r.requested_at };
          }
          map[key].request_count++;
          if (r.requested_at > map[key].last_requested_at) map[key].last_requested_at = r.requested_at;
        }
        setRows(Object.values(map).sort((a, b) => b.request_count - a.request_count));
      } else {
        setRows(data ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isSuperAdmin) load();
    else if (!authLoading && !isSuperAdmin) setLoading(false);
  }, [authLoading, isSuperAdmin]);

  const handleActivate = async (platform: string, countryCode: string) => {
    setActivatingPlatform(platform);
    try {
      // platform_config에 활성화 기록 저장
      await supabase.from("platform_config").upsert(
        {
          key: `regional_active_${platform}`,
          value: { status: "active", country_code: countryCode, activated_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      toast.success(`✅ ${getPlatformLabel(platform, countryCode)} 개발 시작 등록 완료!`, {
        description: "regional-integrations.ts에서 status를 active로 변경 후 배포하세요.",
      });
    } catch (e: any) {
      toast.error("오류 발생: " + e.message);
    } finally {
      setActivatingPlatform(null);
    }
  };

  if (authLoading || (isSuperAdmin && loading)) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }
  if (!isSuperAdmin) return <AccessDenied requiredTier="System Admin" />;

  // ─── 필터 적용 ─────────────────────────────────────────
  const filtered = rows.filter((r) => {
    if (filterCountry !== "ALL" && r.country_code !== filterCountry) return false;
    if (filterCategory !== "ALL" && getPlatformCategory(r.platform, r.country_code) !== filterCategory) return false;
    return true;
  });

  const maxCount = Math.max(...filtered.map((r) => r.request_count), 1);
  const countries = [...new Set(rows.map((r) => r.country_code))];
  const top10 = [...rows].sort((a, b) => b.request_count - a.request_count).slice(0, 10);
  const totalRequests = rows.reduce((s, r) => s + r.request_count, 0);
  const uniqueCountries = new Set(rows.map((r) => r.country_code)).size;
  const uniquePlatforms = new Set(rows.map((r) => r.platform)).size;

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8">
      {/* 헤더 */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">연동 앱 수요 분석</h1>
          </div>
          <p className="text-slate-500 text-sm ml-13">
            사용자들이 "알림 받기"를 클릭한 앱 데이터를 기반으로 개발 우선순위를 결정하세요
          </p>
        </div>
        <Button variant="outline" onClick={load} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          새로고침
        </Button>
      </div>

      {/* KPI 카드 3개 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "총 알림 신청 수", value: totalRequests, icon: Bell, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "신청 국가 수", value: uniqueCountries, icon: Globe, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "관심 앱 종류", value: uniquePlatforms, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm ring-1 ring-slate-100">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-black">{kpi.value}</p>
                  <p className="text-xs text-slate-500">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 데이터 없을 때 */}
      {rows.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-20 flex flex-col items-center gap-3 text-slate-400">
            <Bell className="w-12 h-12 opacity-30" />
            <p className="font-semibold">아직 알림 신청 데이터가 없습니다</p>
            <p className="text-xs text-center max-w-xs">
              사용자들이 설정 &gt; 연동 탭에서 "알림 받기"를 클릭하면 이 화면에 데이터가 쌓입니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* TOP 10 랭킹 */}
          <Card className="border-0 shadow-sm ring-1 ring-amber-100 bg-amber-50/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="w-4 h-4 text-amber-500" />
                TOP 10 가장 많이 요청된 연동 앱
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {top10.map((r, i) => (
                  <div key={`${r.country_code}-${r.platform}`} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-100">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-lg">{COUNTRY_META[r.country_code]?.flag ?? "🌐"}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-sm">{getPlatformLabel(r.platform, r.country_code)}</span>
                      <span className="text-xs text-slate-400 ml-2">{COUNTRY_META[r.country_code]?.name ?? r.country_code}</span>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs shrink-0">{r.request_count}건</Badge>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-violet-600 hover:bg-violet-700 shrink-0 gap-1"
                      onClick={() => handleActivate(r.platform, r.country_code)}
                      disabled={activatingPlatform === r.platform}
                    >
                      {activatingPlatform === r.platform
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <CheckCircle2 className="w-3 h-3" />}
                      개발 시작
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 필터 + 히트맵 테이블 */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-100">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-500" />
                  국가 × 앱 요청 히트맵
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={filterCountry} onValueChange={setFilterCountry}>
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
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-8 text-xs w-32">
                      <SelectValue placeholder="카테고리" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">전체</SelectItem>
                      <SelectItem value="delivery">🚚 배달</SelectItem>
                      <SelectItem value="messaging">💬 메신저</SelectItem>
                      <SelectItem value="ecommerce">🛒 쇼핑몰</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">선택한 조건에 해당하는 데이터가 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-3 text-xs font-bold text-slate-500 uppercase">국가</th>
                        <th className="text-left py-3 px-3 text-xs font-bold text-slate-500 uppercase">앱</th>
                        <th className="text-left py-3 px-3 text-xs font-bold text-slate-500 uppercase">카테고리</th>
                        <th className="text-center py-3 px-3 text-xs font-bold text-slate-500 uppercase">요청 수</th>
                        <th className="text-left py-3 px-3 text-xs font-bold text-slate-500 uppercase">최근 요청</th>
                        <th className="py-3 px-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => {
                        const cat = getPlatformCategory(r.platform, r.country_code);
                        const label = getPlatformLabel(r.platform, r.country_code);
                        const meta = COUNTRY_META[r.country_code];
                        return (
                          <tr key={`${r.country_code}-${r.platform}`} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="py-3 px-3">
                              <span className="mr-1.5">{meta?.flag ?? "🌐"}</span>
                              <span className="font-medium">{meta?.name ?? r.country_code}</span>
                            </td>
                            <td className="py-3 px-3 font-semibold">{label}</td>
                            <td className="py-3 px-3">
                              <span className="text-xs text-slate-500">{CATEGORY_LABELS[cat] ?? cat}</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-7 rounded-full text-sm px-2 ${heatColor(r.request_count, maxCount)}`}>
                                {r.request_count}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-xs text-slate-400">
                              {new Date(r.last_requested_at).toLocaleDateString("ko-KR")}
                            </td>
                            <td className="py-3 px-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-violet-200 text-violet-700 hover:bg-violet-50 gap-1"
                                onClick={() => handleActivate(r.platform, r.country_code)}
                                disabled={activatingPlatform === r.platform}
                              >
                                {activatingPlatform === r.platform
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <CheckCircle2 className="w-3 h-3" />}
                                개발 시작
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
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
