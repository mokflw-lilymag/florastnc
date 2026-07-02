"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, Package, Plus, RefreshCw, Send, Layers, Settings, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HqCatalogSection } from "@/components/hq/hq-catalog-section";
import { CategoryManagerCard } from "@/components/settings/category-manager-card";
import {
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_MATERIAL_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
} from "@/lib/category-defaults";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/getMessages";
import { pickUiText } from "@/i18n/pick-ui-text";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function HqSharedProductsPage() {
  const router = useRouter();
  const { profile, isLoading: authLoading, isSuperAdmin } = useAuth();
  const [ctxLoading, setCtxLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [canManage, setCanManage] = useState(false);
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);

  // 다국어 픽커 헬퍼
  const L = (
    ko: string,
    en: string,
    vi?: string
  ) => pickUiText(baseLocale, ko, en, vi);

  // 1. 자재 관리 상태
  const [materials, setMaterials] = useState<any[]>([]);
  const [matLoading, setMatLoading] = useState(false);
  const [newMatName, setNewMatName] = useState("");
  const [newMatUnit, setNewMatUnit] = useState("개");
  const [newMatMemo, setNewMatMemo] = useState("");
  const [matSearch, setMatSearch] = useState("");
  const [matPage, setMatPage] = useState(1);
  const itemsPerPage = 15;
  const [addMatMain, setAddMatMain] = useState("");
  const [addMatMid, setAddMatMid] = useState("");

  // 2. 카테고리 관리 상태 (기존 환경설정 데이터 구조 3종 세트)
  const [prodCategories, setProdCategories] = useState<any | null>(null);
  const [matCategories, setMatCategories] = useState<any | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<any | null>(null);
  const [catLoading, setCatLoading] = useState(false);

  // 3. 배포(Sync) 액션 상태
  const [syncing, setSyncing] = useState(false);

  // 자재 대/중분류 드롭다운용 자동 초기 세팅
  useEffect(() => {
    if (matCategories && matCategories.main && matCategories.main.length > 0 && !addMatMain) {
      const firstMain = matCategories.main[0];
      setAddMatMain(firstMain);
      const mids = matCategories.mid[firstMain] || [];
      if (mids.length > 0) {
        setAddMatMid(mids[0]);
      }
    }
  }, [matCategories, addMatMain]);

  const handleAddMatMainChange = (mainVal: string) => {
    setAddMatMain(mainVal);
    const mids = matCategories ? (matCategories.mid[mainVal] || []) : [];
    setAddMatMid(mids.length > 0 ? mids[0] : "");
  };

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      setCtxLoading(true);
      setForbidden(false);
      try {
        const res = await fetch(
          `/api/hq/compose-context?uiLocale=${encodeURIComponent(locale)}`,
          { credentials: "include" }
        );
        if (res.status === 401) {
          if (!cancelled) setForbidden(true);
          return;
        }
        if (!res.ok) {
          if (!cancelled) setForbidden(true);
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          setOrganizations(json.organizations ?? []);
          setCanManage(json.canManageAnnouncements === true);
        }
      } catch {
        if (!cancelled) setForbidden(true);
      } finally {
        if (!cancelled) setCtxLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, locale]);

  // 자재 데이터 조회
  const fetchMaterials = async () => {
    setMatLoading(true);
    try {
      const res = await fetch("/api/hq/materials", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setMaterials(json.materials || []);
      }
    } catch (e) {
      console.error("Failed to load materials:", e);
    } finally {
      setMatLoading(false);
    }
  };

  // 카테고리 데이터 조회 (본사 환경설정 system_settings 로드)
  const fetchCategories = async () => {
    setCatLoading(true);
    try {
      const res = await fetch("/api/hq/categories", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setProdCategories(json.productCategories || null);
        setMatCategories(json.materialCategories || null);
        setExpenseCategories(json.expenseCategories || null);
      }
    } catch (e) {
      console.error("Failed to load categories:", e);
    } finally {
      setCatLoading(false);
    }
  };

  // 탭 클릭 전환 시 데이터 자동 장착
  useEffect(() => {
    if (!forbidden && organizations.length > 0) {
      fetchMaterials();
      fetchCategories();
    }
  }, [forbidden, organizations]);

  // 자재 등록 처리
  const handleAddMaterial = async () => {
    const name = newMatName.trim();
    if (!name) {
      toast.error(L("자재명을 입력해 주세요.", "Enter material name."));
      return;
    }

    try {
      const res = await fetch("/api/hq/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          unit: newMatUnit,
          memo: newMatMemo,
          mainCategory: addMatMain || "기타",
          midCategory: addMatMid || "기타",
        }),
      });
      if (res.ok) {
        toast.success(L("새 자재가 본사 마스터에 등록되었습니다.", "New material registered successfully."));
        setNewMatName("");
        setNewMatMemo("");
        fetchMaterials();
      } else {
        const err = await res.json();
        toast.error(err.error || L("자재 등록 실패", "Failed to register material."));
      }
    } catch (e) {
      toast.error(L("오류가 발생했습니다.", "Error occurred."));
    }
  };

  // 카테고리 저장 처리 (기존 CategoryManagerCard 인터페이스 대응)
  const handleSaveCategory = async (type: "product" | "material" | "expense", data: any) => {
    try {
      const res = await fetch("/api/hq/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryType: type, data }),
      });
      if (res.ok) {
        toast.success(L("본사 마스터 카테고리가 안전하게 저장되었습니다.", "HQ master categories saved successfully."));
        fetchCategories();
      } else {
        const err = await res.json();
        toast.error(err.error || L("카테고리 저장 실패", "Failed to save categories."));
      }
    } catch (e) {
      toast.error(L("오류가 발생했습니다.", "Error occurred."));
    }
  };

  // 전 지점 데이터 배포(Sync) 처리
  const handleSyncMasterSeed = async () => {
    const confirm = window.confirm(
      L(
        "⚠️ 전 지점 동기화 경고\n\n본사에서 설정한 모든 카테고리 분류와 자재 목록을 전체 하위 지점에 강제로 밀어넣어 동기화합니다.\n기존에 지점에서 쓰던 카테고리와 자재 목록이 덮어쓰여집니다. 진행하시겠습니까?",
        "⚠️ Sync Warning\n\nSync all categories and materials from HQ to all branches.\nThis will overwrite branch settings. Proceed?"
      )
    );
    if (!confirm) return;

    setSyncing(true);
    try {
      const res = await fetch("/api/hq/sync-master-seed", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        const successCount = json.results?.filter((r: any) => r.success).length || 0;
        toast.success(
          L(
            `성공적으로 ${successCount}개 지점에 표준 데이터를 일괄 배포 완료했습니다.`,
            `Successfully deployed standard seed data to ${successCount} branches.`
          )
        );
      } else {
        toast.error(L("지점 일괄 배포 중 오류가 발생했습니다.", "Failed to sync branches."));
      }
    } catch (e) {
      toast.error(L("통신 중 오류가 발생했습니다.", "Network error."));
    } finally {
      setSyncing(false);
    }
  };

  // 자재 검색 필터 및 페이지네이션 계산
  const filteredMaterials = useMemo(() => {
    const search = matSearch.trim().toLowerCase();
    if (!search) return materials;
    return materials.filter(
      (m) =>
        m.name?.toLowerCase().includes(search) ||
        m.memo?.toLowerCase().includes(search)
    );
  }, [materials, matSearch]);

  const paginatedMaterials = useMemo(() => {
    const start = (matPage - 1) * itemsPerPage;
    return filteredMaterials.slice(start, start + itemsPerPage);
  }, [filteredMaterials, matPage]);

  const totalMatPages = Math.ceil(filteredMaterials.length / itemsPerPage);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  if (ctxLoading) {
    return (
      <div className="max-w-none p-6 space-y-8">
        <PageHeader
          title="공동상품/자재/카테고리관리"
          description={tf.f01853}
          icon={Package}
        />
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (forbidden || (!isSuperAdmin && organizations.length === 0)) {
    return (
      <div className="max-w-none p-6 space-y-6">
        <PageHeader
          title="공동상품/자재/카테고리관리"
          description={tf.f01832}
          icon={Package}
        />
        <Card className="max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>{tf.f01688}</CardTitle>
            <CardDescription>
              {tf.f01849}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/dashboard/hq")}>
              {tf.f01264}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-none p-6 space-y-8 animate-in fade-in duration-500">
      {/* 최상단 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <PageHeader
            title="공동상품/자재/카테고리관리"
            description="본사 표준 공동 상품 카탈로그, 매입 자재 마스터, 카테고리 분류 체계를 관제합니다."
            icon={Package}
          />
        </div>
        <Button
          onClick={handleSyncMasterSeed}
          disabled={syncing}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 py-5 shadow-lg shadow-indigo-100 flex items-center gap-2 border-none transition-all active:scale-95"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider">
            {syncing ? L("전 지점 동기화 배포 중...", "Syncing Branches...") : L("⚡ 전 지점에 표준 데이터 배포", "⚡ Push Seeds to Branches")}
          </span>
        </Button>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="bg-slate-100/80 p-1.5 rounded-2xl w-fit flex gap-1 mb-6 border border-slate-200/50">
          <TabsTrigger value="products" className="rounded-xl text-xs px-5 py-2 font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 shadow-sm data-[state=active]:shadow-indigo-50/50">
            📦 {L("공동상품 관리", "Shared Products")}
          </TabsTrigger>
          <TabsTrigger value="materials" className="rounded-xl text-xs px-5 py-2 font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 shadow-sm data-[state=active]:shadow-indigo-50/50">
            🌿 {L("자재 마스터 관리", "Material Master")}
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl text-xs px-5 py-2 font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 shadow-sm data-[state=active]:shadow-indigo-50/50">
            🗂️ {L("카테고리 분류 관리", "Categories")}
          </TabsTrigger>
        </TabsList>

        {/* 탭 1: 공동상품 관리 */}
        <TabsContent value="products" className="outline-none space-y-6">
          <p className="text-xs text-muted-foreground bg-slate-50 border border-slate-100 rounded-2xl p-4 leading-relaxed">
            {tf.f00957}{" "}
            <Link href="/dashboard/org-board" className="text-indigo-600 font-bold underline underline-offset-4">
              {tf.f01266}
            </Link>
            {tf.f01549}
          </p>
          <HqCatalogSection orgNames={organizations} canManage={canManage} />
        </TabsContent>

        {/* 탭 2: 자재 마스터 관리 */}
        <TabsContent value="materials" className="outline-none space-y-6">
          <Card className="border-none shadow-sm rounded-3xl border border-slate-100 bg-white">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-50 gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  {L("본사 자재 마스터 관리", "HQ Material Master")}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {L("본사 표준 매입 자재를 등록하고 관리하며, 전 지점 배포를 위한 기초 데이터로 활용합니다.", "Manage HQ materials for branch synchronization.")}
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0" onClick={fetchMaterials} disabled={matLoading}>
                <RefreshCw className={`h-3.5 w-3.5 ${matLoading ? "animate-spin" : ""}`} />
                {L("새로고침", "Refresh")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* 수동 개별 등록 (공동상품 관리와 완벽히 통일된 폼 스타일) */}
              <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {L("수동 개별 등록", "Manual Individual Add")}
                </p>
                <div className="grid gap-3 grid-cols-1 md:grid-cols-6 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{L("자재명", "Material Name")}</label>
                    <Input
                      placeholder={L("예: 미니 거베라", "e.g. Mini Gerbera")}
                      value={newMatName}
                      onChange={(e) => setNewMatName(e.target.value)}
                      className="rounded-xl text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{L("대분류", "Main Category")}</label>
                    <select
                      value={addMatMain}
                      onChange={(e) => handleAddMatMainChange(e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {matCategories && matCategories.main && matCategories.main.map((main: string) => (
                        <option key={main} value={main}>{main}</option>
                      ))}
                      {(!matCategories || !matCategories.main || matCategories.main.length === 0) && (
                        <option value="기타">기타</option>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{L("중분류", "Sub Category")}</label>
                    <select
                      value={addMatMid}
                      onChange={(e) => setAddMatMid(e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {matCategories && (matCategories.mid[addMatMain] || []).map((sub: string) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      {(!matCategories || !addMatMain || (matCategories.mid[addMatMain] || []).length === 0) && (
                        <option value="기타">기타</option>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{L("단위", "Unit")}</label>
                    <select
                      value={newMatUnit}
                      onChange={(e) => setNewMatUnit(e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="개">개 (pcs)</option>
                      <option value="단">단 (bunch)</option>
                      <option value="속">속</option>
                      <option value="박스">박스 (box)</option>
                      <option value="롤">롤 (roll)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{L("메모 (선택)", "Memo")}</label>
                    <Input
                      placeholder={L("설명이나 특징", "Description")}
                      value={newMatMemo}
                      onChange={(e) => setNewMatMemo(e.target.value)}
                      className="rounded-xl text-xs bg-white"
                    />
                  </div>
                  <Button
                    onClick={handleAddMaterial}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs py-2 h-9 font-bold transition-all border-none"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {L("자재 추가", "Add Material")}
                  </Button>
                </div>
              </div>

              {/* 검색 및 목록 테이블 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">{L("자재 목록", "Material List")}</span>
                  <Input
                    placeholder={L("자재명 또는 메모 검색...", "Search materials...")}
                    value={matSearch}
                    onChange={(e) => {
                      setMatSearch(e.target.value);
                      setMatPage(1);
                    }}
                    className="w-full md:w-60 rounded-xl text-xs shadow-inner bg-slate-50 border-slate-100 focus:bg-white"
                  />
                </div>

                {matLoading ? (
                  <div className="py-20 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                          <TableHead className="font-bold text-[11px] text-slate-500 px-6 w-1/4">{L("자재명", "Name")}</TableHead>
                          <TableHead className="font-bold text-[11px] text-slate-500 w-1/6">{L("대분류", "Main Cat")}</TableHead>
                          <TableHead className="font-bold text-[11px] text-slate-500 w-1/6">{L("중분류", "Sub Cat")}</TableHead>
                          <TableHead className="font-bold text-[11px] text-slate-500 w-1/12">{L("단위", "Unit")}</TableHead>
                          <TableHead className="font-bold text-[11px] text-slate-500 w-1/4">{L("메모", "Memo")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedMaterials.map((m) => (
                          <TableRow key={m.id} className="hover:bg-slate-50/30 border-b border-slate-50/50">
                            <TableCell className="px-6 py-3.5 text-xs font-bold text-slate-800">{m.name}</TableCell>
                            <TableCell className="text-xs text-slate-600 font-bold">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px]">{m.main_category || "—"}</span>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 font-medium">{m.mid_category || "—"}</TableCell>
                            <TableCell className="text-xs text-slate-500 font-medium">{m.unit}</TableCell>
                            <TableCell className="text-xs text-slate-400 font-light">{m.memo || "—"}</TableCell>
                          </TableRow>
                        ))}
                        {filteredMaterials.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="h-40 text-center text-slate-400 text-xs font-light">
                              {L("등록된 자재가 없거나 검색 결과가 없습니다.", "No materials found.")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    {/* 페이지네이션 */}
                    {totalMatPages > 1 && (
                      <div className="flex justify-between items-center px-6 py-4 border-t border-slate-50 bg-slate-50/10">
                        <span className="text-[10px] text-slate-400 font-medium">
                          Showing {paginatedMaterials.length} of {filteredMaterials.length} materials
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={matPage === 1}
                            onClick={() => setMatPage((p) => Math.max(1, p - 1))}
                            className="text-[11px] font-bold rounded-xl h-8 px-3 border-slate-200"
                          >
                            {L("이전", "Prev")}
                          </Button>
                          <span className="text-[11px] text-slate-600 font-bold px-3 py-1.5 bg-slate-100 rounded-xl">
                            {matPage} / {totalMatPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={matPage === totalMatPages}
                            onClick={() => setMatPage((p) => Math.min(totalMatPages, p + 1))}
                            className="text-[11px] font-bold rounded-xl h-8 px-3 border-slate-200"
                          >
                            {L("다음", "Next")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 탭 3: 카테고리 분류 관리 (기존 카테고리 설정 카드 이식) */}
        <TabsContent value="categories" className="outline-none space-y-6">
          <Tabs defaultValue="products" className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList className="bg-slate-100/50 p-1 rounded-2xl h-11 border border-slate-200/50">
                <TabsTrigger value="products" className="rounded-xl text-xs px-6 py-1.5 font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  📦 {L("상품 분류", "Products")}
                </TabsTrigger>
                <TabsTrigger value="materials" className="rounded-xl text-xs px-6 py-1.5 font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600">
                  🌿 {L("자재 분류", "Materials")}
                </TabsTrigger>
                <TabsTrigger value="expenses" className="rounded-xl text-xs px-6 py-1.5 font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-600">
                  💵 {L("지출 분류", "Expenses")}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="products" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CategoryManagerCard
                title={L("상품 카테고리 관리", "Product Categories")}
                description={L("본사에서 유통하는 상품의 1차 대분류 및 2차 중분류 체계를 구성합니다.", "Manage product categories.")}
                icon={Package}
                initialData={prodCategories}
                defaultData={DEFAULT_PRODUCT_CATEGORIES}
                onSave={(data) => handleSaveCategory("product", data)}
                colorScheme="blue"
                isLoading={catLoading}
              />
            </TabsContent>

            <TabsContent value="materials" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CategoryManagerCard
                title={L("자재 카테고리 관리", "Material Categories")}
                description={L("본사 매입 자재의 대분류 및 중분류 분류 체계를 구성합니다.", "Manage material categories.")}
                icon={Layers}
                initialData={matCategories}
                defaultData={DEFAULT_MATERIAL_CATEGORIES}
                onSave={(data) => handleSaveCategory("material", data)}
                colorScheme="orange"
                isLoading={catLoading}
              />
            </TabsContent>

            <TabsContent value="expenses" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CategoryManagerCard
                title={L("지출 카테고리 관리", "Expense Categories")}
                description={L("다매장 간편 지출 장부 정리를 위한 10대 고정 분류 체계를 관리합니다.", "Manage expense categories.")}
                icon={Settings}
                initialData={expenseCategories}
                defaultData={DEFAULT_EXPENSE_CATEGORIES}
                onSave={(data) => handleSaveCategory("expense", data)}
                colorScheme="green"
                isLoading={catLoading}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
