"use client";

import { getMessages } from "@/i18n/getMessages";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfMonth, parseISO } from "date-fns";
import { Loader2, PieChart, Receipt, RefreshCw, Pencil, Trash2, SlidersHorizontal, TrendingDown, TrendingUp, Layers, Wallet, Building2, ShoppingBag, ArrowRight, Activity, Calendar, ShieldAlert } from "lucide-react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { HQ_EXPENSE_CATEGORY_FALLBACK } from "@/lib/hq/expense-constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CategoryStat = {
  category: string;
  amount: number;
  count: number;
  percent: number;
  lastYearAmount?: number;
};

type CategoryRow = { category: string; amount: number; count: number };

type TrendBucket = {
  tenant_id: string;
  timeLabel: string;
  materials: number;
  utilities: number;
  rent: number;
  labor: number;
  marketing: number;
  etc: number;
};

type ThreeYearBranchCategoryStat = {
  tenant_id: string;
  category: string;
  amount2024: number;
  amount2025: number;
  amount2026: number;
};

type ThreeYearCategoryStat = {
  category: string;
  amount2024: number;
  amount2025: number;
  amount2026: number;
};

type TopMaterial = { name: string; amount: number; percent: number };

type BranchAgg = {
  id: string;
  name: string;
  organization_id: string | null;
  plan: string | null;
  expenseCount: number;
  totalAmount: number;
  lastYearTotal: number;
  lastYearMaterialTotal: number;
  categoryRows: CategoryRow[];
  topMaterials: TopMaterial[];
};

type RecentLine = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  amount: number;
  category: string;
  expense_date: string;
  description: string;
  payment_method: string;
};

