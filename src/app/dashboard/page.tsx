"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { 
  type LucideIcon,
  ShoppingCart, 
  Users, 
  Package, 
  Printer, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  Truck,
  ScrollText,
  Boxes,
  BarChart3,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  ShieldCheck,
  Store,
  Gem,
  Zap,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";
import { usePartnerTouchUi } from "@/hooks/use-partner-touch-ui";
import { useIsCapacitorAndroid } from "@/hooks/use-capacitor-android";
import { useOrders } from "@/hooks/use-orders";
import { useProducts } from "@/hooks/use-products";
import { useExpenses } from "@/hooks/use-expenses";
import { useSettings } from "@/hooks/use-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isTomorrow, addDays, startOfToday, endOfToday, subDays, subMonths, subYears, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isSameDay, isSameWeek, isSameMonth, isSameYear, getWeekOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

// 🚀 Recharts lazy load — 차트가 필요할 때만 ~200KB 번들 로드
const SalesChart = dynamic(() => import('./components/sales-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-2xl" />,
});

export default function DashboardPage() {
  const supabase = createClient();
  const { profile, isLoading: authLoading } = useAuth();
  const touchUi = usePartnerTouchUi();
  const isAndroidApp = useIsCapacitorAndroid();
  const { settings, loading: settingsLoading } = useSettings();
  
  // Data for Tenants/Admin
  const [tenantStats, setTenantStats] = useState<{ total: number, active: number, pro: number, recent: any[] } | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  const { orders, loading: ordersLoading } = useOrders();
  const { products, loading: productsLoading } = useProducts();
  const { expenses, loading: expensesLoading } = useExpenses();
  
  const [chartPeriod, setChartPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");

  const isSuperAdmin = profile?.role === 'super_admin';
  const isLoading = authLoading || ordersLoading || productsLoading || expensesLoading || adminLoading || settingsLoading;

  useEffect(() => {
    if (isSuperAdmin) {
      const fetchAdminStats = async () => {
        try {
          setAdminLoading(true);
          const { data: allTenants, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
          if (!error && allTenants) {
            setTenantStats({
              total: allTenants.length,
              active: allTenants.filter((t: any) => t.status === 'active').length,
              pro: allTenants.filter((t: any) => t.plan === 'pro').length,
              recent: allTenants.slice(0, 5)
            });
          }
        } finally {
          setAdminLoading(false);
        }
      };
      fetchAdminStats();
    }
  }, [isSuperAdmin]);
  
  const stats = useMemo(() => {
    if (isLoading || isSuperAdmin) return null;

    const basis = settings?.revenueRecognitionBasis || 'order_date';
    
    // Revenue filtering function
    const isRevenue = (o: any) => {
      if (o.status === 'canceled') return false;
      if (basis === 'payment_completed') {
        return o.payment?.status === 'paid';
      }
      return true;
    };

    // --- TODAY STATS (FOR REGULAR USERS) ---
    const todayOrders = orders.filter(o => {
      const dateStr = o.order_date || o.created_at;
      return dateStr && isToday(new Date(dateStr));
    });

    // --- SCHEDULE STATS (Today & Tomorrow) ---
    const todayPickup = orders.filter(o => 
      o.status !== 'canceled' && 
      (o.receipt_type === "pickup_reservation" || o.receipt_type === "store_pickup") && 
      o.pickup_info?.date && 
      isToday(new Date(o.pickup_info.date))
    ).length;

    const todayDelivery = orders.filter(o => 
      o.status !== 'canceled' && 
      o.receipt_type === "delivery_reservation" && 
      o.delivery_info?.date && 
      isToday(new Date(o.delivery_info.date))
    ).length;

    const tomorrowPickup = orders.filter(o => 
      o.status !== 'canceled' && 
      (o.receipt_type === "pickup_reservation" || o.receipt_type === "store_pickup") && 
      o.pickup_info?.date && 
      isTomorrow(new Date(o.pickup_info.date))
    ).length;

    const tomorrowDelivery = orders.filter(o => 
      o.status !== 'canceled' && 
      o.receipt_type === "delivery_reservation" && 
      o.delivery_info?.date && 
      isTomorrow(new Date(o.delivery_info.date))
    ).length;

    const todayRevenue = todayOrders
      .filter(isRevenue)
      .reduce((sum, o) => sum + (o.summary?.total || 0), 0);
    
    const todayExpenses = expenses
      .filter(e => {
        const d = e.expense_date || e.created_at;
        return d && isToday(new Date(d));
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // --- OVERALL STATS ---
    const totalOrders = orders.length;
    const processingOrders = orders.filter(o => o.status === 'processing').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    
    const totalRevenue = orders
      .filter(isRevenue)
      .reduce((sum, o) => sum + (o.summary?.total || 0), 0);

    const outOfStockProducts = products.filter(p => (p.stock || 0) <= 0).length;
    const lowStockProducts = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10).length;

    // Recent orders (top 5)
    const recentOrders = [...orders].sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    ).slice(0, 5);

    return {
      totalOrders,
      processingOrders,
      completedOrders,
      totalRevenue,
      outOfStockProducts,
      lowStockProducts,
      totalProducts: products.length,
      todayCount: todayOrders.length,
      todayRevenue,
      todayExpenses,
      todayPickup,
      todayDelivery,
      tomorrowPickup,
      tomorrowDelivery,
      recentOrders
    };
  }, [orders, products, expenses, isLoading, isSuperAdmin, settings]);

  const chartData = useMemo(() => {
    if (isLoading || isSuperAdmin) return [];

    let data: any[] = [];
    const now = new Date();
    const basis = settings?.revenueRecognitionBasis || 'order_date';

    const isRevenue = (o: any) => {
      if (o.status === 'canceled') return false;
      if (basis === 'payment_completed') {
        return o.payment?.status === 'paid';
      }
      return true;
    };

    if (chartPeriod === "daily") {
      const days = eachDayOfInterval({ start: subDays(now, 13), end: now });
      data = days.map(day => {
        const dStart = startOfDay(day);
        const dEnd = endOfDay(day);
        const label = format(day, "MM.dd");
        
        const rev = orders.filter(o => {
            const dateStr = o.order_date || o.created_at;
            if (!dateStr) return false;
            const od = new Date(dateStr);
            return od >= dStart && od <= dEnd && isRevenue(o);
        }).reduce((sum, o) => sum + (o.summary?.total || 0), 0);
        
        return { name: label, 매출: rev };
      });
    } else if (chartPeriod === "weekly") {
      const weeks = eachWeekOfInterval({ start: subMonths(now, 2), end: now });
      data = weeks.map(week => {
        const wStart = startOfWeek(week);
        const wEnd = endOfWeek(week);
        const label = `${format(wStart, "M월", { locale: ko })} ${getWeekOfMonth(wStart)}주`;

        const rev = orders.filter(o => {
            const dateStr = o.order_date || o.created_at;
            if (!dateStr) return false;
            const od = new Date(dateStr);
            return od >= wStart && od <= wEnd && isRevenue(o);
        }).reduce((sum, o) => sum + (o.summary?.total || 0), 0);

        return { name: label, 매출: rev };
      });
    } else if (chartPeriod === "monthly") {
      const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
      data = months.map(month => {
        const mStart = startOfMonth(month);
        const mEnd = endOfMonth(month);
        const label = format(month, "M월", { locale: ko });

        const rev = orders.filter(o => {
            const dateStr = o.order_date || o.created_at;
            if (!dateStr) return false;
            const od = new Date(dateStr);
            return od >= mStart && od <= mEnd && isRevenue(o);
        }).reduce((sum, o) => sum + (o.summary?.total || 0), 0);

        return { name: label, 매출: rev };
      });
    } else if (chartPeriod === "yearly") {
      const years = [subYears(now, 2), subYears(now, 1), now];
      data = years.map(year => {
        const yStart = startOfYear(year);
        const yEnd = endOfYear(year);
        const label = format(year, "yyyy년");

        const rev = orders.filter(o => {
            const dateStr = o.order_date || o.created_at;
            if (!dateStr) return false;
            const od = new Date(dateStr);
            return od >= yStart && od <= yEnd && isRevenue(o);
        }).reduce((sum, o) => sum + (o.summary?.total || 0), 0);

        return { name: label, 매출: rev };
      });
    }

    return data;
  }, [orders, chartPeriod, isLoading, isSuperAdmin, settings]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="col-span-2 h-[400px] rounded-2xl" />
          <Skeleton className="col-span-1 h-[400px] rounded-2xl" />
        </div>
      </div>
    );
  }

  // --- SUPER ADMIN VIEW ---
  if (isSuperAdmin) {
    return (
      <div className="p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-700 pb-12 font-light">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <h1 className="text-3xl font-medium text-gray-900 tracking-tight">
               관리 시스템 <span className="text-indigo-600 font-bold">통합 관제</span>
             </h1>
             <p className="text-slate-600 font-medium text-sm">시스템 어드민 <span className="text-black">{profile?.full_name}</span>님, 환영합니다.</p>
          </div>
          <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-1 text-[11px] font-bold px-3 py-1 uppercase tracking-widest text-indigo-500">
             <ShieldCheck className="w-4 h-4 mr-1" /> System Admin Mode
          </div>
        </div>

        {/* Admin Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard icon={Store} label="전체 화원사" value={tenantStats?.total || 0} unit="개소" color="bg-indigo-600" />
          <AdminStatCard icon={CheckCircle2} label="활성 서비스 중" value={tenantStats?.active || 0} unit="개소" color="bg-emerald-600" />
          <AdminStatCard icon={Gem} label="PRO 플랜 이용" value={tenantStats?.pro || 0} unit="개소" color="bg-blue-600" />
          <AdminStatCard icon={Calendar} label="오늘 날짜" value={format(new Date(), 'MM/dd')} unit="" color="bg-slate-800" />
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Recent Tenant Signups */}
          <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <CardTitle className="text-lg font-light">최근 신규 가입 화원사</CardTitle>
                <CardDescription className="text-xs font-medium">SaaS 시스템에 새로 합류한 파트너사 목록입니다</CardDescription>
              </div>
              <a href="/dashboard/tenants" className="text-indigo-600 text-[11px] font-bold hover:underline uppercase tracking-tighter">전체 회원사 관리</a>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50/50 text-slate-400 font-medium uppercase text-[11px] tracking-widest leading-none">
                        <tr>
                           <th className="px-6 py-4">상호명</th>
                           <th className="px-6 py-4">플랜</th>
                           <th className="px-6 py-4">상태</th>
                           <th className="px-6 py-4 text-right">등록일</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {tenantStats?.recent.map((tenant) => (
                          <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                             <td className="px-6 py-5">
                               <div className="flex flex-col">
                                 <span className="font-bold text-slate-800">{tenant.name}</span>
                                 <span className="text-[10px] text-slate-400 font-mono uppercase">{tenant.id.substring(0,8)}</span>
                               </div>
                             </td>
                             <td className="px-6 py-5">
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 uppercase text-[10px]">
                                  {tenant.plan}
                                </Badge>
                             </td>
                             <td className="px-6 py-5">
                                <Badge variant="outline" className={cn(
                                  "border-none px-2 py-0.5 text-[10px]",
                                  tenant.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                )}>
                                  {tenant.status === 'active' ? '정상' : '정지'}
                                </Badge>
                             </td>
                             <td className="px-6 py-5 text-right font-light text-slate-400 text-xs">
                                {format(new Date(tenant.created_at), 'yyyy-MM-dd')}
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </CardContent>
          </Card>

          {/* System Quick Actions */}
          <div className="space-y-6">
             <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-slate-900 text-white">
                <CardHeader className="pb-2">
                   <CardTitle className="text-lg font-light flex items-center gap-2 text-indigo-400">
                      <ShieldCheck className="w-5 h-5" />
                      시스템 퀵 관리
                   </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 pt-2">
                   <DashboardIconButton icon={Store} label="회원사 관리" href="/dashboard/tenants" color="bg-indigo-600" />
                   <DashboardIconButton icon={ScrollText} label="공지사항" href="/dashboard/announcements" color="bg-slate-700" />
                   <DashboardIconButton icon={CreditCard} label="결제 모니터" href="/dashboard/billing-admin" color="bg-emerald-600" />
                   <DashboardIconButton icon={Settings} label="전역 설정" href="/dashboard/system-settings" color="bg-blue-600" />
                </CardContent>
             </Card>

             <Card className="border-none shadow-sm rounded-3xl bg-white border border-indigo-50 overflow-hidden">
                <CardHeader className="bg-indigo-50/30 border-b border-indigo-50/50">
                   <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-700">
                      <Zap className="w-4 h-4" /> 시스템 바로가기
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                   <Link href="/dashboard/settings" className="w-full">
                      <Button variant="ghost" className="w-full justify-start text-xs font-medium text-slate-600 hover:bg-slate-50">
                         ⚙️ 관리자 환경설정 바로가기
                      </Button>
                   </Link>
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- REGULAR TENANT VIEW ---
  return (
    <div className={cn(
      "space-y-6 max-w-7xl mx-auto animate-in fade-in duration-700 font-light",
      touchUi ? "p-4 pb-8 sm:p-6" : "p-6 pb-12",
      isAndroidApp && "pb-28"
    )}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className={cn("font-medium text-gray-900 tracking-tight", touchUi ? "text-2xl" : "text-3xl")}>
             안녕하세요 <span className="text-primary">{profile?.tenants?.name || profile?.full_name || '사용자'}</span>님!
           </h1>
           <p className="text-slate-600 font-medium text-sm">오늘 {format(new Date(), 'yyyy년 MM월 dd일')}의 현황입니다.</p>
        </div>
        <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-1">
           <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-light px-3 py-1 text-[11px]">
              실시간 동기화 활성
           </Badge>
        </div>
      </div>

      {/* Daily Settlement Quick View */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-lg shadow-blue-50 bg-gradient-to-br from-white to-blue-50/30 overflow-hidden relative group rounded-3xl">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
             <ShoppingCart className="w-12 h-12 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-blue-600 uppercase tracking-widest">오늘 주문 건수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-slate-900">{stats?.todayCount} <span className="text-lg font-light">건</span></div>
            <div className="flex items-center gap-1 text-[11px] text-blue-600 font-light mt-2 bg-blue-100/50 w-fit px-2 py-0.5 rounded-full">
               <ArrowUpRight className="w-3 h-3" /> 실시간 집계 중
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg shadow-emerald-50 bg-gradient-to-br from-white to-emerald-50/30 overflow-hidden relative group rounded-3xl">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
             <Wallet className="w-12 h-12 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-emerald-600 uppercase tracking-widest">오늘 매출액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-slate-900">₩{stats?.todayRevenue.toLocaleString()}</div>
            <div className="text-[11px] text-slate-700 font-medium mt-1.5">취소 건 제외 실매출</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg shadow-indigo-50 bg-indigo-900 text-white overflow-hidden relative group rounded-3xl md:col-span-1">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
             <Calendar className="w-12 h-12 text-white" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-indigo-300 uppercase tracking-widest">일정 요약 (방문 & 배송)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-tighter">오늘 일정</div>
                  <div className="flex flex-col">
                    <span className="text-lg font-black leading-none">
                      {((stats?.todayPickup || 0) + (stats?.todayDelivery || 0))} 
                      <span className="text-[10px] font-medium ml-1">건</span>
                    </span>
                    <span className="text-[9px] text-indigo-200 mt-1">픽업 {stats?.todayPickup} / 배송 {stats?.todayDelivery}</span>
                  </div>
               </div>
               <div className="space-y-1 border-l border-indigo-800 pl-4">
                  <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-tighter">내일 예약</div>
                  <div className="flex flex-col">
                    <span className="text-lg font-black leading-none text-amber-300">
                      {((stats?.tomorrowPickup || 0) + (stats?.tomorrowDelivery || 0))} 
                      <span className="text-[10px] font-medium ml-1 text-white">건</span>
                    </span>
                    <span className="text-[9px] text-indigo-200 mt-1">픽업 {stats?.tomorrowPickup} / 배송 {stats?.tomorrowDelivery}</span>
                  </div>
               </div>
            </div>
            <Link href="/dashboard/delivery">
              <Button variant="ghost" size="sm" className="w-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold h-7 rounded-xl gap-1.5 border-none">
                상세 일정 확인 <ArrowUpRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Performance Chart */}
        <Card className="lg:col-span-3 border-none shadow-sm rounded-3xl bg-white overflow-hidden">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-50 pb-4">
            <div>
              <CardTitle className="text-lg font-light flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                매출 지표 추이
              </CardTitle>
              <CardDescription className="text-xs font-medium">실시간 매출 데이터 흐름을 분석합니다</CardDescription>
            </div>
            <div className="flex flex-wrap bg-slate-50 p-1 rounded-xl gap-1 w-full sm:w-auto">
              {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
                <Button 
                  key={p}
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "rounded-lg font-bold transition-all flex-1 sm:flex-none min-h-10",
                    touchUi ? "text-xs px-3" : "text-[10px] h-7 px-3",
                    chartPeriod === p ? "bg-white shadow-sm text-indigo-600" : "text-slate-400"
                  )}
                  onClick={() => setChartPeriod(p)}
                >
                  {p === 'daily' ? '일별' : p === 'weekly' ? '주간별' : p === 'monthly' ? '월별' : '년별'}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-6 h-[350px]">
            <SalesChart chartData={chartData} />
          </CardContent>
        </Card>

        {/* Recent Orders List */}
        <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl bg-white/80 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 pb-4">
            <div>
              <CardTitle className="text-lg font-light">최근 주문 내역</CardTitle>
              <CardDescription className="text-xs font-medium">새로 접수된 5개의 주문입니다</CardDescription>
            </div>
            <Link href="/dashboard/orders" className="text-primary text-[11px] font-medium hover:underline uppercase tracking-tighter">전체보기</Link>
          </CardHeader>
          <CardContent className="p-0">
             <div className="lg:hidden divide-y divide-gray-50">
                {(stats?.recentOrders ?? []).map((order) => (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    className="flex flex-col gap-2 px-4 py-4 active:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-primary uppercase">{order.order_number}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-semibold border-none shrink-0",
                          order.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                          order.status === "processing" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        )}
                      >
                        {order.status === "completed" ? "완료" : order.status === "processing" ? "준비중" : "취소"}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-slate-900">{order.orderer.name}</div>
                    <div className="text-xs text-slate-600 line-clamp-2">
                      {order.items[0]?.name}{order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : ""}
                    </div>
                    <div className="text-sm font-bold text-slate-900">₩{order.summary?.total.toLocaleString()}</div>
                  </Link>
                ))}
                {stats?.recentOrders.length === 0 && (
                  <div className="px-6 py-16 text-center text-gray-400 font-medium italic">접수된 주문이 없습니다.</div>
                )}
             </div>
             <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50/50 text-slate-400 font-medium uppercase text-[11px] tracking-widest">
                      <tr>
                         <th className="px-6 py-4">주문번호</th>
                         <th className="px-6 py-4">주문자</th>
                         <th className="px-6 py-4">상품</th>
                         <th className="px-6 py-4 text-right">금액</th>
                         <th className="px-6 py-4 text-center">상태</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {stats?.recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                           <td className="px-6 py-4 font-mono text-[11px] font-light text-primary uppercase">{order.order_number}</td>
                           <td className="px-6 py-4 font-light text-slate-800 text-xs">{order.orderer.name}</td>
                           <td className="px-6 py-4 text-gray-600 truncate max-w-[150px] text-xs font-medium">
                              {order.items[0]?.name} {order.items.length > 1 ? `외 ${order.items.length - 1}건` : ''}
                           </td>
                           <td className="px-6 py-4 text-right font-medium text-slate-900 text-sm">
                              ₩{order.summary?.total.toLocaleString()}
                           </td>
                           <td className="px-6 py-4 text-center">
                              <Badge 
                                variant="outline" 
                                className={`rounded-lg px-2 py-0.5 text-[11px] font-medium border-none ${
                                  order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                  order.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}
                              >
                                {order.status === 'completed' ? '완료' : order.status === 'processing' ? '준비중' : '취소'}
                              </Badge>
                           </td>
                        </tr>
                      ))}
                      {stats?.recentOrders.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-medium italic">접수된 주문이 없습니다.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Status */}
        <div className="space-y-6">
           <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-slate-900 text-white">
              <CardHeader className="pb-2">
                 <CardTitle className="text-lg font-light flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    빠른 작업
                 </CardTitle>
              </CardHeader>
              <CardContent className={cn("grid grid-cols-2 gap-3 pt-2", touchUi && "gap-4")}>
                 <DashboardIconButton icon={ShoppingCart} label="주문등록" href="/dashboard/orders/new" color="bg-primary" largeTouch={touchUi} />
                 {isAndroidApp ? (
                   <DashboardIconButton icon={ScrollText} label="주문목록" href="/dashboard/orders" color="bg-indigo-500" largeTouch={touchUi} />
                 ) : (
                   <DashboardIconButton icon={Printer} label="리본출력" href="/dashboard/orders" color="bg-indigo-500" largeTouch={touchUi} />
                 )}
                 <DashboardIconButton icon={Truck} label="배송관리" href="/dashboard/delivery" color="bg-blue-500" largeTouch={touchUi} />
                 <DashboardIconButton icon={Boxes} label="재고관리" href="/dashboard/inventory" color="bg-amber-500" largeTouch={touchUi} />
              </CardContent>
           </Card>

           <Card className="border-none shadow-sm rounded-3xl bg-white/80">
              <CardHeader className="pb-2 border-b border-gray-50 mb-2">
                 <CardTitle className="text-lg font-light flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    재고 알림
                 </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                 <div className="flex items-center justify-between p-3 bg-red-50 rounded-2xl border border-red-100/50">
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                       <span className="text-xs font-light text-red-700">품절 상품</span>
                    </div>
                    <span className="text-lg font-medium text-red-900">{stats?.outOfStockProducts}건</span>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-amber-50 rounded-2xl border border-amber-100/50">
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-amber-500" />
                       <span className="text-xs font-light text-amber-700">재고 부족 (10개 미만)</span>
                    </div>
                    <span className="text-lg font-medium text-amber-900">{stats?.lowStockProducts}건</span>
                 </div>
                 <a href="/dashboard/inventory" className="w-full">
                    <Button variant="ghost" className="w-full rounded-2xl text-[11px] font-medium text-gray-400 hover:bg-gray-50 h-10 uppercase tracking-widest">
                       재고 관리 바로가기
                    </Button>
                 </a>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

function AdminStatCard({ icon: Icon, label, value, unit, color }: { icon: any, label: string, value: string | number, unit: string, color: string }) {
  return (
    <Card className="border-none shadow-lg shadow-slate-100 bg-white overflow-hidden relative group rounded-3xl">
      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform ${color.replace('bg-', 'text-')}`}>
         <Icon className="w-12 h-12" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-medium text-slate-900">{value} <span className="text-lg font-light">{unit}</span></div>
        <div className={`h-1 w-12 ${color} rounded-full mt-3`} />
      </CardContent>
    </Card>
  );
}

function DashboardIconButton({ icon: Icon, label, href, color = "bg-white/10", largeTouch }: { icon: LucideIcon; label: string; href: string; color?: string; largeTouch?: boolean }) {
  return (
    <Link 
      href={href}
      className={cn(
        `flex flex-col items-center justify-center rounded-2xl ${color} hover:brightness-110 active:scale-[0.98] transition-all group backdrop-blur-md border border-white/5`,
        largeTouch ? "min-h-[4.75rem] p-4 gap-1" : "p-3"
      )}
    >
      <Icon className={cn("text-white group-hover:scale-110 transition-transform", largeTouch ? "h-7 w-7 mb-0.5" : "h-6 w-6 mb-2")} />
      <span className={cn("font-medium text-white/90", largeTouch ? "text-xs" : "text-[11px]")}>{label}</span>
    </Link>
  );
}
