"use client";
import { getMessages } from "@/i18n/getMessages";

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
  ChevronRight,
  Megaphone,
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
import { de, enUS, es, fr, ja, ko, pt, ru, vi, zhCN } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { DashboardTicker } from "@/components/dashboard/dashboard-ticker";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

// 🚀 Recharts lazy load — 차트가 필요할 때만 ~200KB 번들 로드
const SalesChart = dynamic(() => import('./components/sales-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-2xl" />,
});

type TenantSalesChartPeriod = "daily" | "weekly" | "monthly" | "yearly";

function buildTenantSalesChartData(
  chartPeriod: TenantSalesChartPeriod,
  orders: any[],
  opts: {
    isLoading: boolean;
    isSuperAdmin: boolean;
    settings: { revenueRecognitionBasis?: string } | null | undefined;
  },
  baseLocale: string
): Array<{ name: string; sales: number }> {
  const { isLoading, isSuperAdmin, settings } = opts;
  if (isLoading || isSuperAdmin) return [];

  const dfLoc = dateFnsLocaleForBase(baseLocale);
  let data: Array<{ name: string; sales: number }> = [];
  const now = new Date();
  const basis = settings?.revenueRecognitionBasis || "order_date";

  const isRevenue = (o: any) => {
    if (o.status === "canceled") return false;
    if (basis === "payment_completed") {
      return o.payment?.status === "paid";
    }
    return true;
  };

  if (chartPeriod === "daily") {
    const days = eachDayOfInterval({ start: subDays(now, 13), end: now });
    data = days.map((day) => {
      const dStart = startOfDay(day);
      const dEnd = endOfDay(day);
      const label = format(day, "d MMM", { locale: dfLoc });

      const rev = orders
        .filter((o) => {
          const dateStr = o.order_date || o.created_at;
          if (!dateStr) return false;
          const od = new Date(dateStr);
          return od >= dStart && od <= dEnd && isRevenue(o);
        })
        .reduce((sum, o) => sum + (o.summary?.total || 0), 0);

      return { name: label, sales: rev };
    });
  } else if (chartPeriod === "weekly") {
    const weeks = eachWeekOfInterval({ start: subMonths(now, 2), end: now });
    data = weeks.map((week) => {
      const wStart = startOfWeek(week);
      const wEnd = endOfWeek(week);
      const weekNum = getWeekOfMonth(wStart);
      const label = pickUiText(
        baseLocale,
        `${format(wStart, "M월", { locale: ko })} ${weekNum}주`,
        `W${weekNum} ${format(wStart, "MMM d", { locale: enUS })}`,
        `W${weekNum} ${format(wStart, "d MMM", { locale: vi })}`,
        `W${weekNum} ${format(wStart, "MMM d", { locale: ja })}`,
        `W${weekNum} ${format(wStart, "MMM d", { locale: zhCN })}`,
        `W${weekNum} ${format(wStart, "MMM d", { locale: es })}`,
        `W${weekNum} ${format(wStart, "MMM d", { locale: pt })}`,
        `W${weekNum} ${format(wStart, "MMM d", { locale: fr })}`,
        `W${weekNum} ${format(wStart, "MMM d", { locale: de })}`,
        `W${weekNum} ${format(wStart, "MMM d", { locale: ru })}`,
      );

      const rev = orders
        .filter((o) => {
          const dateStr = o.order_date || o.created_at;
          if (!dateStr) return false;
          const od = new Date(dateStr);
          return od >= wStart && od <= wEnd && isRevenue(o);
        })
        .reduce((sum, o) => sum + (o.summary?.total || 0), 0);

      return { name: label, sales: rev };
    });
  } else if (chartPeriod === "monthly") {
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    data = months.map((month) => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const label = format(month, "MMM yyyy", { locale: dfLoc });

      const rev = orders
        .filter((o) => {
          const dateStr = o.order_date || o.created_at;
          if (!dateStr) return false;
          const od = new Date(dateStr);
          return od >= mStart && od <= mEnd && isRevenue(o);
        })
        .reduce((sum, o) => sum + (o.summary?.total || 0), 0);

      return { name: label, sales: rev };
    });
  } else if (chartPeriod === "yearly") {
    const years = [subYears(now, 2), subYears(now, 1), now];
    data = years.map((year) => {
      const yStart = startOfYear(year);
      const yEnd = endOfYear(year);
      const yStr = format(year, "yyyy", { locale: dfLoc });
      const label = pickUiText(
        baseLocale,
        `${yStr}년`,
        yStr,
        yStr,
        `${yStr}年`,
        `${yStr}年`,
        yStr,
        yStr,
        yStr,
        yStr,
        `${yStr} г.`,
      );

      const rev = orders
        .filter((o) => {
          const dateStr = o.order_date || o.created_at;
          if (!dateStr) return false;
          const od = new Date(dateStr);
          return od >= yStart && od <= yEnd && isRevenue(o);
        })
        .reduce((sum, o) => sum + (o.summary?.total || 0), 0);

      return { name: label, sales: rev };
    });
  }

  return data;
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const { profile, isLoading: authLoading, isSuperAdmin } = useAuth();
  const [showOrgBoard, setShowOrgBoard] = useState(false);
  const touchUi = usePartnerTouchUi();
  const isAndroidApp = useIsCapacitorAndroid();
  const { settings, loading: settingsLoading } = useSettings();
  
  // Data for Tenants/Admin
  const [tenantStats, setTenantStats] = useState<{ total: number, active: number, pro: number, recent: any[] } | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authLoading || isSuperAdmin) {
        if (!cancelled) setShowOrgBoard(false);
        return;
      }
      if (!profile?.id) return;
      let ok = false;
      if (profile.tenant_id) {
        const { data } = await supabase
          .from("tenants")
          .select("organization_id")
          .eq("id", profile.tenant_id)
          .maybeSingle();
        ok = !!data?.organization_id;
      }
      if (!ok) {
        const { count } = await supabase
          .from("organization_members")
          .select("organization_id", { count: "exact", head: true })
          .eq("user_id", profile.id);
        ok = (count ?? 0) > 0;
      }
      if (!cancelled) setShowOrgBoard(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isSuperAdmin, profile?.id, profile?.tenant_id, supabase]);

  const { orders, loading: ordersLoading } = useOrders();
  const { products, loading: productsLoading } = useProducts();
  const { expenses, loading: expensesLoading } = useExpenses();

  const isLoading = authLoading || ordersLoading || productsLoading || expensesLoading || adminLoading || settingsLoading;

  const isOrgOnlyUser = profile?.role === "org_admin" && !profile?.tenant_id;
  const hqOnlyNoWorkContext = isOrgOnlyUser && !profile?.org_work_tenant_id;

  useEffect(() => {
    if (!authLoading && hqOnlyNoWorkContext) {
      router.replace("/dashboard/hq");
    }
  }, [authLoading, hqOnlyNoWorkContext, router]);

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

  const [chartPeriod, setChartPeriod] = useState<TenantSalesChartPeriod>("daily");
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const chartOpts = useMemo(
    () => ({ isLoading, isSuperAdmin, settings }),
    [isLoading, isSuperAdmin, settings]
  );

  const chartData = useMemo(
    () => buildTenantSalesChartData(chartPeriod, orders, chartOpts, baseLocale),
    [orders, chartPeriod, chartOpts, baseLocale]
  );

  if (hqOnlyNoWorkContext) {
    return (
      <div className="p-6 flex justify-center py-24">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

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
               {tf.f00962} <span className="text-indigo-600 font-bold">{tf.f02083}</span>
             </h1>
             <p className="text-slate-600 font-medium text-sm">{tf.f01480} <span className="text-black">{profile?.full_name}</span>{tf.f01056}</p>
          </div>
          <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-1 text-[11px] font-bold px-3 py-1 uppercase tracking-widest text-indigo-500">
             <ShieldCheck className="w-4 h-4 mr-1" /> System Admin Mode
          </div>
        </div>

        {/* Admin Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard icon={Store} label={tf.f01807} value={tenantStats?.total || 0} unit={tf.f00865} color="bg-indigo-600" />
          <AdminStatCard icon={CheckCircle2} label={tf.f02224} value={tenantStats?.active || 0} unit={tf.f00865} color="bg-emerald-600" />
          <AdminStatCard icon={Gem} label={tf.f02286} value={tenantStats?.pro || 0} unit={tf.f00865} color="bg-blue-600" />
          <AdminStatCard icon={Calendar} label={tf.f01602} value={format(new Date(), "P", { locale: dfLoc })} unit="" color="bg-slate-800" />
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Recent Tenant Signups */}
          <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <CardTitle className="text-lg font-light">{tf.f02012}</CardTitle>
                <CardDescription className="text-xs font-medium">{tf.f02287}</CardDescription>
              </div>
              <a href="/dashboard/tenants" className="text-indigo-600 text-[11px] font-bold hover:underline uppercase tracking-tighter">{tf.f01809}</a>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50/50 text-slate-400 font-medium uppercase text-[11px] tracking-widest leading-none">
                        <tr>
                           <th className="px-6 py-4">{tf.f01367}</th>
                           <th className="px-6 py-4">{tf.f02143}</th>
                           <th className="px-6 py-4">{tf.f00319}</th>
                           <th className="px-6 py-4 text-right">{tf.f00170}</th>
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
                                  {tenant.status === 'active' ? tf.f01819 : tf.f01822}
                                </Badge>
                             </td>
                             <td className="px-6 py-5 text-right font-light text-slate-400 text-xs">
                                {format(new Date(tenant.created_at), "P", { locale: dfLoc })}
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
                      {tf.f01486}
                   </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 pt-2">
                   <DashboardIconButton icon={Store} label={tf.f02230} href="/dashboard/tenants" color="bg-indigo-600" />
                   <DashboardIconButton icon={ScrollText} label={tf.f00958} href="/dashboard/announcements" color="bg-slate-700" />
                   <DashboardIconButton icon={CreditCard} label={tf.f00911} href="/dashboard/billing-admin" color="bg-emerald-600" />
                   <DashboardIconButton icon={Settings} label={tf.f01786} href="/dashboard/system-settings" color="bg-blue-600" />
                </CardContent>
             </Card>

             <Card className="border-none shadow-sm rounded-3xl bg-white border border-indigo-50 overflow-hidden">
                <CardHeader className="bg-indigo-50/30 border-b border-indigo-50/50">
                   <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-700">
                      <Zap className="w-4 h-4" /> {tf.f01479}
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                   <Link href="/dashboard/settings" className="w-full">
                      <Button variant="ghost" className="w-full justify-start text-xs font-medium text-slate-600 hover:bg-slate-50">
                         ⚙️ {tf.f00968}
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
      <DashboardTicker />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className={cn("font-medium text-gray-900 tracking-tight", touchUi ? "text-2xl" : "text-3xl")}>
             {tf.f01523} <span className="text-primary">{profile?.tenants?.name || profile?.full_name || tf.f01322}</span>{tf.f01057}
           </h1>
           <p className="text-slate-600 font-medium text-sm">
             {tf.f00458}{" "}
             {format(new Date(), "PPP", {
               locale: dateFnsLocaleForBase(baseLocale),
             })}{" "}
             {tf.f01665}
           </p>
        </div>
        <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-1">
           <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-light px-3 py-1 text-[11px]">
              {tf.f01506}
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
            <CardTitle className="text-xs font-medium text-blue-600 uppercase tracking-widest">{tf.f01606}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-slate-900">{stats?.todayCount} <span className="text-lg font-light">{tf.f00033}</span></div>
            <div className="flex items-center gap-1 text-[11px] text-blue-600 font-light mt-2 bg-blue-100/50 w-fit px-2 py-0.5 rounded-full">
               <ArrowUpRight className="w-3 h-3" /> {tf.f01510}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg shadow-emerald-50 bg-gradient-to-br from-white to-emerald-50/30 overflow-hidden relative group rounded-3xl">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
             <Wallet className="w-12 h-12 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-emerald-600 uppercase tracking-widest">{tf.f01604}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-slate-900">₩{stats?.todayRevenue.toLocaleString()}</div>
            <div className="text-[11px] text-slate-700 font-medium mt-1.5">{tf.f02034}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg shadow-indigo-50 bg-indigo-900 text-white overflow-hidden relative group rounded-3xl md:col-span-1">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
             <Calendar className="w-12 h-12 text-white" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-indigo-300 uppercase tracking-widest">{tf.f01720}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-tighter">{tf.f01605}</div>
                  <div className="flex flex-col">
                    <span className="text-lg font-black leading-none">
                      {((stats?.todayPickup || 0) + (stats?.todayDelivery || 0))} 
                      <span className="text-[10px] font-medium ml-1">{tf.f00033}</span>
                    </span>
                    <span className="text-[9px] text-indigo-200 mt-1">{tf.f00752} {stats?.todayPickup} / {tf.f00240} {stats?.todayDelivery}</span>
                  </div>
               </div>
               <div className="space-y-1 border-l border-indigo-800 pl-4">
                  <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-tighter">{tf.f01036}</div>
                  <div className="flex flex-col">
                    <span className="text-lg font-black leading-none text-amber-300">
                      {((stats?.tomorrowPickup || 0) + (stats?.tomorrowDelivery || 0))} 
                      <span className="text-[10px] font-medium ml-1 text-white">{tf.f00033}</span>
                    </span>
                    <span className="text-[9px] text-indigo-200 mt-1">{tf.f00752} {stats?.tomorrowPickup} / {tf.f00240} {stats?.tomorrowDelivery}</span>
                  </div>
               </div>
            </div>
            <Link href="/dashboard/delivery">
              <Button variant="ghost" size="sm" className="w-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold h-7 rounded-xl gap-1.5 border-none">
                {tf.f01341} <ArrowUpRight className="w-3 h-3" />
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
                {tf.f01175}
              </CardTitle>
              <CardDescription className="text-xs font-medium">{tf.f01507}</CardDescription>
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
                  {p === "daily" ? tf.f01713 : p === "weekly" ? tf.f01865 : p === "monthly" ? tf.f01648 : tf.f01049}
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
              <CardTitle className="text-lg font-light">{tf.f02014}</CardTitle>
              <CardDescription className="text-xs font-medium">{tf.f01385}</CardDescription>
            </div>
            <Link href="/dashboard/orders" className="text-primary text-[11px] font-medium hover:underline uppercase tracking-tighter">{tf.f01811}</Link>
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
                        {order.status === "completed" ? tf.f00471 : order.status === "processing" ? tf.f00654 : tf.f00702}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-slate-900">{order.orderer.name}</div>
                    <div className="text-xs text-slate-600 line-clamp-2">
                      {order.items[0]?.name}{order.items.length > 1 ? ` ${tf.f00475} ${order.items.length - 1}${tf.f00033}` : ""}
                    </div>
                    <div className="text-sm font-bold text-slate-900">₩{order.summary?.total.toLocaleString()}</div>
                  </Link>
                ))}
                {stats?.recentOrders.length === 0 && (
                  <div className="px-6 py-16 text-center text-gray-400 font-medium italic">{tf.f01815}</div>
                )}
             </div>
             <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50/50 text-slate-400 font-medium uppercase text-[11px] tracking-widest">
                      <tr>
                         <th className="px-6 py-4">{tf.f00624}</th>
                         <th className="px-6 py-4">{tf.f00640}</th>
                         <th className="px-6 py-4">{tf.f01350}</th>
                         <th className="px-6 py-4 text-right">{tf.f00097}</th>
                         <th className="px-6 py-4 text-center">{tf.f00319}</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {stats?.recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                           <td className="px-6 py-4 font-mono text-[11px] font-light text-primary uppercase">{order.order_number}</td>
                           <td className="px-6 py-4 font-light text-slate-800 text-xs">{order.orderer.name}</td>
                           <td className="px-6 py-4 text-gray-600 truncate max-w-[150px] text-xs font-medium">
                              {order.items[0]?.name} {order.items.length > 1 ? `${tf.f00475} ${order.items.length - 1}${tf.f00033}` : ''}
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
                                {order.status === 'completed' ? tf.f00471 : order.status === 'processing' ? tf.f00654 : tf.f00702}
                              </Badge>
                           </td>
                        </tr>
                      ))}
                      {stats?.recentOrders.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-medium italic">{tf.f01815}</td></tr>
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
                    {tf.f01316}
                 </CardTitle>
              </CardHeader>
              <CardContent className={cn("grid grid-cols-2 gap-3 pt-2", touchUi && "gap-4")}>
                 <DashboardIconButton icon={ShoppingCart} label={tf.f01874} href="/dashboard/orders/new" color="bg-primary" largeTouch={touchUi} />
                 {isAndroidApp ? (
                   <DashboardIconButton icon={ScrollText} label={tf.f01875} href="/dashboard/orders" color="bg-indigo-500" largeTouch={touchUi} />
                 ) : (
                   <DashboardIconButton icon={Printer} label={tf.f01134} href="/dashboard/orders" color="bg-indigo-500" largeTouch={touchUi} />
                 )}
                 <DashboardIconButton icon={Truck} label={tf.f01237} href="/dashboard/delivery" color="bg-blue-500" largeTouch={touchUi} />
                 <DashboardIconButton icon={Boxes} label={tf.f01763} href="/dashboard/inventory" color="bg-amber-500" largeTouch={touchUi} />
                 {showOrgBoard ? (
                  <DashboardIconButton icon={Megaphone} label={tf.f01266} href="/dashboard/org-board" color="bg-violet-600" largeTouch={touchUi} />
                 ) : null}
              </CardContent>
           </Card>

           <Card className="border-none shadow-sm rounded-3xl bg-white/80">
              <CardHeader className="pb-2 border-b border-gray-50 mb-2">
                 <CardTitle className="text-lg font-light flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    {tf.f01762}
                 </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                 <div className="flex items-center justify-between p-3 bg-red-50 rounded-2xl border border-red-100/50">
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                       <span className="text-xs font-light text-red-700">{tf.f02135}</span>
                    </div>
                    <span className="text-lg font-medium text-red-900">{stats?.outOfStockProducts}{tf.f00033}</span>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-amber-50 rounded-2xl border border-amber-100/50">
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-amber-500" />
                       <span className="text-xs font-light text-amber-700">{tf.f01761}</span>
                    </div>
                    <span className="text-lg font-medium text-amber-900">{stats?.lowStockProducts}{tf.f00033}</span>
                 </div>
                 <a href="/dashboard/inventory" className="w-full">
                    <Button variant="ghost" className="w-full rounded-2xl text-[11px] font-medium text-gray-400 hover:bg-gray-50 h-10 uppercase tracking-widest">
                       {tf.f01758}
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
