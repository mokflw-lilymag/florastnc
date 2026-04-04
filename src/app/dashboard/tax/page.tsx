"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FileText, Calendar, TrendingUp, TrendingDown, AlertTriangle,
  ChevronLeft, ChevronRight, Download, Building2, Calculator,
  ClipboardCheck, Clock, CheckCircle2, Info, Receipt, BarChart3,
  Wallet, ArrowRight, ArrowUpRight
} from "lucide-react";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExpenses } from "@/hooks/use-expenses";
import { useOrders } from "@/hooks/use-orders";
import { useSuppliers } from "@/hooks/use-suppliers";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from "recharts";
import { useSettings } from "@/hooks/use-settings";

// 면세사업자 지출 분류 → 사업장 현황신고 비용 항목 매핑
const EXPENSE_TO_TAX_CATEGORY: Record<string, string> = {
  materials: "매입비용 (꽃/자재)",
  transportation: "운송비/차량유지비",
  rent: "임차료",
  utility: "수도광열비",
  labor: "인건비/급여",
  marketing: "광고선전비",
  etc: "기타경비",
};

const TAX_CATEGORY_ORDER = [
  "매입비용 (꽃/자재)",
  "인건비/급여",
  "임차료",
  "수도광열비",
  "운송비/차량유지비",
  "광고선전비",
  "기타경비",
];

const MONTH_COLORS = [
  "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe",
  "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe",
  "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"
];

