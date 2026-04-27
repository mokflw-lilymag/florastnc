"use client";
import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  ShoppingBag, 
  Calendar, 
  Download,
  AlertCircle,
  TrendingDown,
  PieChart as PieIcon,
  ChevronRight,
  Printer,
  Activity,
  ArrowRightLeft,
  Wallet
} from 'lucide-react';
import { useOrders } from '@/hooks/use-orders';
import { useExpenses } from '@/hooks/use-expenses';
import { format, startOfMonth, endOfMonth, subDays, isSameDay, isToday, startOfToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

export default function ReportsPage() {
  const { orders, loading: ordersLoading } = useOrders();
  const { expenses, loading: expensesLoading } = useExpenses();
  const [dateRange, setDateRange] = useState("today"); // Default to today for "일일정산"
  const locale = usePreferredLocale();
  const isKo = toBaseLocale(locale) === "ko";
  const tr = (ko: string, en: string) => (isKo ? ko : en);

  const stats = useMemo(() => {
    const now = new Date();
    let fromDate = startOfToday();
    
    if (dateRange === "week") fromDate = subDays(now, 7);
    if (dateRange === "month") fromDate = startOfMonth(now);
    if (dateRange === "year") fromDate = new Date(now.getFullYear(), 0, 1);

    const filteredOrders = orders.filter(o => {
      const d = new Date(o.order_date);
      if (dateRange === "today") return isToday(d);
      return d >= fromDate && o.status !== 'canceled';
    });

    const filteredExpenses = expenses.filter(e => {
      const d = new Date(e.expense_date);
      if (dateRange === "today") return isToday(d);
      return d >= fromDate;
    });

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.summary?.total || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    const paymentMethods: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const method = o.payment?.method || tr("기타", "Other");
      paymentMethods[method] = (paymentMethods[method] || 0) + (o.summary?.total || 0);
    });

    const topProducts: Record<string, { name: string, count: number, total: number }> = {};
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        if (!topProducts[item.name]) topProducts[item.name] = { name: item.name, count: 0, total: 0 };
        topProducts[item.name].count += item.quantity;
        topProducts[item.name].total += (item.price * item.quantity);
      });
    });

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      orderCount: filteredOrders.length,
      avgOrderValue: filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0,
      paymentMethods: Object.entries(paymentMethods).sort((a,b) => b[1] - a[1]),
      topProducts: Object.values(topProducts).sort((a,b) => b.total - a.total).slice(0, 5)
    };
  }, [orders, expenses, dateRange]);

  const loading = ordersLoading || expensesLoading;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <PageHeader 
        title={tr("보고서 및 통계", "Reports & Analytics")} 
        description={tr("기간별 매출, 지출 및 수익 현황을 한눈에 파악하세요.", "Track revenue, expenses, and profit by period.")}
        icon={BarChart3}
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl border-gray-200 hover:bg-gray-100 transition-all">
             <Printer className="w-4 h-4 mr-2" /> {tr("인쇄", "Print")}
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl border-gray-200 hover:bg-gray-100 transition-all">
             <Download className="w-4 h-4 mr-2" /> {tr("엑셀 다운로드", "Excel Download")}
          </Button>
        </div>
      </PageHeader>

      {/* Filter Tabs */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
         <Tabs value={dateRange} onValueChange={setDateRange} className="w-full md:w-auto">
            <TabsList className="bg-gray-100/80 p-1 rounded-2xl border border-white shadow-sm overflow-hidden h-11">
               <TabsTrigger value="today" className="rounded-xl font-bold px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">{tr("일일 정산", "Today")}</TabsTrigger>
               <TabsTrigger value="week" className="rounded-xl font-bold px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">{tr("주간", "Week")}</TabsTrigger>
               <TabsTrigger value="month" className="rounded-xl font-bold px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">{tr("월간", "Month")}</TabsTrigger>
               <TabsTrigger value="year" className="rounded-xl font-bold px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">{tr("연간", "Year")}</TabsTrigger>
            </TabsList>
         </Tabs>
         <Badge variant="outline" className="rounded-full px-4 py-1.5 font-bold text-gray-500 bg-white border-gray-100 shadow-sm">
            {tr("기준 기간", "Period")}: {dateRange === 'today' ? format(new Date(), 'yyyy-MM-dd') : 
                        dateRange === 'week' ? tr('최근 7일', 'Last 7 days') : 
                        dateRange === 'month' ? format(new Date(), 'yyyy-MM') : 
                        (isKo ? format(new Date(), 'yyyy년') : format(new Date(), 'yyyy'))}
         </Badge>
      </div>

      {/* Top Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border-none shadow-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white overflow-hidden relative group">
           <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all" />
           <CardHeader className="pb-2">
             <CardTitle className="text-blue-100 text-sm font-bold tracking-widest uppercase items-center flex gap-2">
                <TrendingUp className="w-4 h-4" /> {tr("총 매출액", "Total Revenue")}
             </CardTitle>
           </CardHeader>
           <CardContent>
              {loading ? <Skeleton className="h-10 w-32 bg-white/20" /> : (
                <div className="text-4xl font-extrabold tracking-tight">
                  <span className="text-2xl mr-1 font-normal opacity-80">₩</span>
                  {stats.totalRevenue.toLocaleString()}
                </div>
              )}
              <div className="text-blue-100/70 text-xs mt-3 font-medium bg-black/10 w-fit px-2 py-1 rounded-md">
                 {tr("선택된 기간 내 주문 취소 제외 실적", "Excludes canceled orders in period")}
              </div>
           </CardContent>
        </Card>

        <Card className="border-none shadow-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white overflow-hidden relative group">
           <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all" />
           <CardHeader className="pb-2">
             <CardTitle className="text-rose-100 text-sm font-bold tracking-widest uppercase items-center flex gap-2">
                <TrendingDown className="w-4 h-4" /> {tr("총 지출액", "Total Expenses")}
             </CardTitle>
           </CardHeader>
           <CardContent>
              {loading ? <Skeleton className="h-10 w-32 bg-white/20" /> : (
                <div className="text-4xl font-extrabold tracking-tight">
                  <span className="text-2xl mr-1 font-normal opacity-80">₩</span>
                  {stats.totalExpenses.toLocaleString()}
                </div>
              )}
               <div className="text-rose-100/70 text-xs mt-3 font-medium bg-black/10 w-fit px-2 py-1 rounded-md">
                 {tr("배송비, 자재비, 운영비 등 지출 합계", "Delivery, materials, operations, etc.")}
              </div>
           </CardContent>
        </Card>

        <Card className={`border-none shadow-2xl overflow-hidden relative group transition-all ${
           stats.netProfit >= 0 ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-gray-700 to-gray-800"
        } text-white`}>
           <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-125 transition-all" />
           <CardHeader className="pb-2">
             <CardTitle className="text-emerald-100 text-sm font-bold tracking-widest uppercase items-center flex gap-2">
                <DollarSign className="w-4 h-4" /> {tr("순 이익", "Net Profit")}
             </CardTitle>
           </CardHeader>
           <CardContent>
              {loading ? <Skeleton className="h-10 w-32 bg-white/20" /> : (
                <div className={`text-4xl font-black tracking-tighter ${stats.netProfit < 0 ? 'text-gray-400' : 'text-white'}`}>
                  <span className="text-2xl mr-1 font-normal opacity-70">₩</span>
                  {stats.netProfit.toLocaleString()}
                </div>
              )}
              <div className={`text-xs mt-4 font-bold ${stats.netProfit >= 0 ? 'text-emerald-100' : 'text-gray-400'} flex items-center gap-1`}>
                 {tr("매출 - 지출 손익계산 결과", "Revenue - Expense result")} {stats.netProfit < 0 && <AlertCircle className="w-3.5 h-3.5" />}
              </div>
           </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Metrics */}
        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
               <Activity className="w-5 h-5 text-blue-500" /> {tr("주요 성과 지표 (KPI)", "Key Performance Metrics")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
             <div className="flex justify-between items-center group">
                <div className="flex flex-col gap-0.5">
                   <span className="text-sm font-bold text-gray-500 group-hover:text-gray-900 transition-colors">{tr("평균 주문 단가", "Average Order Value")}</span>
                   <span className="text-xs text-muted-foreground">{tr("건당 발생하는 평균 매출액", "Average revenue per order")}</span>
                </div>
                <div className="text-right">
                   <div className="text-xl font-extrabold text-blue-600">₩{Math.round(stats.avgOrderValue).toLocaleString()}</div>
                   <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">AOV Metric</div>
                </div>
             </div>
             
             <div className="flex justify-between items-center group">
                <div className="flex flex-col gap-0.5">
                   <span className="text-sm font-bold text-gray-500 group-hover:text-gray-900 transition-colors">{tr("전체 주문 건수", "Total Orders")}</span>
                   <span className="text-xs text-muted-foreground">{tr("선택 기간 내 유효 주문 총합", "Valid orders in selected period")}</span>
                </div>
                <div className="text-right">
                   <div className="text-xl font-extrabold text-gray-900">{stats.orderCount.toLocaleString()} <span className="text-sm font-medium">{tr("건", "orders")}</span></div>
                   <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">Orders Total</div>
                </div>
             </div>

             <div className="pt-4 border-t border-gray-50">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{tr("결제 수단별 분포", "Payment Method Mix")}</h4>
                <div className="space-y-4">
                  {stats.paymentMethods.length > 0 ? stats.paymentMethods.map(([method, amount], idx) => {
                    const percentage = stats.totalRevenue > 0 ? (amount / stats.totalRevenue) * 100 : 0;
                    return (
                      <div key={method} className="space-y-1.5">
                         <div className="flex justify-between text-xs font-bold px-1">
                            <span className="text-gray-700">{method}</span>
                            <span className="text-primary">{percentage.toFixed(1)}%</span>
                         </div>
                         <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-primary rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }} />
                         </div>
                         <div className="text-right text-[10px] text-gray-400 font-medium">₩{amount.toLocaleString()}</div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-4 text-gray-400 text-xs italic font-medium">{tr("데이터가 없습니다.", "No data.")}</div>
                  )}
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
               <ShoppingBag className="w-5 h-5 text-amber-500" /> {tr("최고 매출 상품 Top 5", "Top 5 Products")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
             <div className="space-y-2">
                {stats.topProducts.map((p, idx) => (
                  <div key={p.name} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/30 hover:bg-gray-100/50 transition-all border border-transparent hover:border-gray-200 group">
                     <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center font-black text-lg text-gray-300 group-hover:text-primary group-hover:border-primary/20 transition-all">
                        {idx + 1}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="text-base font-bold text-gray-800 truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-2 mt-0.5">
                           {tr("전체", "Total")} {p.count}{tr("개 판매", " sold")} <span className="opacity-20">|</span> ₩{Math.round(p.total/p.count).toLocaleString()} {tr("단가", "avg")}
                        </div>
                     </div>
                     <div className="text-right shrink-0">
                        <div className="text-lg font-black text-gray-900">₩{p.total.toLocaleString()}</div>
                        <Badge variant="secondary" className="text-[10px] font-bold h-5 px-1.5 bg-gray-200/50 text-gray-500 border-none">
                           {(stats.totalRevenue > 0 ? (p.total / stats.totalRevenue) * 100 : 0).toFixed(1)}% {tr("점유", "share")}
                        </Badge>
                     </div>
                  </div>
                ))}
                {stats.topProducts.length === 0 && (
                   <div className="h-64 flex flex-col items-center justify-center text-gray-300 space-y-2">
                      <ShoppingBag className="w-12 h-12" />
                      <p className="font-bold">{tr("데이터가 수집되지 않았습니다.", "No data collected yet.")}</p>
                   </div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>

      {dateRange === 'today' && (
        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-900 text-white">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" /> {tr("금일 정산 상세 내역", "Today's Settlement Details")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
                      <tr>
                         <th className="px-6 py-4">{tr("구분", "Category")}</th>
                         <th className="px-6 py-4 text-center">{tr("건수", "Count")}</th>
                         <th className="px-6 py-4 text-right">{tr("총 금액", "Amount")}</th>
                         <th className="px-6 py-4">{tr("비고", "Note")}</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      <tr>
                         <td className="px-6 py-4 font-bold text-gray-700">{tr("판매 매출 (카드)", "Sales (Card)")}</td>
                         <td className="px-6 py-4 text-center">{orders.filter(o => isToday(new Date(o.order_date)) && (o.payment?.method === 'card' || o.payment?.method === 'mainpay')).length}</td>
                         <td className="px-6 py-4 text-right font-black text-blue-600">
                            ₩{orders.filter(o => isToday(new Date(o.order_date)) && (o.payment?.method === 'card' || o.payment?.method === 'mainpay')).reduce((sum, o) => sum + (o.summary?.total || 0), 0).toLocaleString()}
                         </td>
                         <td className="px-6 py-4 text-xs text-gray-400">{tr("PG 결제 및 앱 내 결제 포함", "Includes PG and in-app payments")}</td>
                      </tr>
                      <tr>
                         <td className="px-6 py-4 font-bold text-gray-700">{tr("판매 매출 (기타/현금)", "Sales (Other/Cash)")}</td>
                         <td className="px-6 py-4 text-center">{orders.filter(o => isToday(new Date(o.order_date)) && o.payment?.method !== 'card' && o.payment?.method !== 'mainpay').length}</td>
                         <td className="px-6 py-4 text-right font-black text-indigo-600">
                            ₩{orders.filter(o => isToday(new Date(o.order_date)) && o.payment?.method !== 'card' && o.payment?.method !== 'mainpay').reduce((sum, o) => sum + (o.summary?.total || 0), 0).toLocaleString()}
                         </td>
                         <td className="px-6 py-4 text-xs text-gray-400">{tr("계좌이체, 현금, 기타 수단", "Bank transfer, cash, other methods")}</td>
                      </tr>
                      <tr className="bg-rose-50/30">
                         <td className="px-6 py-4 font-bold text-rose-700">{tr("총 지출 (운영/배송)", "Total Expense (Ops/Delivery)")}</td>
                         <td className="px-6 py-4 text-center">{expenses.filter(e => isToday(new Date(e.expense_date))).length}</td>
                         <td className="px-6 py-4 text-right font-black text-rose-600">
                            - ₩{expenses.filter(e => isToday(new Date(e.expense_date))).reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}
                         </td>
                         <td className="px-6 py-4 text-xs text-rose-400">{tr("배송 시 자동 집계 포함", "Includes auto-collected delivery costs")}</td>
                      </tr>
                      <tr className="bg-slate-900 text-white font-black text-lg">
                         <td className="px-6 py-6" colSpan={2}>{tr("금일 예치 손익계산 (Net)", "Today's Net Settlement")}</td>
                         <td className="px-6 py-6 text-right text-emerald-400">
                            ₩{(orders.filter(o => isToday(new Date(o.order_date))).reduce((sum, o) => sum + (o.summary?.total || 0), 0) - 
                               expenses.filter(e => isToday(new Date(e.expense_date))).reduce((sum, e) => sum + (e.amount || 0), 0)).toLocaleString()}
                         </td>
                         <td className="px-6 py-6 text-xs font-normal text-slate-400">{tr("마감 시각", "Closed at")}: {format(new Date(), 'HH:mm')}</td>
                      </tr>
                   </tbody>
                </table>
             </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
         <div className="absolute right-0 top-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-150 transition-all duration-1000" />
         <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
               <h3 className="text-3xl font-black text-white tracking-tight">{tr("수익 구조의 유료 멤버십 혜택", "Unlock premium growth insights")}</h3>
               <p className="text-gray-400 mt-2 text-lg font-medium">{tr("더 상세한 고객 분석과 기간별 성장 리포트로 비즈니스를 확장하세요.", "Expand your business with deeper customer analytics and growth reports.")}</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-white font-black px-10 h-14 rounded-2xl text-lg shadow-xl shadow-primary/30 active:scale-95 transition-all">
               {tr("프로 플랜 업그레이드", "Upgrade to Pro")} <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
         </div>
      </div>
    </div>
  );
}
