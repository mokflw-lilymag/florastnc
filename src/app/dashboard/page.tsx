import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { useProducts } from "@/hooks/use-products";
import { 
  ShieldCheck, Store, Users, ArrowRight, Printer, AlertCircle, 
  ShoppingCart, Package, TrendingUp, CreditCard, Clock, ChevronRight,
  Plus, Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { parseDate } from "@/lib/date-utils";
import Link from "next/link";

export default function DashboardPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const { orders, loading: ordersLoading } = useOrders();
  const { products, loading: productsLoading } = useProducts();

  const isSuperAdmin = profile?.role === 'super_admin';
  const plan = profile?.tenants?.plan || "free";

  if (authLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          <Skeleton className="col-span-4 h-96 w-full" />
          <Skeleton className="col-span-3 h-96 w-full" />
        </div>
      </div>
    );
  }

  // Stats calculation
  const totalSales = orders
    .filter(o => o.status !== 'canceled')
    .reduce((sum, o) => sum + (o.summary?.total || 0), 0);
  
  const pendingOrders = orders.filter(o => o.status === 'processing').length;
  const lowStockItems = products.filter(p => p.stock < 10 && p.stock > 0);
  const totalCustomers = 0; // Placeholder until CRM is fully linked

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            {isSuperAdmin ? (
              <><ShieldCheck className="text-blue-600 h-8 w-8" /> 시스템 관제 센터</>
            ) : (
              <><Store className="text-indigo-600 h-8 w-8" /> {profile?.tenants?.name || "화원"} 대시보드</>
            )}
          </h1>
          <p className="text-slate-500 mt-1">
            {isSuperAdmin 
              ? "글로벌 화원 관리 및 시스템 인프라 현황입니다."
              : `${format(new Date(), 'yyyy년 MM월 dd일')} 오늘의 실시간 비즈니스 현황입니다.`
            }
          </p>
        </div>
        {!isSuperAdmin && (
          <div className="flex items-center gap-2">
            <Link href="/dashboard/orders">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                <Plus className="h-4 w-4 mr-2" /> 새 주문 등록
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Primary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-none shadow-md bg-white dark:bg-slate-900 group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="h-12 w-12 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">누적 매출 (VAT 포함)</CardDescription>
            <CardTitle className="text-2xl font-bold">₩{totalSales.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-emerald-600 font-medium">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>실시간 동기화 중</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-md bg-white dark:bg-slate-900 group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <ShoppingCart className="h-12 w-12 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">배송/준비중 주문</CardDescription>
            <CardTitle className="text-2xl font-bold">{pendingOrders}건</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-blue-600 font-medium">
              <Clock className="h-3 w-3 mr-1" />
              <span>오늘 처리 필요</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-md bg-white dark:bg-slate-900 group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <Package className="h-12 w-12 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">재고 경보 (10개 미만)</CardDescription>
            <CardTitle className="text-2xl font-bold">{lowStockItems.length}종</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-amber-600 font-medium">
              <AlertCircle className="h-3 w-3 mr-1" />
              <span>발주 검토 필요</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-md bg-white dark:bg-slate-900 group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <CreditCard className="h-12 w-12 text-purple-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">현재 이용 플랜</CardDescription>
            <CardTitle className="text-2xl font-bold uppercase">{plan.replace('_', ' ')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings" className="text-xs text-purple-600 font-medium hover:underline flex items-center">
              <span>플랜 상세 보기</span>
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Orders Cockpit */}
        <Card className="lg:col-span-4 shadow-md border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">최근 주문 현황</CardTitle>
              <CardDescription>가장 최근 접수된 5개의 주문입니다.</CardDescription>
            </div>
            <Link href="/dashboard/orders">
              <Button variant="ghost" size="sm" className="text-slate-500 text-xs">전체보기</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full">
                  <ShoppingCart className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">아직 접수된 주문이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-md">
                        <Calendar className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{order.orderer.name}</span>
                        <span className="text-[10px] text-slate-400">{format(parseDate(order.order_date), 'MM/dd HH:mm')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold">₩{order.summary.total.toLocaleString()}</span>
                      <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] px-1.5 h-5">
                        {order.status === 'completed' ? '완료' : '처리중'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Center & Alerts */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Actions */}
          <Card className="shadow-md border-slate-100 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg">빠른 실행</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <Link href="/dashboard/printer">
                <Button variant="outline" className="w-full justify-between h-12 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 group transition-all">
                  <div className="flex items-center gap-3"><Printer className="h-4 w-4 text-indigo-500" /> 리본 캔버스 앱</div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all" />
                </Button>
              </Link>
              <Link href="/dashboard/products">
                <Button variant="outline" className="w-full justify-between h-12 border-slate-200 group transition-all">
                  <div className="flex items-center gap-3"><Package className="h-4 w-4 text-emerald-500" /> 재고 및 규격 관리</div>
                  <ChevronRight className="h-4 w-4 text-slate-300 transform group-hover:translate-x-1 transition-all" />
                </Button>
              </Link>
              <Link href="/dashboard/customers">
                <Button variant="outline" className="w-full justify-between h-12 border-slate-200 group transition-all">
                  <div className="flex items-center gap-3"><Users className="h-4 w-4 text-blue-500" /> 단골 고객 관리</div>
                  <ChevronRight className="h-4 w-4 text-slate-300 transform group-hover:translate-x-1 transition-all" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Stock Alerts */}
          {lowStockItems.length > 0 && (
            <Card className="shadow-md border-red-100 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900/30 overflow-hidden">
              <div className="h-1 bg-red-400" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> 재고 부족 알림
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowStockItems.slice(0, 3).map(p => (
                  <div key={p.id} className="flex justify-between items-center text-xs p-2 rounded-md bg-white dark:bg-slate-900 border border-red-50 dark:border-red-900/20">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-red-600 font-bold">{p.stock}개 남음</span>
                  </div>
                ))}
                {lowStockItems.length > 3 && (
                  <p className="text-[10px] text-slate-400 text-center uppercase tracking-tighter">외 {lowStockItems.length - 3}개의 품목 더 있음</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