export default function TaxPage() {
  const { expenses, loading: expensesLoading } = useExpenses();
  const { orders, fetchOrders, loading: ordersLoading } = useOrders(false);
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { settings, loading: settingsLoading } = useSettings();

  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const loading = expensesLoading || ordersLoading || suppliersLoading || settingsLoading;

  useEffect(() => {
    fetchOrders(730); // 2년치 데이터
  }, [fetchOrders]);

  const yearStart = startOfYear(new Date(viewYear, 0, 1));
  const yearEnd = endOfYear(new Date(viewYear, 0, 1));

  // Year-filtered data
  const yearExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.expense_date);
      return d >= yearStart && d <= yearEnd;
    });
  }, [expenses, yearStart, yearEnd]);

  const yearOrders = useMemo(() => {
    return orders.filter(o => {
      const d = new Date(o.order_date);
      return d >= yearStart && d <= yearEnd && o.status !== 'canceled';
    });
  }, [orders, yearStart, yearEnd]);

  // ============ 사업장 현황신고 핵심 수치 ============

  // 총 수입금액 (매출)
  const totalRevenue = yearOrders.reduce((s, o) => s + (o.summary?.total || 0), 0);
  // 총 매입금액 (지출 중 자재/꽃)
  const totalPurchase = yearExpenses
    .filter(e => e.category === "materials")
    .reduce((s, e) => s + (e.amount || 0), 0);
  // 총 필요경비
  const totalExpenseAmount = yearExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  // 소득금액 (수입 - 경비)
  const income = totalRevenue - totalExpenseAmount;

  // 비용 항목별 집계 (사업장 현황신고 양식)
  const taxCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    yearExpenses.forEach(e => {
      const taxCat = EXPENSE_TO_TAX_CATEGORY[e.category || "etc"] || "기타경비";
      map.set(taxCat, (map.get(taxCat) || 0) + e.amount);
    });
    return TAX_CATEGORY_ORDER
      .map(cat => ({ name: cat, amount: map.get(cat) || 0 }))
      .filter(c => c.amount > 0);
  }, [yearExpenses]);

  // 월별 매출/매입 현황
  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
    return months.map((monthStart, i) => {
      const monthEnd = endOfMonth(monthStart);
      const label = format(monthStart, "M월");

      const revenue = orders
        .filter(o => { const d = new Date(o.order_date); return d >= monthStart && d <= monthEnd && o.status !== 'canceled'; })
        .reduce((s, o) => s + (o.summary?.total || 0), 0);

      const expense = expenses
        .filter(e => { const d = new Date(e.expense_date); return d >= monthStart && d <= monthEnd; })
        .reduce((s, e) => s + (e.amount || 0), 0);

      const purchase = expenses
        .filter(e => { const d = new Date(e.expense_date); return d >= monthStart && d <= monthEnd && e.category === "materials"; })
        .reduce((s, e) => s + (e.amount || 0), 0);

      return { name: label, 수입금액: revenue, 필요경비: expense, 매입비용: purchase };
    });
  }, [orders, expenses, yearStart, yearEnd]);

  // 거래처별 매입 내역 (사업장 현황신고에 필요)
  const supplierPurchases = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    yearExpenses
      .filter(e => e.supplier_id)
      .forEach(e => {
        const cur = map.get(e.supplier_id!) || { amount: 0, count: 0 };
        map.set(e.supplier_id!, { amount: cur.amount + e.amount, count: cur.count + 1 });
      });
    return Array.from(map.entries())
      .map(([id, data]) => ({
        id,
        name: suppliers.find(s => s.id === id)?.name || "알 수 없음",
        ...data,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [yearExpenses, suppliers]);

  // ============ 세무 일정 ============
  const now = new Date();
  const currentYear = now.getFullYear();

  const isExempt = settings?.isTaxExempt !== false; // Default true

  const taxSchedule = [
    {
      title: isExempt ? "사업장 현황신고" : "부가가치세 신고",
      description: isExempt ? "전년도 수입금액 및 매입내역 신고" : "과세기간 부가가치세 신고 및 납부",
      deadline: isExempt ? new Date(currentYear, 1, 10) : new Date(currentYear, now.getMonth() < 6 ? 6 : 0, 25),
      icon: ClipboardCheck,
      color: "blue",
      detail: isExempt ? "매년 2/10까지 | 국세청 홈택스" : "1/25, 7/25 까지 | 국세청 홈택스",
      link: "https://www.hometax.go.kr"
    },
    {
      title: "종합소득세 신고",
      description: "전년도 사업소득에 대한 소득세 신고",
      deadline: new Date(currentYear, 4, 31), // 5월 31일
      icon: Calculator,
      color: "violet",
      detail: "매년 5/31까지 | 세무사 또는 홈택스",
      link: "https://www.hometax.go.kr"
    },
    {
      title: "원천세 신고 (직원 있는 경우)",
      description: "매월 급여에 대한 원천징수세 신고",
      deadline: new Date(currentYear, now.getMonth() + 1, 10),
      icon: Receipt,
      color: "amber",
      detail: "매월 10일까지 | 직원이 있는 경우만",
      link: "https://www.hometax.go.kr"
    },
  ];

  const getDeadlineStatus = (deadline: Date) => {
    const diff = differenceInDays(deadline, now);
    if (diff < 0) return { label: "완료/경과", color: "bg-slate-100 text-slate-500", urgent: false };
    if (diff <= 14) return { label: `D-${diff}`, color: "bg-red-100 text-red-700", urgent: true };
    if (diff <= 30) return { label: `D-${diff}`, color: "bg-amber-100 text-amber-700", urgent: false };
    return { label: `D-${diff}`, color: "bg-emerald-100 text-emerald-700", urgent: false };
  };

  // 엑셀 다운로드 (사업장 현황신고용)
  const downloadTaxReport = () => {
    // Build CSV content
    const BOM = "\uFEFF";
    const lines: string[] = [];
    lines.push(`[${viewYear}년 ${isExempt ? '사업장 현황신고' : '부가가치세 신고'} 기초자료]`);
    lines.push(`생성일: ${format(now, "yyyy-MM-dd HH:mm")}`);
    lines.push("");
    lines.push("=== 수입금액 (매출) ===");
    lines.push(`총 수입금액,${totalRevenue}`);
    lines.push(`총 주문건수,${yearOrders.length}`);
    lines.push("");
    lines.push("=== 필요경비 내역 ===");
    lines.push("비용항목,금액");
    taxCategoryBreakdown.forEach(c => {
      lines.push(`${c.name},${c.amount}`);
    });
    lines.push(`필요경비 합계,${totalExpenseAmount}`);
    lines.push("");
    lines.push("=== 소득금액 ===");
    lines.push(`소득금액 (수입 - 경비),${income}`);
    lines.push("");
    lines.push("=== 월별 수입/매입 현황 ===");
    lines.push("월,수입금액,필요경비,매입비용");
    monthlyData.forEach(m => {
      lines.push(`${m.name},${m.수입금액},${m.필요경비},${m.매입비용}`);
    });
    lines.push("");
    lines.push("=== 거래처별 매입 내역 ===");
    lines.push("거래처,매입금액,거래건수");
    supplierPurchases.forEach(s => {
      lines.push(`${s.name},${s.amount},${s.count}`);
    });

    const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isExempt ? '사업장현황신고' : '부가가치세신고'}_기초자료_${viewYear}년.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-xl p-3 border border-slate-100">
        <p className="text-xs font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: ₩{(entry.value || 0).toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      <PageHeader title="세무 관리" description={isExempt ? "면세사업자 사업장 현황신고 및 세무 관리" : "부가가치세 신고 및 세무 관리"} icon={FileText}>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setViewYear(y => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-slate-700 min-w-[60px] text-center">
            {viewYear}년
          </span>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setViewYear(y => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="default" className="ml-2 gap-2 rounded-xl text-xs" onClick={downloadTaxReport}>
            <Download className="h-3.5 w-3.5" /> 현황신고 자료 다운로드
          </Button>
        </div>
      </PageHeader>

      {/* Tax Type Badge */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
        <div>
          <span className="text-sm font-medium text-blue-700">면세사업자</span>
          <span className="text-xs text-blue-500 ml-2">
            화훼류(농산물)는 부가가치세 면세 대상입니다. 부가세 신고 대신 <strong>사업장 현황신고</strong>(매년 2월)와 <strong>종합소득세 신고</strong>(매년 5월)를 하시면 됩니다.
          </span>
          <a
            href="https://www.hometax.go.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 text-xs font-bold text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-0.5"
          >
            홈택스 바로가기 <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* ======== 세무 일정 알림 ======== */}
          <div>
            <h2 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" /> 세무 일정
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {taxSchedule.map((item, i) => {
                const status = getDeadlineStatus(item.deadline);
                const Icon = item.icon;
                return (
                  <Card key={i} className={`border-none shadow-sm rounded-2xl overflow-hidden ${status.urgent ? 'ring-2 ring-red-200' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl bg-${item.color}-100`}>
                            <Icon className={`h-4 w-4 text-${item.color}-600`} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                          </div>
                        </div>
                        <Badge className={`text-[10px] font-bold px-2 py-0.5 ${status.color} border-none`}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {item.detail} | 기한: {format(item.deadline, "M/d")}
                      </p>
                      <div className="mt-3 pt-3 border-t border-slate-50 flex justify-end">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all
                            bg-${item.color}-50 text-${item.color}-600 hover:bg-${item.color}-100`}
                        >
                          홈택스 신고하기 <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* ======== 사업장 현황신고 핵심 수치 ======== */}
          <div>
            <h2 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-blue-500" /> {viewYear}년 {isExempt ? "사업장 현황신고" : "부가가치세 신고"} 기초자료
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* 수입금액 */}
              <Card className="border-none shadow-md bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl overflow-hidden relative">
                <div className="absolute right-0 top-0 opacity-10 scale-150 rotate-12 p-3"><TrendingUp size={64} /></div>
                <CardHeader className="pb-1">
                  <CardTitle className="text-[10px] font-medium opacity-80 uppercase tracking-widest">
                    ① 수입금액 (총매출)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-light tracking-tight">₩{totalRevenue.toLocaleString()}</div>
                  <p className="text-[11px] text-indigo-200 mt-1 font-light">{yearOrders.length}건 매출</p>
                </CardContent>
              </Card>

              {/* 매입비용 */}
              <Card className="border-none shadow-md bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl overflow-hidden relative">
                <div className="absolute right-0 top-0 opacity-10 scale-150 rotate-12 p-3"><Building2 size={64} /></div>
                <CardHeader className="pb-1">
                  <CardTitle className="text-[10px] font-medium opacity-80 uppercase tracking-widest">
                    ② 매입비용 (꽃/자재)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-light tracking-tight">₩{totalPurchase.toLocaleString()}</div>
                  <p className="text-[11px] text-blue-200 mt-1 font-light">
                    매출대비 {totalRevenue > 0 ? ((totalPurchase / totalRevenue) * 100).toFixed(1) : 0}%
                  </p>
                </CardContent>
              </Card>

              {/* 필요경비 합계 */}
              <Card className="border-none shadow-md bg-gradient-to-br from-rose-600 to-rose-800 text-white rounded-2xl overflow-hidden relative">
                <div className="absolute right-0 top-0 opacity-10 scale-150 rotate-12 p-3"><TrendingDown size={64} /></div>
                <CardHeader className="pb-1">
                  <CardTitle className="text-[10px] font-medium opacity-80 uppercase tracking-widest">
                    ③ 필요경비 합계
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-light tracking-tight">₩{totalExpenseAmount.toLocaleString()}</div>
                  <p className="text-[11px] text-rose-200 mt-1 font-light">{yearExpenses.length}건 지출</p>
                </CardContent>
              </Card>

              {/* 소득금액 */}
              <Card className={`border-none shadow-md rounded-2xl overflow-hidden relative ${income >= 0 ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : 'bg-gradient-to-br from-red-700 to-red-900'} text-white`}>
                <div className="absolute right-0 top-0 opacity-10 scale-150 rotate-12 p-3"><Wallet size={64} /></div>
                <CardHeader className="pb-1">
                  <CardTitle className="text-[10px] font-medium opacity-80 uppercase tracking-widest">
                    ④ 소득금액 (수입-경비)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-light tracking-tight">₩{income.toLocaleString()}</div>
                  <p className="text-[11px] opacity-70 mt-1 font-light">
                    소득률 {totalRevenue > 0 ? ((income / totalRevenue) * 100).toFixed(1) : 0}%
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ======== 월별 수입/경비 차트 + 비용 항목별 내역 ======== */}
          <div className="grid gap-4 lg:grid-cols-7">
            {/* 월별 차트 */}
            <Card className="lg:col-span-4 border-none shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-500" /> 월별 수입/경비 현황
                </CardTitle>
                <CardDescription className="text-xs font-light">
                  {viewYear}년 1월 ~ 12월
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="수입금액" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="필요경비" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 비용 항목별 내역 */}
            <Card className="lg:col-span-3 border-none shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-rose-500" /> 필요경비 항목별 내역
                </CardTitle>
                <CardDescription className="text-xs font-light">
                  {isExempt ? "사업장 현황신고 비용 분류 기준" : "부가가치세/소득세 비용 분류 기준"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {taxCategoryBreakdown.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8 font-light">등록된 지출이 없습니다.</p>
                  ) : (
                    <>
                      {taxCategoryBreakdown.map((cat, i) => {
                        const pct = totalExpenseAmount > 0 ? ((cat.amount / totalExpenseAmount) * 100) : 0;
                        return (
                          <div key={i} className="group">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-slate-600">{cat.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">₩{cat.amount.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400">{pct.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-rose-400 to-rose-600"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">필요경비 합계</span>
                        <span className="text-sm font-black text-rose-600">₩{totalExpenseAmount.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ======== 거래처별 매입 내역 ======== */}
          <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-800 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" /> 거래처별 매입 내역
              </CardTitle>
              <CardDescription className="text-xs font-light">
                사업장 현황신고 시 매입처별 명세 작성에 활용
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supplierPurchases.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 font-light">거래처 연결 매입이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-2.5 px-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">순위</th>
                        <th className="py-2.5 px-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">거래처명</th>
                        <th className="py-2.5 px-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">매입금액</th>
                        <th className="py-2.5 px-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">거래건수</th>
                        <th className="py-2.5 px-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">비중</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierPurchases.map((s, i) => {
                        const pct = totalExpenseAmount > 0 ? ((s.amount / totalExpenseAmount) * 100) : 0;
                        const medals = ["🥇", "🥈", "🥉"];
                        return (
                          <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-3 text-center">
                              {i < 3 ? <span className="text-base">{medals[i]}</span> : <span className="text-xs text-slate-400 font-medium">{i + 1}</span>}
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-800">{s.name}</td>
                            <td className="py-3 px-3 text-right font-bold text-slate-800">₩{s.amount.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right text-slate-500">{s.count}건</td>
                            <td className="py-3 px-3 text-right">
                              <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 border-blue-100 text-blue-600">
                                {pct.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50">
                        <td colSpan={2} className="py-3 px-3 font-bold text-slate-700 text-xs">합계</td>
                        <td className="py-3 px-3 text-right font-black text-slate-800">
                          ₩{supplierPurchases.reduce((s, p) => s + p.amount, 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500 font-medium">
                          {supplierPurchases.reduce((s, p) => s + p.count, 0)}건
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ======== 사업장 현황신고 요약표 ======== */}
          <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-500" /> {viewYear}년 사업장 현황신고 요약
              </CardTitle>
              <CardDescription className="text-xs font-light">
                홈택스 신고 시 참고용 요약표입니다. 정확한 신고는 세무사와 상담하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-xl mx-auto">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-slate-800 text-white px-4 py-3 text-center">
                    <p className="text-xs font-bold uppercase tracking-widest">{viewYear}년 귀속 사업장 현황신고 요약</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">면세사업자 (화훼류)</p>
                  </div>
                  {/* Row: 수입금액 */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-indigo-50/30">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-8 bg-indigo-500 rounded-full" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">수입금액 (총매출)</p>
                        <p className="text-[10px] text-slate-400">과세기간 총 매출액</p>
                      </div>
                    </div>
                    <span className="text-lg font-light text-indigo-700">₩{totalRevenue.toLocaleString()}</span>
                  </div>
                  {/* Row: 매입비용 */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-8 bg-blue-500 rounded-full" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">매입비용 (꽃/자재)</p>
                        <p className="text-[10px] text-slate-400">재화의 매입액</p>
                      </div>
                    </div>
                    <span className="text-lg font-light text-blue-700">₩{totalPurchase.toLocaleString()}</span>
                  </div>
                  {/* Row: 필요경비 */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-rose-50/30">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-8 bg-rose-500 rounded-full" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">필요경비 합계</p>
                        <p className="text-[10px] text-slate-400">매입 + 임차 + 인건 + 광열 + 운송 + 기타</p>
                      </div>
                    </div>
                    <span className="text-lg font-light text-rose-700">₩{totalExpenseAmount.toLocaleString()}</span>
                  </div>
                  {/* Row: 소득금액 */}
                  <div className={`flex items-center justify-between px-4 py-4 ${income >= 0 ? 'bg-emerald-50/50' : 'bg-red-50/50'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-8 rounded-full ${income >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-black text-slate-900">소득금액</p>
                        <p className="text-[10px] text-slate-400">수입금액 - 필요경비</p>
                      </div>
                    </div>
                    <span className={`text-xl font-bold ${income >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      ₩{income.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 font-light leading-relaxed">
                    본 자료는 앱에 등록된 데이터를 기반으로 자동 생성된 <strong>참고용 요약</strong>입니다.
                    실제 세무 신고 시에는 반드시 <strong>세무사와 상담</strong>하시기 바랍니다.
                    누락된 매입/매출이 있을 수 있으며, 감가상각비 등 일부 항목은 별도 계산이 필요합니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
