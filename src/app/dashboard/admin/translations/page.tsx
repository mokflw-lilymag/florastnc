"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Search, Languages, CheckCircle2, Save, AlertCircle, RefreshCw } from "lucide-react";

// ─── 지원 언어 목록 ──────────────────────────────────────
const LOCALES = [
  { code: "ko", label: "🇰🇷 한국어", file: "ko.json" },
  { code: "en", label: "🇺🇸 English", file: "en.json" },
  { code: "vi", label: "🇻🇳 Tiếng Việt", file: "vi.json" },
  { code: "ja", label: "🇯🇵 日本語", file: "ja.json" },
  { code: "zh", label: "🇨🇳 中文", file: "zh.json" },
  { code: "es", label: "🇪🇸 Español", file: "es.json" },
  { code: "pt", label: "🇧🇷 Português", file: "pt.json" },
  { code: "fr", label: "🇫🇷 Français", file: "fr.json" },
  { code: "de", label: "🇩🇪 Deutsch", file: "de.json" },
  { code: "ru", label: "🇷🇺 Русский", file: "ru.json" },
  { code: "id", label: "🇮🇩 Bahasa Indonesia", file: null },
  { code: "ms", label: "🇲🇾 Bahasa Melayu", file: null },
  { code: "th", label: "🇹🇭 ภาษาไทย", file: null },
];

type TranslationEntry = {
  key: string;
  translations: Record<string, string>;
  isSuspect: boolean; // 기계번역 의심 (영어와 동일한 경우)
};

export default function TranslationsAdminPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth();

  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "suspect">("all");
  const [editMap, setEditMap] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Record<string, number>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      // ko.json을 기준으로 키 목록 로드 (API 라우트 활용)
      const res = await fetch("/api/admin/translations?action=list");
      if (!res.ok) throw new Error("API 응답 오류");
      const data = await res.json();
      setEntries(data.entries ?? []);
      setCoverage(data.coverage ?? {});
    } catch (e) {
      // API가 아직 없으면 빈 상태로 안내
      setEntries([]);
      setCoverage({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isSuperAdmin) loadData();
    else if (!authLoading && !isSuperAdmin) setLoading(false);
  }, [authLoading, isSuperAdmin]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterMode === "suspect" && !e.isSuspect) return false;
      if (search && !e.key.includes(search) && !Object.values(e.translations).some((v) => v.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [entries, search, filterMode]);

  const handleEdit = (key: string, locale: string, value: string) => {
    setEditMap((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [locale]: value },
    }));
  };

  const handleSave = async (key: string) => {
    const changes = editMap[key];
    if (!changes) return;
    setSaving(key);
    try {
      const res = await fetch("/api/admin/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, changes }),
      });
      if (!res.ok) throw new Error("저장 실패");
      toast.success(`✅ "${key}" 번역 저장 완료`);
      setEditMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      loadData();
    } catch (e: any) {
      toast.error("저장 오류: " + e.message);
    } finally {
      setSaving(null);
    }
  };

  if (authLoading || (isSuperAdmin && loading)) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>;
  }
  if (!isSuperAdmin) return <AccessDenied requiredTier="System Admin" />;

  // 지원 언어 중 파일이 있는 것만 커버리지 표시
  const availableLocales = LOCALES.filter((l) => l.file !== null);

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-8">
      {/* 헤더 */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow">
            <Languages className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">다국어 번역 관리</h1>
            <p className="text-slate-500 text-sm">번역 키를 검색하고 나라별 번역문을 직접 수정합니다</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData} className="gap-1.5 h-9">
          <RefreshCw className="w-3.5 h-3.5" /> 새로고침
        </Button>
      </div>

      {/* 언어별 커버리지 */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-100">
        <CardHeader><CardTitle className="text-sm">언어별 번역 커버리지</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {LOCALES.map((l) => {
              const pct = coverage[l.code] ?? (l.file ? 100 : 0);
              const isNew = !l.file;
              return (
                <div key={l.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{l.label}</span>
                    <span className={`font-bold ${pct === 100 ? "text-emerald-600" : pct > 70 ? "text-amber-600" : "text-red-500"}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full">
                    <div
                      className={`h-1.5 rounded-full ${pct === 100 ? "bg-emerald-500" : pct > 70 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {isNew && <Badge className="text-[9px] h-3.5 px-1 bg-violet-100 text-violet-700 border-0">SEA 신규</Badge>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 검색 + 필터 */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="번역 키 또는 번역문 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={filterMode === "all" ? "default" : "outline"}
          className="h-9 text-xs"
          onClick={() => setFilterMode("all")}
        >
          전체 ({entries.length})
        </Button>
        <Button
          variant={filterMode === "suspect" ? "default" : "outline"}
          className="h-9 text-xs gap-1 text-amber-700 border-amber-300"
          onClick={() => setFilterMode("suspect")}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          기계번역 의심 ({entries.filter((e) => e.isSuspect).length})
        </Button>
      </div>

      {/* 번역 에디터가 API 없이 구동될 때 안내 배너 */}
      {entries.length === 0 && !loading && (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-slate-400">
            <Languages className="w-12 h-12 opacity-30" />
            <div className="text-center space-y-1">
              <p className="font-semibold">번역 데이터를 불러오려면 API 라우트가 필요합니다</p>
              <p className="text-xs max-w-sm text-center">
                <code className="bg-slate-100 px-1 rounded text-slate-600">/api/admin/translations</code> 라우트를 생성하면<br />
                JSON 번역 파일을 읽고 수정할 수 있습니다.
              </p>
            </div>
            <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">TASK-05 API 라우트 구현 예정</Badge>
          </CardContent>
        </Card>
      )}

      {/* 번역 키 목록 */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.slice(0, 50).map((entry) => {
            const isEdited = !!editMap[entry.key];
            return (
              <Card key={entry.key} className={`border-0 shadow-sm ring-1 ${entry.isSuspect ? "ring-amber-200 bg-amber-50/20" : "ring-slate-100"} overflow-hidden`}>
                <CardHeader className="py-3 px-4 bg-slate-50/80 border-b border-slate-100 flex-row items-center gap-2">
                  <code className="text-xs font-mono text-slate-600 font-bold">{entry.key}</code>
                  {entry.isSuspect && (
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] h-4 gap-0.5">
                      <AlertCircle className="w-2.5 h-2.5" />기계번역 의심
                    </Badge>
                  )}
                  {isEdited && (
                    <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] h-4 ml-auto">수정됨</Badge>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {availableLocales.map((l) => {
                      const original = entry.translations[l.code] ?? "";
                      const current = editMap[entry.key]?.[l.code] ?? original;
                      const changed = current !== original;
                      return (
                        <div key={l.code} className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            {l.label}
                            {changed && <CheckCircle2 className="w-2.5 h-2.5 text-blue-500" />}
                          </label>
                          <Textarea
                            className={`text-xs resize-none h-16 ${changed ? "ring-1 ring-blue-300 bg-blue-50/30" : ""}`}
                            value={current}
                            onChange={(e) => handleEdit(entry.key, l.code, e.target.value)}
                            placeholder={`${l.label} 번역...`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {isEdited && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white gap-1"
                        onClick={() => handleSave(entry.key)}
                        disabled={saving === entry.key}
                      >
                        {saving === entry.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        변경사항 저장
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filtered.length > 50 && (
            <p className="text-center text-sm text-slate-400 py-2">검색을 통해 결과를 좁혀주세요 (상위 50개 표시 중)</p>
          )}
        </div>
      )}
    </div>
  );
}