export default function HqBranchExpensesPage() {
  const router = useRouter();
  const { profile, isLoading: authLoading } = useAuth();
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchAgg[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [range, setRange] = useState({ from: "", to: "" });
  const [grandTotal, setGrandTotal] = useState(0);
  const [grandCount, setGrandCount] = useState(0);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [threeYearCategoryStats, setThreeYearCategoryStats] = useState<ThreeYearCategoryStat[]>([]);
  const [threeYearCategoryMonthlyStats, setThreeYearCategoryMonthlyStats] = useState<ThreeYearCategoryStat[]>([]);
  const [threeYearBranchCategoryStats, setThreeYearBranchCategoryStats] = useState<ThreeYearBranchCategoryStat[]>([]);
  const [threeYearBranchCategoryMonthlyStats, setThreeYearBranchCategoryMonthlyStats] = useState<ThreeYearBranchCategoryStat[]>([]);
  const [trendDataList, setTrendDataList] = useState<TrendBucket[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");
  const [selectedCompareCategory, setSelectedCompareCategory] = useState<string>("materials");
  const [targetMonthLabel, setTargetMonthLabel] = useState("6월");
  const [threeYearTab, setThreeYearTab] = useState<"yearly" | "monthly">("yearly");
  const [recentLines, setRecentLines] = useState<RecentLine[]>([]);
  const [globalTopMaterials, setGlobalTopMaterials] = useState<TopMaterial[]>([]);
  const [lastYearGrandTotal, setLastYearGrandTotal] = useState(0);
  const [lastYearTopMaterials, setLastYearTopMaterials] = useState<TopMaterial[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const amountSuffix = tf.f00487;

  // 본사 카테고리 구성 (수정 시 셀렉터 바인딩용)
  const [hqExpenseCategories, setHqExpenseCategories] = useState<any | null>(null);

  // 개별 지출 수정 다이얼로그 상태
  const [editOpen, setEditOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<RecentLine | null>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);

  // 지점 상세 내역 모달 상태
  const [branchDetailOpen, setBranchDetailOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchAgg | null>(null);

  // 실시간 지출 내역 필터링 상태
  const [selectedFilterBranchId, setSelectedFilterBranchId] = useState<string>("all");
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>("all");
  const [filterSearchKeyword, setFilterSearchKeyword] = useState<string>("");

  const filteredRecentLines = useMemo(() => {
    return recentLines.filter((line) => {
      if (selectedFilterBranchId !== "all" && line.tenant_id !== selectedFilterBranchId) {
        return false;
      }
      if (selectedFilterCategory !== "all" && line.category !== selectedFilterCategory) {
        return false;
      }
      if (filterSearchKeyword.trim() !== "") {
        const keyword = filterSearchKeyword.toLowerCase();
        const desc = (line.description || "").toLowerCase();
        const tenant = (line.tenant_name || "").toLowerCase();
        if (!desc.includes(keyword) && !tenant.includes(keyword)) {
          return false;
        }
      }
      return true;
    });
  }, [recentLines, selectedFilterBranchId, selectedFilterCategory, filterSearchKeyword]);

  // 다국어 픽커 헬퍼
  const L = (
    ko: string,
    en: string,
    vi?: string
  ) => pickUiText(baseLocale, ko, en, vi);

  const expenseCategoryLabel = useCallback(
    (cat: string) => {
      const c = (cat || "").trim();
      if (!c || c === HQ_EXPENSE_CATEGORY_FALLBACK || c === "기타") {
        return L("기타", "Other");
      }
      if (c === "materials" || c === "자재" || c === "자재비") {
        return L("자재비", "Materials");
      }
      if (c === "utilities" || c === "공과금") {
        return L("공과금", "Utilities");
      }
      if (c === "rent" || c === "임대료") {
        return L("임대료", "Rent");
      }
      if (c === "salary" || c === "급여") {
        return L("급여", "Salary");
      }
      return c;
    },
    [baseLocale]
  );

  const formatPaymentMethod = (value: string) => {
    const map: Record<string, string> = {
      card: tf.f00704,
      cash: tf.f00769,
      bank_transfer: tf.f00057,
      transfer: tf.f00057,
      other: tf.f00115,
    };
    return map[value] ?? value;
  };

  // 본사 카테고리 수급
  const fetchHqCategories = async () => {
    try {
      const res = await fetch("/api/hq/categories", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setHqExpenseCategories(json.expenseCategories || null);
      }
    } catch (e) {
      console.error("Failed to load hq categories:", e);
    }
  };

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setForbidden(false);
    try {
      const q = new URLSearchParams({ from, to, uiLocale: locale });
      const res = await fetch(`/api/hq/expenses-summary?${q}`, { credentials: "include" });
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        return;
      }
      const json = await res.json();
      setOrganizations(json.organizations ?? []);
      setBranches(json.branches ?? []);
      setRange(json.range ?? { from, to });
      setGrandTotal(json.grandTotal ?? 0);
      setGrandCount(json.grandCount ?? 0);
      setLastYearGrandTotal(json.lastYearGrandTotal ?? 0);
      setCategoryStats(json.categoryStats ?? []);
      setThreeYearCategoryStats(json.threeYearCategoryStats ?? []);
      setThreeYearCategoryMonthlyStats(json.threeYearCategoryMonthlyStats ?? []);
      setThreeYearBranchCategoryStats(json.threeYearBranchCategoryStats ?? []);
      setThreeYearBranchCategoryMonthlyStats(json.threeYearBranchCategoryMonthlyStats ?? []);
      setTrendDataList(json.trendDataList ?? []);
      setTargetMonthLabel(json.targetMonthLabel ?? "6월");
      setRecentLines(json.recentLines ?? []);
      setGlobalTopMaterials(json.globalTopMaterials ?? []);
      setLastYearTopMaterials(json.lastYearTopMaterials ?? []);
      setWarning(json.warning ?? null);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  // 카테고리별 고유 3개년 컬러 팔레트 정의 (사장님의 카테고리별 다이내믹 컬러 아이디어)
  const categoryColorPalette: Record<string, { bar2024: string; bar2025: string; bar2026: string }> = useMemo(() => ({
    materials: { bar2024: "#a7f3d0", bar2025: "#34d399", bar2026: "#059669" }, // 싱그러운 초록 (자재비)
    utilities: { bar2024: "#bae6fd", bar2025: "#38bdf8", bar2026: "#0284c7" }, // 청량한 하늘색 (공과금)
    rent: { bar2024: "#fde68a", bar2025: "#fbbf24", bar2026: "#d97706" }, // 따뜻한 주황 (임대료)
    labor: { bar2024: "#fecdd3", bar2025: "#fda4af", bar2026: "#e11d48" }, // 사랑스러운 로즈 (인건비)
    marketing: { bar2024: "#ddd6fe", bar2025: "#a78bfa", bar2026: "#7c3aed" }, // 트렌디한 퍼플 (마케팅)
    etc: { bar2024: "#cbd5e1", bar2025: "#94a3b8", bar2026: "#475569" }, // 세련된 그레이 (기타)
  }), []);

  const compareChartData = useMemo(() => {
    const activeBranchStats = threeYearTab === "yearly" ? threeYearBranchCategoryStats : threeYearBranchCategoryMonthlyStats;
    return branches.map((b) => {
      const match = activeBranchStats.find((s) => s.tenant_id === b.id && s.category === selectedCompareCategory);
      return {
        name: b.name.replace("릴리맥", "").replace("점", ""), // 지점명 예쁘게 축약
        "2024년": match?.amount2024 ?? 0,
        "2025년": match?.amount2025 ?? 0,
        "2026년": match?.amount2026 ?? 0,
      };
    });
  }, [threeYearTab, threeYearBranchCategoryStats, threeYearBranchCategoryMonthlyStats, selectedCompareCategory, branches]);

  const trendChartData = useMemo(() => {
    const filtered = selectedBranchFilter === "all" 
      ? trendDataList 
      : trendDataList.filter(d => d.tenant_id === selectedBranchFilter);

    const groupMap = new Map<string, { timeLabel: string; materials: number; utilities: number; rent: number; labor: number; marketing: number; etc: number }>();
    
    for (const d of filtered) {
      const bucket = groupMap.get(d.timeLabel) ?? {
        timeLabel: d.timeLabel,
        materials: 0,
        utilities: 0,
        rent: 0,
        labor: 0,
        marketing: 0,
        etc: 0,
      };
      bucket.materials += d.materials;
      bucket.utilities += d.utilities;
      bucket.rent += d.rent;
      bucket.labor += d.labor;
      bucket.marketing += d.marketing;
      bucket.etc += d.etc;
      groupMap.set(d.timeLabel, bucket);
    }

    return Array.from(groupMap.values()).sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
  }, [trendDataList, selectedBranchFilter]);

  // 지점별로 각 카테고리 지출액을 3개년 연도 기둥(2024, 2025, 2026)으로 분할 누적하여 비교하는 데이터 생성
  const branchStackedBarData = useMemo(() => {
    const activeBranchStats = threeYearTab === "yearly" ? threeYearBranchCategoryStats : threeYearBranchCategoryMonthlyStats;
    
    return branches.map((b) => {
      const stats = activeBranchStats.filter(s => s.tenant_id === b.id);
      const item: any = {
        name: b.name.replace("릴리맥", "").replace("점", ""),
        id: b.id,
      };

      const cats = ["labor", "rent", "utilities", "materials", "marketing", "etc"];
      
      cats.forEach((c) => {
        const match = stats.find(s => s.category === c) || { amount2024: 0, amount2025: 0, amount2026: 0 };
        // 2024년 기둥용 데이터
        item[`2024_${c}`] = match.amount2024;
        // 2025년 기둥용 데이터
        item[`2025_${c}`] = match.amount2025;
        // 2026년 기둥용 데이터
        item[`2026_${c}`] = match.amount2026;
      });

      return item;
    });
  }, [branches, threeYearBranchCategoryStats, threeYearBranchCategoryMonthlyStats, threeYearTab]);

  useEffect(() => {
    if (authLoading) return;
    
    // URL에서 season 파라미터가 있는지 검사하여 대목 기간 즉시 로드
    const sp = new URLSearchParams(window.location.search);
    const season = sp.get("season");
    
    const now = new Date();
    const yr = now.getFullYear();
    let from = format(startOfMonth(now), "yyyy-MM-dd");
    let to = format(now, "yyyy-MM-dd");

    if (season === "parents") {
      from = `${yr}-05-01`;
      to = `${yr}-05-08`;
    } else if (season === "graduation") {
      from = `${yr}-02-01`;
      to = `${yr}-02-28`;
    } else if (season === "christmas") {
      from = `${yr}-12-20`;
      to = `${yr}-12-31`;
    }

    setFromInput(from);
    setToInput(to);
    void load(from, to);
    void fetchHqCategories();
  }, [authLoading, load]);

  const applyRange = () => {
    if (!fromInput || !toInput) return;
    void load(fromInput, toInput);
  };

  // 수정 다이얼로그 트리거
  const openEditDialog = (exp: RecentLine) => {
    setSelectedExpense(exp);
    setEditAmount(exp.amount);
    setEditCategory(exp.category);
    setEditDescription(exp.description === "—" ? "" : exp.description);
    setEditPaymentMethod(exp.payment_method === "—" ? "card" : exp.payment_method);
    setEditDate(format(new Date(exp.expense_date), "yyyy-MM-dd"));
    setEditOpen(true);
  };

  // 지출 수정 처리
  const handleUpdateExpense = async () => {
    if (!selectedExpense) return;
    if (editAmount <= 0) {
      toast.error(L("지출 금액을 입력해 주세요.", "Enter expense amount."));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hq/branch-expenses/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: selectedExpense.id,
          tenantId: selectedExpense.tenant_id,
          amount: editAmount,
          category: editCategory,
          description: editDescription,
          payment_method: editPaymentMethod,
          expense_date: editDate,
        }),
      });
      if (res.ok) {
        toast.success(L("지출 내역이 안전하게 수정되었습니다.", "Expense updated successfully."));
        setEditOpen(false);
        // 만약 지점 상세 모달이 열려 있다면, 로컬 캐시 데이터도 간접 반영해 줌
        load(range.from, range.to);
      } else {
        const err = await res.json();
        toast.error(err.error || L("수정 실패", "Failed to update."));
      }
    } catch (e) {
      toast.error(L("오류가 발생했습니다.", "Error occurred."));
    } finally {
      setSaving(false);
    }
  };

  // 지출 삭제 처리
  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    const confirm = window.confirm(L("이 지출 내역을 정말 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.", "Delete this expense permanently?"));
    if (!confirm) return;

    setSaving(true);
    try {
      const res = await fetch("/api/hq/branch-expenses/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id: selectedExpense.id,
          tenantId: selectedExpense.tenant_id,
        }),
      });
      if (res.ok) {
        toast.success(L("지출 내역이 성공적으로 삭제되었습니다.", "Expense deleted successfully."));
        setEditOpen(false);
        load(range.from, range.to);
      } else {
        const err = await res.json();
        toast.error(err.error || L("삭제 실패", "Failed to delete."));
      }
    } catch (e) {
      toast.error(L("오류가 발생했습니다.", "Error occurred."));
    } finally {
      setSaving(false);
    }
  };

  // 특정 지점의 지출 행만 필터링한 내역
  const activeBranchExpenses = useMemo(() => {
    if (!selectedBranch) return [];
    return recentLines.filter((line) => line.tenant_id === selectedBranch.id);
  }, [selectedBranch, recentLines]);

  const branchCategoryDetailRows = useMemo(() => {
    const out: Array<{
      branchId: string;
      branchName: string;
      category: string;
      count: number;
      amount: number;
      pctBranch: number;
      pctGrand: number;
    }> = [];
    for (const b of branches) {
      for (const r of b.categoryRows) {
        out.push({
          branchId: b.id,
          branchName: b.name,
          category: r.category,
          count: r.count,
          amount: r.amount,
          pctBranch:
            b.totalAmount > 0 ? Math.round((r.amount / b.totalAmount) * 1000) / 10 : 0,
          pctGrand:
            grandTotal > 0 ? Math.round((r.amount / grandTotal) * 1000) / 10 : 0,
        });
      }
    }
    out.sort((a, b) => {
      const nameCmp = a.branchName.localeCompare(b.branchName, baseLocale);
      if (nameCmp !== 0) return nameCmp;
      return b.amount - a.amount;
    });
    return out;
  }, [branches, grandTotal, baseLocale]);

  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => b.totalAmount - a.totalAmount);
  }, [branches]);

  // 전체 및 지점별 년/월/일 지출 통계 실시간 연산
  const globalExpensesStats = useMemo(() => {
    const now = new Date();
    const todayYmd = format(now, "yyyy-MM-dd");
    const thisMonthYm = format(now, "yyyy-MM");
    const thisYearY = format(now, "yyyy");

    let daily = 0;
    let monthly = 0;
    let yearly = 0;

    recentLines.forEach((line) => {
      const amt = line.amount || 0;
      if (line.expense_date.startsWith(todayYmd)) {
        daily += amt;
      }
      if (line.expense_date.startsWith(thisMonthYm)) {
        monthly += amt;
      }
      if (line.expense_date.startsWith(thisYearY)) {
        yearly += amt;
      }
    });

    return { daily, monthly, yearly, todayYmd, thisMonthYm, thisYearY };
  }, [recentLines]);

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

  if (forbidden) {
    return (
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <PageHeader
          title={tf.f01923}
          description={tf.f01436}
          icon={Receipt}
        />
        <Card className="max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>{tf.f01814}</CardTitle>
            <CardDescription>
              {tf.f01852}
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
  // 대시보드 요약 지표 산출
  const avgCostPerExpense = grandCount > 0 ? Math.round(grandTotal / grandCount) : 0;
  const topSpenderBranch = sortedBranches[0] ? `${sortedBranches[0].name} (${sortedBranches[0].totalAmount.toLocaleString()}원)` : "—";
  const topMaterialCost = globalTopMaterials[0] ? `${globalTopMaterials[0].name} (${globalTopMaterials[0].percent}%)` : "—";

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      
      {/* 👑 비주얼 관제탑 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-6 gap-4">
        <div>
          <PageHeader
            title="지점별 지출 & 자재 매입 분석 관제탑"
            description="전 지점에서 집행된 모든 정산 지출 내역과 자재 매입 점유율을 실시간으로 추적·비교하고 즉각 보정합니다."
            icon={Activity}
          />
        </div>
        
        {/* 콤팩트 날짜 필터 및 꽃집 3대 대목 시즌 퀵 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 꽃집 3대 대목 시즌 1초 퀵 비교 필터 단추 */}
          <div className="flex items-center gap-1.5 mr-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] font-bold rounded-lg border-indigo-100 bg-indigo-50/20 text-indigo-600 hover:bg-indigo-50"
              onClick={() => {
                const yr = new Date().getFullYear();
                const from = `${yr}-05-01`;
                const to = `${yr}-05-08`;
                setFromInput(from);
                setToInput(to);
                void load(from, to);
              }}
            >
              🌸 {L("어버이날 특수 (5/1 ~ 5/8)", "Parents' Day (5/1 ~ 5/8)")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] font-bold rounded-lg border-emerald-100 bg-emerald-50/20 text-emerald-600 hover:bg-emerald-50"
              onClick={() => {
                const yr = new Date().getFullYear();
                const from = `${yr}-02-01`;
                const to = `${yr}-02-28`;
                setFromInput(from);
                setToInput(to);
                void load(from, to);
              }}
            >
              🎓 {L("졸업식 특수 (2/1 ~ 2/28)", "Graduation (2/1 ~ 2/28)")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] font-bold rounded-lg border-rose-100 bg-rose-50/20 text-rose-600 hover:bg-rose-50"
              onClick={() => {
                const yr = new Date().getFullYear();
                const from = `${yr}-12-20`;
                const to = `${yr}-12-31`;
                setFromInput(from);
                setToInput(to);
                void load(from, to);
              }}
            >
              🎄 {L("크리스마스 (12/20 ~ 12/31)", "Christmas (12/20 ~ 12/31)")}
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/50 p-2 rounded-2xl shadow-inner">
            {/* 🗓️ 퀵 월 선택 콤보박스 (신설) */}
            <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl px-2">
              <span className="text-[10px] font-black text-indigo-600 shrink-0">🗓️ {L("월 선택", "Month")}</span>
              <Select 
                value={range.from ? format(parseISO(range.from), "M") : "all"}
                onValueChange={(val) => {
                  if (val === "all") return;
                  const yr = new Date().getFullYear();
                  const targetMonth = Number(val);
                  // 해당 월의 1일과 말일 구하기
                  const padM = String(targetMonth).padStart(2, "0");
                  const fromStr = `${yr}-${padM}-01`;
                  // 말일 판별
                  const lastDayMap: Record<number, number> = {
                    1: 31, 2: yr % 4 === 0 ? 29 : 28, 3: 31, 4: 30, 5: 31, 6: 30,
                    7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31
                  };
                  const toStr = `${yr}-${padM}-${lastDayMap[targetMonth]}`;
                  setFromInput(fromStr);
                  setToInput(toStr);
                  void load(fromStr, toStr);
                }}
              >
                <SelectTrigger className="w-[85px] border-none bg-transparent h-7 text-[10px] font-black p-0 shadow-none focus:ring-0">
                  <SelectValue placeholder="월별" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)} className="text-xs font-bold">{m}월</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              <span className="text-[11px] font-bold text-slate-500">{range.from} ~ {range.to}</span>
            </div>
            <Dialog>
              <DialogTrigger className="cursor-pointer inline-flex items-center justify-center h-7 text-[10px] font-bold text-indigo-600 hover:bg-white rounded-lg px-2 gap-1 border-none bg-transparent hover:bg-white/80 transition-all outline-none focus:outline-none">
                <SlidersHorizontal className="h-3 w-3" />
                {L("기간 변경", "Change Range")}
              </DialogTrigger>
            <DialogContent className="max-w-xs rounded-2xl bg-white p-5">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold text-slate-800">{L("조회 기간 설정", "Select Range")}</DialogTitle>
                <DialogDescription className="text-[11px]">{L("집계할 시작일과 종료일을 지정하세요.", "Pick query range.")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 my-4">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400 font-bold">{L("시작일", "Start Date")}</Label>
                  <Input type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} className="rounded-xl text-xs h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400 font-bold">{L("종료일", "End Date")}</Label>
                  <Input type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} className="rounded-xl text-xs h-8" />
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-xl text-[11px]" onClick={() => load(fromInput, toInput)}>{L("조회하기", "Apply")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>

      {organizations.length > 0 && (
        <div className="flex flex-wrap gap-2 -mt-4">
          {organizations.map((o) => (
            <Badge key={o.id} variant="secondary" className="font-semibold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] border border-indigo-100/50">
              🏢 {o.name}
            </Badge>
          ))}
        </div>
      )}

      {warning ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 font-medium flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          {warning}
        </p>
      ) : null}

      {/* 🚀 4대 럭셔리 요약 통계 카드 그리드 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-indigo-50/50 to-indigo-100/20 border border-indigo-100/60 p-1">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{L("올해 전 지점 총지출", "Yearly Branch Expense")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-slate-900 leading-none">₩{globalExpensesStats.yearly.toLocaleString()}</p>
            <p className="text-[10px] text-indigo-500/70 font-semibold mt-2">올해 누적 지출 집계</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-emerald-50/30 to-emerald-100/20 border border-emerald-100/50 p-1">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{L("이번 달 전 지점 지출", "Monthly Branch Expense")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-slate-900 leading-none">₩{globalExpensesStats.monthly.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-500/60 font-semibold mt-2">이번 달 누적 지출 집계</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-rose-50/30 to-rose-100/20 border border-rose-100/50 p-1">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{L("오늘 하루 전 지점 지출", "Daily Branch Expense")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-slate-900 leading-none">₩{globalExpensesStats.daily.toLocaleString()}</p>
            <p className="text-[10px] text-rose-500/60 font-semibold mt-2">오늘 실시간 발생 지출</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-orange-50/30 to-orange-100/20 border border-orange-100/50 p-1">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">{L("최대 지출 매장", "Top spender branch")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-slate-800 truncate leading-none" title={topSpenderBranch}>{topSpenderBranch}</p>
            <p className="text-[10px] text-orange-500/60 font-semibold mt-2.5">최대 비용 집행 대리점</p>
          </CardContent>
        </Card>
      </div>

      {/* 📊 자재 품목별 매입 집중 분석 차트 (Recharts 연동 대용 가로형 누적 점유 바) */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-5">
        {/* 통합 자재 매입 점유율 (왼쪽 3칸) */}
        <Card className="md:col-span-3 border-none shadow-sm rounded-3xl border border-slate-100 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-bold text-slate-800">
              <ShoppingBag className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
              {L("전체 지점 자재 매입 점유율 분석", "Global Material Breakdown")}
            </CardTitle>
            <CardDescription className="text-[11px]">
              {L("전체 지점에서 구매한 자재비 중 비중이 큰 자재 품목을 누적 점유 게이지로 한눈에 대조합니다.", "Accumulated material cost weight analysis.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 누적 가로 캡슐 바 그래프 */}
            <div className="h-6 w-full rounded-2xl bg-slate-50 overflow-hidden flex shadow-inner border border-slate-100">
              {globalTopMaterials.slice(0, 5).map((mat, idx) => {
                const colors = [
                  "bg-indigo-500 hover:bg-indigo-600",
                  "bg-emerald-500 hover:bg-emerald-600",
                  "bg-amber-500 hover:bg-amber-600",
                  "bg-rose-500 hover:bg-rose-600",
                  "bg-sky-500 hover:bg-sky-600"
                ];
                return (
                  <div
                    key={mat.name}
                    className={cn("h-full transition-all cursor-pointer flex items-center justify-center text-[10px] text-white font-bold", colors[idx % colors.length])}
                    style={{ width: `${mat.percent}%` }}
                    title={`${mat.name}: ${mat.amount.toLocaleString()}원 (${mat.percent}%)`}
                  >
                    {mat.percent > 10 ? `${mat.name}` : ""}
                  </div>
                );
              })}
              {globalTopMaterials.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-light">{L("자재 매입 내역이 없습니다.", "No material costs.")}</div>
              )}
            </div>

            {/* 범례 및 순위 메달 리스트 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {globalTopMaterials.slice(0, 6).map((mat, idx) => {
                const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣"];
                const dotColors = [
                  "bg-indigo-500",
                  "bg-emerald-500",
                  "bg-amber-500",
                  "bg-rose-500",
                  "bg-sky-500",
                  "bg-slate-400"
                ];
                return (
                  <div key={mat.name} className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-55 bg-slate-50/20 hover:bg-slate-50/50 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs">{medals[idx] || "•"}</span>
                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotColors[idx % dotColors.length])} />
                      <span className="text-xs font-bold text-slate-700 truncate">{mat.name}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-bold tabular-nums">
                      {mat.amount.toLocaleString()}원 ({mat.percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 카테고리별 비용 비율 및 전년 대비 지출 비교 (오른쪽 2칸) */}
        <Card className="md:col-span-2 border-none shadow-sm rounded-3xl border border-slate-100 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-bold text-slate-800">
              <PieChart className="h-4.5 w-4.5 text-indigo-600" />
              {L("지출 분류 점유 분포 (전년 대비 비교)", "Expense Category Share & YoY Comparison")}
            </CardTitle>
            <CardDescription className="text-[11px]">
              {L("올해 지출액 점유율과 함께 동일 기간 작년 대비 지출 증감률을 카테고리별로 대조합니다.", "Check category cost shares and YoY expense fluctuations.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4.5">
            {categoryStats.slice(0, 5).map((c) => {
              const currentAmt = c.amount;
              const lastYearAmt = c.lastYearAmount ?? 0;
              let diffPercent = 0;
              let hasLastYear = lastYearAmt > 0;
              if (hasLastYear) {
                diffPercent = Math.round(((currentAmt - lastYearAmt) / lastYearAmt) * 100);
              }

              return (
                <div key={c.category} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700">{expenseCategoryLabel(c.category)}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="tabular-nums text-slate-600 font-extrabold">{currentAmt.toLocaleString()}원 ({c.percent}%)</span>
                      
                      {/* YoY 증감 배지 */}
                      {hasLastYear ? (
                        diffPercent > 0 ? (
                          <Badge className="bg-rose-50 hover:bg-rose-50 text-rose-600 border-rose-100 text-[9px] h-4.5 px-1 py-0 rounded font-bold shrink-0 scale-95 border">
                            ▲ {diffPercent}%
                          </Badge>
                        ) : diffPercent < 0 ? (
                          <Badge className="bg-blue-50 hover:bg-blue-50 text-blue-600 border-blue-100 text-[9px] h-4.5 px-1 py-0 rounded font-bold shrink-0 scale-95 border">
                            ▼ {Math.abs(diffPercent)}%
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-50 hover:bg-slate-50 text-slate-500 border-slate-200 text-[9px] h-4.5 px-1 py-0 rounded font-bold shrink-0 scale-95 border">
                            동일
                          </Badge>
                        )
                      ) : (
                        <Badge className="bg-slate-50 hover:bg-slate-50 text-slate-400 border-slate-100 text-[9px] h-4.5 px-1 py-0 rounded font-medium shrink-0 scale-95 border">
                          {L("전년 무", "No YoY")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${c.percent}%` }} />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium px-0.5 leading-none">
                    <span>{L("올해 지출액", "Current")}</span>
                    {hasLastYear && (
                      <span className="text-slate-400 font-semibold italic">
                        {L(`작년 동기: ${lastYearAmt.toLocaleString()}원`, `Last Year: ₩${lastYearAmt.toLocaleString()}`)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {categoryStats.length === 0 && (
              <p className="text-center text-slate-300 text-xs font-light py-10">{L("데이터가 없습니다.", "No data.")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 📊 지점별 카테고리 누적 지출 분석 보드 (신설) */}
      <Card className="border-none shadow-sm rounded-3xl border border-slate-100 bg-white p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 pb-4 mb-6">
          <div>
            <CardTitle className="text-sm flex items-center gap-2 font-bold text-slate-800">
              <PieChart className="h-4.5 w-4.5 text-indigo-600" />
              {L("📊 지점별 카테고리 누적 지출 비교 (Stacked Bar)", "Stacked Category Comparison by Branch")}
            </CardTitle>
            <CardDescription className="text-[11px] mt-1">
              {L("각 지점별로 인건비, 임대료, 자재비 등 카테고리 지출 분포가 어떻게 누적되어 있는지 한 차트에서 나란히 대조합니다.", "Compare stacked category costs side-by-side across all branches.")}
            </CardDescription>
          </div>

          {/* 지점 필터 셀렉터 (UUID 버그 원천 교정) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">{L("관측 지점 필터:", "Branch:")}</span>
            <Select value={selectedBranchFilter} onValueChange={(val) => setSelectedBranchFilter(val || "all")}>
              <SelectTrigger className="w-[150px] rounded-xl text-xs font-bold border-slate-200 bg-slate-50/50">
                <span>
                  {selectedBranchFilter === "all" 
                    ? `🌐 ${L("전체 지점 통합", "All Branches")}` 
                    : `🏢 ${(branches.find(b => b.id === selectedBranchFilter)?.name ?? selectedBranchFilter).replace("릴리맥", "")}`
                  }
                </span>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">🌐 {L("전체 지점 통합", "All Branches")}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>🏢 {b.name.replace("릴리맥", "")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stacked Bar Chart */}
        <div className="h-[280px] w-full bg-slate-50/10 rounded-3xl border border-slate-50 p-4">
          {branchStackedBarData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-300">
              <p className="text-xs font-light">{L("조회할 수 있는 데이터가 없습니다.", "No data.")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={selectedBranchFilter === "all" ? branchStackedBarData : branchStackedBarData.filter(d => d.id === selectedBranchFilter)} 
                margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={8} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toLocaleString()}만` : v.toLocaleString()} 
                />
                <Tooltip
                  contentStyle={{ borderRadius: "16px", border: "1px solid #f1f5f9", fontSize: "10px", fontWeight: "bold" }}
                  formatter={(value: any, name: any) => {
                    if (Number(value) === 0) return [null];
                    return [`${Number(value).toLocaleString()}원`, name];
                  }}
                />

                {/* 2024년 지출 누적 기둥 (재작년 - 파스텔 그레이/슬레이트 계열) */}
                <Bar name="24년 인건비" dataKey="2024_labor" stackId="2024" fill="#cbd5e1" />
                <Bar name="24년 임대료" dataKey="2024_rent" stackId="2024" fill="#e2e8f0" />
                <Bar name="24년 공과금" dataKey="2024_utilities" stackId="2024" fill="#94a3b8" />
                <Bar name="24년 자재비" dataKey="2024_materials" stackId="2024" fill="#64748b" />
                <Bar name="24년 마케팅" dataKey="2024_marketing" stackId="2024" fill="#475569" />
                <Bar name="24년 기타" dataKey="2024_etc" stackId="2024" fill="#334155" />

                {/* 2025년 지출 누적 기둥 (작년 - 시원한 블루/하늘색 계열) */}
                <Bar name="25년 인건비" dataKey="2025_labor" stackId="2025" fill="#fda4af" />
                <Bar name="25년 임대료" dataKey="2025_rent" stackId="2025" fill="#fef08a" />
                <Bar name="25년 공과금" dataKey="2025_utilities" stackId="2025" fill="#bae6fd" />
                <Bar name="25년 자재비" dataKey="2025_materials" stackId="2025" fill="#a7f3d0" />
                <Bar name="25년 마케팅" dataKey="2025_marketing" stackId="2025" fill="#ddd6fe" />
                <Bar name="25년 기타" dataKey="2025_etc" stackId="2025" fill="#cbd5e1" />

                {/* 2026년 지출 누적 기둥 (올해 - 딥 에메랄드/인디고 원색 계열) */}
                <Bar name="26년 인건비" dataKey="2026_labor" stackId="2026" fill="#e11d48" />
                <Bar name="26년 임대료" dataKey="2026_rent" stackId="2026" fill="#d97706" />
                <Bar name="26년 공과금" dataKey="2026_utilities" stackId="2026" fill="#0284c7" />
                <Bar name="26년 자재비" dataKey="2026_materials" stackId="2026" fill="#059669" />
                <Bar name="26년 마케팅" dataKey="2026_marketing" stackId="2026" fill="#7c3aed" />
                <Bar name="26년 기타" dataKey="2026_etc" stackId="2026" fill="#475569" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 🎨 세련된 커스텀 범례 판넬 (18개 찌그러진 아이콘 완전 대체) */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-semibold bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
          
          {/* Left: 연도별 3개 기둥의 색상 그룹 */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{L("📊 연도별 기둥:", "Columns:")}</span>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-100 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-slate-600 font-bold text-[10px]">2024년 (재작년 전체)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-100 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span className="text-slate-600 font-bold text-[10px]">2025년 (작년 전체)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-100 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-slate-900 font-black text-[10px]">2026년 (올해 누계)</span>
            </div>
          </div>

          {/* Right: 각 기둥 안에 쌓인 6대 카테고리 색상 맵 */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{L("🎨 카테고리 색상:", "Categories:")}</span>
            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-slate-50 text-[10px] text-slate-600">
              <span className="h-2 w-2 rounded bg-rose-500 shrink-0" />
              <span>인건비</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-slate-50 text-[10px] text-slate-600">
              <span className="h-2 w-2 rounded bg-amber-500 shrink-0" />
              <span>임대료</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-slate-50 text-[10px] text-slate-600">
              <span className="h-2 w-2 rounded bg-sky-500 shrink-0" />
              <span>공과금</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-slate-50 text-[10px] text-slate-600">
              <span className="h-2 w-2 rounded bg-emerald-500 shrink-0" />
              <span>자재비</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-slate-50 text-[10px] text-slate-600">
              <span className="h-2 w-2 rounded bg-purple-500 shrink-0" />
              <span>마케팅</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-slate-50 text-[10px] text-slate-600">
              <span className="h-2 w-2 rounded bg-slate-500 shrink-0" />
              <span>기타</span>
            </div>
          </div>

        </div>
      </Card>


      {/* ⚖️ 지점별 상세 지출 및 자재 매입 순위 카드 보드 */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-indigo-600" />
              {L("지점별 지출 & 자재 매입 실태 카드 보드", "Branch Cost Card Board")}
            </h3>
            <p className="text-[11px] text-slate-400">{L("각 지점의 요금제 유형, 총 지출 규모, 자재비 비중 및 최다 매입 자재 TOP 3를 요약 카드 형태로 대조합니다.", "Check branch cost scales, material share, and top items.")}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {sortedBranches.map((b) => {
              const sharePct = grandTotal > 0 ? Math.round((b.totalAmount / grandTotal) * 100) : 0;
              // 자재비 카테고리 비율 계산
              const matCostRow = b.categoryRows.find(r => r.category === "materials" || r.category === "자재" || r.category === "자재비");
              const matPercentOfBranch = b.totalAmount > 0 && matCostRow ? Math.round((matCostRow.amount / b.totalAmount) * 100) : 0;

              // 지점별 년/월/일 지출 연산
              const branchExpenses = recentLines.filter(line => line.tenant_id === b.id);
              const branchDaily = branchExpenses
                .filter(line => line.expense_date.startsWith(globalExpensesStats.todayYmd))
                .reduce((sum, line) => sum + (line.amount || 0), 0);
              const branchMonthly = branchExpenses
                .filter(line => line.expense_date.startsWith(globalExpensesStats.thisMonthYm))
                .reduce((sum, line) => sum + (line.amount || 0), 0);
              const branchYearly = branchExpenses
                .filter(line => line.expense_date.startsWith(globalExpensesStats.thisYearY))
                .reduce((sum, line) => sum + (line.amount || 0), 0);

              return (
                <Card key={b.id} className="border-none shadow-sm rounded-3xl border border-slate-100 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between overflow-hidden">
                  <div className="p-5 space-y-4">
                    {/* 카드 헤더 (지점명 / 요금제) */}
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold text-slate-800 truncate block">
                          🏢 {b.name}
                        </span>
                        {b.plan && (
                          <Badge variant="secondary" className="mt-1 bg-slate-50 text-slate-500 border border-slate-100 text-[9px] px-1.5 font-bold rounded-md">
                            {b.plan}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">{L("지출 건수", "Bills")}</span>
                        <span className="text-xs font-bold text-slate-700 tabular-nums">{b.expenseCount}건</span>
                      </div>
                    </div>

                    {/* 실시간 시간대별 지출 격자 분석 */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/50 rounded-2xl p-3 border border-slate-100/50">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">{L("당일 지출", "Today")}</span>
                        <span className="text-xs font-extrabold text-rose-600 tabular-nums">₩{branchDaily.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">{L("당월 지출", "Month")}</span>
                        <span className="text-xs font-extrabold text-slate-800 tabular-nums">₩{branchMonthly.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">{L("금년 지출", "Year")}</span>
                        <span className="text-xs font-extrabold text-indigo-700 tabular-nums">₩{branchYearly.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 자재비 비중 프로그레스 게이지 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>🌿 {L("전체 지출 중 자재비 비중", "Material Cost Weight")}</span>
                        <span className="tabular-nums text-indigo-600">{matPercentOfBranch}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${matPercentOfBranch}%` }} />
                      </div>
                    </div>

                    {/* 최다 매입 자재 TOP 3 */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">{L("매입 자재 순위 TOP 3", "Top Purchases")}</span>
                      <div className="flex flex-wrap gap-1">
                        {b.topMaterials.slice(0, 3).map((mat) => (
                          <Badge key={mat.name} variant="secondary" className="bg-slate-50 border border-slate-100 text-[9px] text-slate-600 font-bold px-2 py-0.5 rounded-lg">
                            {mat.name} {Math.round(mat.percent)}%
                          </Badge>
                        ))}
                        {b.topMaterials.length === 0 && (
                          <span className="text-[10px] text-slate-300 italic font-light">—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 팝업 모달을 띄워주는 럭셔리 클릭 트리거 단추 */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranch(b);
                      setBranchDetailOpen(true);
                    }}
                    className="w-full border-t border-slate-50 bg-slate-50/20 hover:bg-indigo-50/30 py-2.5 px-5 text-center text-[10px] font-bold text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-1 transition-all border-none outline-none focus:outline-none"
                  >
                    <span>{L("지점별 지출 상세 내역 조회", "View Branch Details")}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 📈 작년 동기 대조 자재 매입 트렌드 분석 & 선매입 AI 예측 (Control Tower Advanced) */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* 왼쪽 카드: 작년 vs 올해 자재 품목 매입액 순위 대조 */}
        <Card className="border-none shadow-sm rounded-3xl border border-slate-100 bg-white">
          <CardHeader className="pb-3 border-b border-slate-50">
            <CardTitle className="text-sm flex items-center gap-2 font-bold text-slate-800">
              <RefreshCw className="h-4.5 w-4.5 text-indigo-600 animate-spin-slow" />
              {L("작년 동기 vs 올해 자재 매입 규모 비교", "YoY Material Purchase Comparison")}
            </CardTitle>
            <CardDescription className="text-[11px]">
              {L("동일 날짜 범위 기준, 작년에 가장 많이 매입한 품목과 올해 매입한 자재의 지출 추이를 대조합니다.", "YoY material cost scale and trend check.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-2 uppercase">⏱️ {L("작년 동기 지출 총액", "Last Year (Same Period)")}</span>
                <span className="text-base font-extrabold text-slate-700 tabular-nums">₩{lastYearGrandTotal.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-indigo-500 font-bold block mb-2 uppercase">📈 {L("올해 동기 지출 총액", "This Year (Same Period)")}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-extrabold text-indigo-700 tabular-nums">₩{grandTotal.toLocaleString()}</span>
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                    grandTotal >= lastYearGrandTotal ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {grandTotal >= lastYearGrandTotal ? "▲" : "▼"} 
                    {lastYearGrandTotal > 0 ? Math.abs(Math.round(((grandTotal - lastYearGrandTotal) / lastYearGrandTotal) * 100)) : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-slate-50 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="font-bold text-[10px] text-slate-500">{L("자재명", "Material")}</TableHead>
                    <TableHead className="text-right font-bold text-[10px] text-slate-500">{L("작년 매입액", "Last Year")}</TableHead>
                    <TableHead className="text-right font-bold text-[10px] text-slate-500">{L("올해 매입액", "This Year")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalTopMaterials.slice(0, 5).map((mat) => {
                    const lyMat = lastYearTopMaterials.find(l => l.name === mat.name);
                    const lyAmt = lyMat ? lyMat.amount : 0;
                    return (
                      <TableRow key={mat.name} className="border-b border-slate-50/50 hover:bg-slate-50/20 text-xs">
                        <TableCell className="font-bold text-slate-700">{mat.name}</TableCell>
                        <TableCell className="text-right font-medium text-slate-400 tabular-nums">₩{lyAmt.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-extrabold text-slate-800 tabular-nums">
                          ₩{mat.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {globalTopMaterials.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-slate-300 text-[11px] italic font-light">
                        {L("자재 비교 데이터가 존재하지 않습니다.", "No YoY data.")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 오른쪽 카드: 자재 지점별 동향 & 본사 선매입 예측 가이드 (Forecast AI) */}
        <Card className="border-none shadow-sm rounded-3xl border border-slate-100 bg-white">
          <CardHeader className="pb-3 border-b border-slate-50">
            <CardTitle className="text-sm flex items-center gap-2 font-bold text-slate-800">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
              {L("지점별 자재 매입 추이 & 대량 매입 권장 예측", "YoY Spikes & Pre-purchase Forecast")}
            </CardTitle>
            <CardDescription className="text-[11px]">
              {L("작년 동기 대비 각 지점의 자재비 증가 폭을 추적하여, 본사 통합 벌크 선매입 필요성을 예측합니다.", "Forecast for bulk purchase based on branch YoY cost spike.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {branches.slice(0, 5).map((b) => {
                const increase = b.totalAmount - b.lastYearTotal;
                const pct = b.lastYearTotal > 0 ? Math.round((increase / b.lastYearTotal) * 100) : 0;
                
                // 가이드 메시지 생성
                let alertMsg = L("전년 수준 유지 중 (안정)", "Stable (YoY consistent)");
                let textClass = "text-slate-500 bg-slate-50 border-slate-100";
                if (increase > 100000 && pct > 15) {
                  alertMsg = L("자재비 급상승 ⚠️ 포장재·대량 선매입 권장", "High Spike ⚠️ Recommend bulk pre-order");
                  textClass = "text-rose-600 bg-rose-50 border-rose-100";
                } else if (increase < -100000 && pct < -15) {
                  alertMsg = L("자재비 감소 📉 소량 매입 권장", "Decreasing 📉 Recommend low stock level");
                  textClass = "text-emerald-600 bg-emerald-50 border-emerald-100";
                }

                return (
                  <div key={b.id} className="p-3 rounded-2xl border border-slate-50 bg-slate-50/20 hover:bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-2 transition-all">
                    <div>
                      <span className="text-xs font-bold text-slate-800">🏢 {b.name}</span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        <span className="text-slate-400">{L("작년", "Last Y")}: ₩{b.lastYearTotal.toLocaleString()}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-indigo-600 font-bold">{L("올해", "This Y")}: ₩{b.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className={cn("text-[9px] font-bold px-2 py-1 rounded-xl border flex items-center gap-1.5 self-start sm:self-auto", textClass)}>
                      <span>{alertMsg}</span>
                      {pct !== 0 && (
                        <span className="font-mono">{pct > 0 ? `+${pct}%` : `${pct}%`}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {branches.length === 0 && (
                <p className="text-center py-10 text-slate-300 text-xs italic font-light">{L("지점별 비교 분석 데이터가 없습니다.", "No branch comparison.")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 🕒 최근 지출 타임라인 및 원격 보정 장표 */}
      <Card className="border-none shadow-sm rounded-3xl border border-slate-100 bg-white">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-50 gap-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-600" />
              {tf.f02015}
            </CardTitle>
            <CardDescription className="text-xs">{tf.f01409}</CardDescription>
          </div>
          
          {/* 실시간 필터 컨트롤러 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. 지점 필터 */}
            <Select value={selectedFilterBranchId} onValueChange={(val) => setSelectedFilterBranchId(val || "all")}>
              <SelectTrigger className="w-[130px] h-8 text-[11px] rounded-xl bg-slate-50 border-slate-100 font-bold text-slate-700">
                <SelectValue>
                  {selectedFilterBranchId === "all" 
                    ? L("전체 지점", "All Branches") 
                    : (branches.find(b => b.id === selectedFilterBranchId)?.name || L("전체 지점", "All Branches"))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white rounded-xl">
                <SelectItem value="all" className="text-[11px] font-medium">{L("전체 지점", "All Branches")}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-[11px] font-medium">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 2. 카테고리 필터 */}
            <Select value={selectedFilterCategory} onValueChange={(val) => setSelectedFilterCategory(val || "all")}>
              <SelectTrigger className="w-[120px] h-8 text-[11px] rounded-xl bg-slate-50 border-slate-100 font-bold text-slate-700">
                <SelectValue>
                  {selectedFilterCategory === "all" ? L("전체 카테고리", "All Categories") :
                   selectedFilterCategory === "materials" ? L("자재비", "Materials") :
                   selectedFilterCategory === "utilities" ? L("공과금", "Utilities") :
                   selectedFilterCategory === "rent" ? L("임대료", "Rent") :
                   selectedFilterCategory === "salary" ? L("급여", "Salary") :
                   selectedFilterCategory === "other" ? L("기타", "Other") :
                   L("전체 카테고리", "All Categories")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white rounded-xl">
                <SelectItem value="all" className="text-[11px] font-medium">{L("전체 카테고리", "All Categories")}</SelectItem>
                <SelectItem value="materials" className="text-[11px] font-medium">{L("자재비", "Materials")}</SelectItem>
                <SelectItem value="utilities" className="text-[11px] font-medium">{L("공과금", "Utilities")}</SelectItem>
                <SelectItem value="rent" className="text-[11px] font-medium">{L("임대료", "Rent")}</SelectItem>
                <SelectItem value="salary" className="text-[11px] font-medium">{L("급여", "Salary")}</SelectItem>
                <SelectItem value="other" className="text-[11px] font-medium">{L("기타", "Other")}</SelectItem>
              </SelectContent>
            </Select>

            {/* 3. 검색창 */}
            <div className="w-[160px]">
              <Input
                type="text"
                placeholder={L("적요 또는 지점명 검색...", "Search description...")}
                value={filterSearchKeyword}
                onChange={(e) => setFilterSearchKeyword(e.target.value)}
                className="h-8 text-[11px] rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
            </div>
          ) : filteredRecentLines.length === 0 ? (
            <p className="text-sm text-slate-300 text-center py-12 italic font-light">
              {L("검색 조건에 부합하는 지출 내역이 없습니다.", "No expenses found matching the criteria.")}
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-50 rounded-2xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                    <TableHead className="font-bold text-xs text-slate-500 px-4">{tf.f01717}</TableHead>
                    <TableHead className="font-bold text-xs text-slate-500">{tf.f00663}</TableHead>
                    <TableHead className="font-bold text-xs text-slate-500">{tf.f01290}</TableHead>
                    <TableHead className="font-bold text-xs text-slate-500 min-w-[150px]">{tf.f01772}</TableHead>
                    <TableHead className="font-bold text-xs text-slate-500">{tf.f00909}</TableHead>
                    <TableHead className="text-right font-bold text-xs text-slate-500">{tf.f00097}</TableHead>
                    <TableHead className="text-center font-bold text-xs text-slate-500 w-[80px]">{L("보정", "Edit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecentLines.map((r) => {
                    const isMat = r.category === "materials" || r.category === "자재" || r.category === "자재비";
                    const isUtil = r.category === "utilities" || r.category === "공과금";
                    const isRent = r.category === "rent" || r.category === "임대료";
                    return (
                      <TableRow key={r.id} className="border-b border-slate-50/50 hover:bg-slate-50/30 transition-all">
                        <TableCell className="text-xs font-semibold tabular-nums text-slate-400 px-4">
                          {format(new Date(r.expense_date), "PPp", { locale: dfLoc })}
                        </TableCell>
                        <TableCell className="text-xs font-extrabold text-slate-800">
                          {r.tenant_name}
                        </TableCell>
                        <TableCell className="text-xs font-bold">
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px]",
                            isMat ? "bg-orange-50 text-orange-600 border border-orange-100" :
                            isUtil ? "bg-sky-50 text-sky-600 border border-sky-100" :
                            isRent ? "bg-rose-50 text-rose-600 border border-rose-100" :
                            "bg-slate-50 text-slate-600 border border-slate-100"
                          )}>
                            {expenseCategoryLabel(r.category)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate text-slate-700 font-bold" title={r.description}>
                          {r.description}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-bold">{formatPaymentMethod(r.payment_method)}</TableCell>
                        <TableCell className="text-right text-xs font-extrabold tabular-nums text-slate-800">
                          {r.amount.toLocaleString()}{tf.f00487}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(r)}
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🔍 [NEW] 지점별 상세 지출 내역 조회 팝업 모달 */}
      <Dialog open={branchDetailOpen} onOpenChange={setBranchDetailOpen}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-2xl overflow-y-auto max-h-[85vh]">
          {selectedBranch && (
            <>
              <DialogHeader className="border-b border-slate-50 pb-4">
                <DialogTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <span>🏢 {selectedBranch.name}</span>
                  <span className="text-xs text-slate-400 font-bold">— {L("지출 상세 원장", "Expense Details Ledger")}</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {L("선택한 지점의 조회 기간 내 개별 지출 트랜잭션을 전수 검사하고 직접 보정합니다.", "Inspect and edit all expenses for this branch.")}
                </DialogDescription>
              </DialogHeader>

              {/* 지점 간략 요약 */}
              <div className="grid grid-cols-3 gap-3 my-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{L("지출 총합", "Total Cost")}</span>
                  <span className="text-sm font-extrabold text-indigo-600 tabular-nums">{selectedBranch.totalAmount.toLocaleString()}원</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{L("지출 건수", "Total Bills")}</span>
                  <span className="text-sm font-bold text-slate-700 tabular-nums">{selectedBranch.expenseCount}건</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{L("자재 매입 비중", "Material Weight")}</span>
                  <span className="text-sm font-bold text-emerald-600 tabular-nums">
                    {(() => {
                      const matRow = selectedBranch.categoryRows.find(r => r.category === "materials" || r.category === "자재" || r.category === "자재비");
                      return selectedBranch.totalAmount > 0 && matRow ? Math.round((matRow.amount / selectedBranch.totalAmount) * 100) : 0;
                    })()}%
                  </span>
                </div>
              </div>

              {/* 지점 상세 리스트 */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 block">{L("개별 지출 리스트", "Individual Transactions")}</span>
                <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                      <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-100">
                        <TableHead className="font-bold text-[11px] text-slate-500 w-[120px]">{L("날짜", "Date")}</TableHead>
                        <TableHead className="font-bold text-[11px] text-slate-500 w-[90px]">{L("분류", "Category")}</TableHead>
                        <TableHead className="font-bold text-[11px] text-slate-500">{L("적요 (상세내용)", "Description")}</TableHead>
                        <TableHead className="font-bold text-[11px] text-slate-500 w-[80px]">{L("수단", "Payment")}</TableHead>
                        <TableHead className="text-right font-bold text-[11px] text-slate-500 w-[110px]">{L("금액", "Amount")}</TableHead>
                        <TableHead className="text-center font-bold text-[11px] text-slate-500 w-[50px]">{L("보정", "Edit")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeBranchExpenses.map((line) => (
                        <TableRow key={line.id} className="border-b border-slate-50 hover:bg-slate-50/30">
                          <TableCell className="text-[10px] font-semibold tabular-nums text-slate-400">
                            {format(new Date(line.expense_date), "yyyy-MM-dd HH:mm")}
                          </TableCell>
                          <TableCell className="text-[11px] font-bold text-slate-700">{expenseCategoryLabel(line.category)}</TableCell>
                          <TableCell className="text-[11px] font-medium text-slate-600 truncate max-w-[150px]" title={line.description}>{line.description}</TableCell>
                          <TableCell className="text-[10px] text-slate-400 font-bold">{formatPaymentMethod(line.payment_method)}</TableCell>
                          <TableCell className="text-right font-extrabold text-[11px] text-slate-800 tabular-nums">{line.amount.toLocaleString()}원</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(line)}
                              className="h-6 w-6 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {activeBranchExpenses.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-slate-300 text-xs italic font-light">
                            {L("이 기간 내 지출 내역이 존재하지 않습니다.", "No expenses in this range.")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-50">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setBranchDetailOpen(false)}
                  className="rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 border-none"
                >
                  {L("닫기", "Close")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ✍️ 개별 지출 수정 및 삭제 다이얼로그 모달 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-xl z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
              🛠️ {L("지점 지출 내역 수정 및 보정", "Edit Branch Expense")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {L("본사 관리자 권한으로 지점의 지출 정보를 강제 수정하거나 삭제합니다. 지점 장부에 즉시 반영됩니다.", "Modify or delete this branch expense as HQ admin.")}
            </DialogDescription>
          </DialogHeader>

          {selectedExpense && (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">{L("지점명", "Branch")}</span>
                  <span className="font-extrabold text-slate-700">🏢 {selectedExpense.tenant_name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">{L("최초 등록 일시", "Created At")}</span>
                  <span className="font-semibold text-slate-500 tabular-nums">
                    {format(new Date(selectedExpense.expense_date), "yyyy-MM-dd HH:mm")}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-category" className="text-xs font-bold text-slate-500">{L("지출 카테고리", "Category")}</Label>
                <select
                  id="edit-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full h-9 rounded-xl border border-input bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {hqExpenseCategories?.main?.map((cat: string) => (
                    <option key={cat} value={cat}>
                      {expenseCategoryLabel(cat)}
                    </option>
                  ))}
                  {/* 디폴트 예비 */}
                  <option value="materials">{L("자재비", "Materials")}</option>
                  <option value="utilities">{L("공과금", "Utilities")}</option>
                  <option value="rent">{L("임대료", "Rent")}</option>
                  <option value="salary">{L("급여", "Salary")}</option>
                  <option value="other">{L("기타", "Other")}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-amount" className="text-xs font-bold text-slate-500">{L("지출 금액", "Amount")}</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(Number(e.target.value))}
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-date" className="text-xs font-bold text-slate-500">{L("지출 일자", "Expense Date")}</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-payment" className="text-xs font-bold text-slate-500">{L("결제 수단", "Payment Method")}</Label>
                <Select value={editPaymentMethod} onValueChange={(val) => setEditPaymentMethod(val)}>
                  <SelectTrigger id="edit-payment" className="rounded-xl text-xs">
                    <SelectValue placeholder={L("선택", "Select")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="card">{L("신용카드", "Card")}</SelectItem>
                    <SelectItem value="cash">{L("현금", "Cash")}</SelectItem>
                    <SelectItem value="bank_transfer">{L("계좌이체", "Bank Transfer")}</SelectItem>
                    <SelectItem value="other">{L("기타", "Other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-desc" className="text-xs font-bold text-slate-500">{L("적요 (상세내용)", "Description")}</Label>
                <Input
                  id="edit-desc"
                  placeholder={L("지출의 상세 정보나 자재 품목", "e.g. Purchased roses")}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between items-center w-full gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={handleDeleteExpense}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border-none rounded-xl text-xs font-bold gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {L("지출 삭제", "Delete")}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => setEditOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                {L("취소", "Cancel")}
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={handleUpdateExpense}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-4 border-none"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                {L("수정 완료", "Save Changes")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
