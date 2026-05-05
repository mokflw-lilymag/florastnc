"use client";
import { getMessages } from "@/i18n/getMessages";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { 
  PlusCircle, Search, MoreHorizontal, MessageSquare, 
  Upload, Download, FileText, ShoppingCart, 
  Package, Target, RefreshCw, Trash2, XCircle,
  Calendar as CalendarIcon, ExternalLink, Printer, ClipboardList, Info,
  TrendingUp, CreditCard, ShoppingBag, ArrowUpRight, Share2, Loader2, AlertCircle,
  BarChart3, DollarSign, CheckCircle2, Monitor, CloudDownload
} from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, isToday, isThisMonth, isThisYear, parseISO, startOfToday, subDays } from "date-fns";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { useOrders } from "@/hooks/use-orders";
import { Order } from "@/types/order";
import { parseDate } from "@/lib/date-utils";
import { smartSplitRibbonMessage } from "@/lib/order-utils";
const OrderDetailDialog = dynamic(() => import("./components/order-detail-dialog").then(mod => mod.OrderDetailDialog), { ssr: false });
const OrderEditDialog = dynamic(() => import("./components/order-edit-dialog").then(mod => mod.OrderEditDialog), { ssr: false });
const MessagePrintDialog = dynamic(() => import("./components/message-print-dialog").then(mod => mod.MessagePrintDialog), { ssr: false });
const OrderOutsourceDialog = dynamic(() => import("./components/order-outsource-dialog").then(mod => mod.OrderOutsourceDialog), { ssr: false });

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { exportOrdersToExcel, prepareOrdersForGoogleSheet, exportToGoogleSheet } from "@/lib/excel-export";
import { createClient } from "@/utils/supabase/client";
import { useSettings } from "@/hooks/use-settings";
import { FileSpreadsheet, Settings as SettingsIcon, ChevronDown, Check, CreditCard as PaymentIcon } from "lucide-react";
import { 
  DropdownMenuSub, 
  DropdownMenuSubContent, 
  DropdownMenuSubTrigger, 
  DropdownMenuPortal 
} from "@/components/ui/dropdown-menu";
import { printDocument } from "@/lib/print-document";
import { useIsCapacitorAndroid } from "@/hooks/use-capacitor-android";
import { usePartnerTouchUi } from "@/hooks/use-partner-touch-ui";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

export default function OrdersPage() {
  const isAndroidApp = useIsCapacitorAndroid();
  const touchUi = usePartnerTouchUi();
  const { profile, isLoading: authLoading, tenantId } = useAuth();
  const pathname = usePathname();
  const plan = profile?.tenants?.plan || "free";
  const isSuperAdmin = profile?.role === 'super_admin';
  const supabase = createClient();
  const { settings } = useSettings();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const tr = (
    ko: string,
    en: string,
    vi?: string,
    ja?: string,
    zh?: string,
    es?: string,
    pt?: string,
    fr?: string,
    de?: string,
    ru?: string,
  ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru);
  const formatStatCount = (n: number) =>
    n === 1 ? tf.f00796.replace("{n}", String(n)) : tf.f00795.replace("{n}", String(n));
  const statusLabels: Record<string, string> = {
    all: tf.f00556,
    processing: tf.f00654,
    completed: tf.f00471,
    canceled: tf.f00702
  };

  const receiptTypeLabels: Record<string, string> = {
    all: tf.f00558,
    delivery_reservation: tf.f00240,
    pickup_reservation: tf.f00383,
    store_pickup: tf.f00195
  };

  const periodLabels: Record<string, string> = {
    "2months": tf.f00111,
    "3months": tf.f00688,
    "6months": tf.f00689,
    "1year": tf.f00687,
    "all": tf.f00555
  };

  const basisLabels: Record<string, string> = {
    "order_date": tf.f00388,
    "created_at": tf.f00639
  };

  const { 
    orders, 
    loading, 
    fetchOrdersByRange, 
    updateOrderStatus, 
    updatePaymentStatus,
    deleteOrder, 
    cancelOrder 
  } = useOrders();

  const hasAccess = authLoading || isSuperAdmin || ['pro', 'erp_only'].includes(plan);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedReceiptType, setSelectedReceiptType] = useState("all");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [isOrderEditOpen, setIsOrderEditOpen] = useState(false);
  const [isOutsourceOpen, setIsOutsourceOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMessagePrintOpen, setIsMessagePrintOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isPrintTargetModalOpen, setIsPrintTargetModalOpen] = useState(false);
  const [pendingPrintOrder, setPendingPrintOrder] = useState<Order | null>(null);

  // Google Sheets export date range
  const [exportStartDate, setExportStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [exportEndDate, setExportEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);
  const [isCafe24Syncing, setIsCafe24Syncing] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPeriod, setCurrentPeriod] = useState<string | null>(searchParams.get('period') || '2months');
  const [filterBasis, setFilterBasis] = useState<'order_date' | 'created_at'>((searchParams.get('basis') as any) || 'order_date');

  useEffect(() => {
    const periodFromUrl = searchParams.get('period') || '2months';
    const basisFromUrl = searchParams.get('basis') || 'order_date';
    
    if (currentPeriod !== periodFromUrl || filterBasis !== basisFromUrl) {
      const current = new URLSearchParams(searchParams.toString());
      current.set('period', currentPeriod || '2months');
      current.set('basis', filterBasis);
      const target = (pathname || "") + "?" + current.toString();
      (router.push as any)(target);
    }
    
    // Fetch data based on period AND basis
    if (currentPeriod === '2months') fetchOrdersByRange(subDays(new Date(), 60), new Date(), filterBasis);
    else if (currentPeriod === '3months') fetchOrdersByRange(subDays(new Date(), 90), new Date(), filterBasis);
    else if (currentPeriod === '6months') fetchOrdersByRange(subDays(new Date(), 180), new Date(), filterBasis);
    else if (currentPeriod === '1year') fetchOrdersByRange(subDays(new Date(), 365), new Date(), filterBasis);
    else if (currentPeriod === 'all') fetchOrdersByRange(new Date(2000, 0, 1), new Date(), filterBasis);
  }, [currentPeriod, filterBasis, searchParams, pathname, router, fetchOrdersByRange]);

  // 쇼핑몰 통합 동기화 (카페24 + 네이버)
  const syncShopOrders = async (silent = false) => {
    if (!tenantId) return;
    if (!silent) setIsCafe24Syncing(true);

    const refreshOrders = () => {
      if (currentPeriod === '2months') fetchOrdersByRange(subDays(new Date(), 60), new Date(), filterBasis);
      else if (currentPeriod === '3months') fetchOrdersByRange(subDays(new Date(), 90), new Date(), filterBasis);
      else if (currentPeriod === '6months') fetchOrdersByRange(subDays(new Date(), 180), new Date(), filterBasis);
      else if (currentPeriod === '1year') fetchOrdersByRange(subDays(new Date(), 365), new Date(), filterBasis);
      else if (currentPeriod === 'all') fetchOrdersByRange(new Date(2000, 0, 1), new Date(), filterBasis);
    };

    try {
      // Cafe24 + Naver parallel sync
      const [cafe24Res, naverRes] = await Promise.allSettled([
        fetch('/api/sync/cafe24', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant_id: tenantId, uiLocale: locale })
        }).then(r => r.json()),
        fetch('/api/sync/naver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant_id: tenantId, uiLocale: locale })
        }).then(r => r.json())
      ]);

      let totalSynced = 0;
      const messages: string[] = [];

      // Cafe24 result
      if (cafe24Res.status === 'fulfilled' && cafe24Res.value.success && cafe24Res.value.synced_count > 0) {
        totalSynced += cafe24Res.value.synced_count;
        messages.push(
          tf.f00787.replace("{count}", String(cafe24Res.value.synced_count))
        );
      }

      // Naver result
      if (naverRes.status === 'fulfilled' && naverRes.value.success && naverRes.value.synced_count > 0) {
        totalSynced += naverRes.value.synced_count;
        messages.push(
          tf.f00788.replace("{count}", String(naverRes.value.synced_count))
        );
      }

      if (totalSynced > 0) {
        toast.success(tf.f00789.replace("{count}", String(totalSynced)), {
          description: `${messages.join(", ")}${tr(
            " - 주문 목록이 갱신됩니다.",
            " - Order list updated.",
            " - Danh sách đơn hàng đã được cập nhật.",
            " - 注文一覧を更新しました。",
            " - 订单列表已更新。",
            " - Lista de pedidos actualizada.",
            " - Lista de pedidos atualizada.",
            " - Liste des commandes mise à jour.",
            " - Bestellliste aktualisiert.",
            " - Список заказов обновлён.",
          )}`,
          duration: 5000,
        });
        refreshOrders();
      } else if (!silent) {
        toast.info(tf.f00349);
      }
    } catch {
      if (!silent) toast.error(tf.f00160);
    } finally {
      setIsCafe24Syncing(false);
    }
  };

  useEffect(() => {
    if (!tenantId) return;
    // 페이지 진입 시 1회 동기화 (조용히)
    const initialTimer = setTimeout(() => syncShopOrders(true), 3000);
    // 5분마다 자동 폴링
    const interval = setInterval(() => syncShopOrders(true), 5 * 60 * 1000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [tenantId]);


  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  // Keep selectedOrder in sync with the orders list from useOrders (Reactive update)
  useEffect(() => {
    if (selectedOrder && orders.length > 0) {
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (updated && updated.completionPhotoUrl !== selectedOrder.completionPhotoUrl) {
        setSelectedOrder(updated);
      }
    }
  }, [orders, selectedOrder]);

  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (status: 'completed' | 'processing') => {
    if (selectedOrderIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .in('id', selectedOrderIds);
      
      if (error) throw error;
      toast.success(
        tf.f00790.replace("{count}", String(selectedOrderIds.length))
      );
      setSelectedOrderIds([]);
      // Refresh
      const period = searchParams.get('period') || '2months';
      if (period === '2months') fetchOrdersByRange(subDays(new Date(), 60), new Date());
      else if (period === '3months') fetchOrdersByRange(subDays(new Date(), 90), new Date());
      else if (period === '6months') fetchOrdersByRange(subDays(new Date(), 180), new Date());
      else if (period === '1year') fetchOrdersByRange(subDays(new Date(), 365), new Date());
    } catch (e) {
      toast.error(tf.f00324);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrderIds.length === 0) return;
    try {
      for (const id of selectedOrderIds) {
        await deleteOrder(id);
      }
      toast.success(
        tf.f00791.replace("{count}", String(selectedOrderIds.length))
      );
      setSelectedOrderIds([]);
    } catch (e) {
      toast.error(tf.f00308);
    } finally {
      setIsBulkDeleteDialogOpen(false);
    }
  };

  const autoCloseRanRef = useRef(false);
  useEffect(() => {
    const autoClose = async () => {
      if (autoCloseRanRef.current || loading || orders.length === 0) return;
      autoCloseRanRef.current = true;
      
      const twoDaysAgo = subDays(new Date(), 2);
      const targetOrders = orders.filter(o => 
        o.status === 'processing' && 
        new Date(o.order_date) < twoDaysAgo
      );

      if (targetOrders.length > 0) {
        const ids = targetOrders.map(o => o.id);
        const { error } = await supabase
          .from('orders')
          .update({ status: 'completed' })
          .in('id', ids);
        
        if (!error) {
          console.log(`Auto-closed ${ids.length} orders`);
        }
      }
    };
    
    autoClose();
  }, [loading, orders, supabase]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = 
        order.order_number.toLowerCase().includes(searchStr) ||
        order.orderer.name.toLowerCase().includes(searchStr) ||
        order.orderer.contact.includes(searchTerm) ||
        (order.summary?.total || 0).toString().includes(searchTerm) ||
        (order.delivery_info?.recipientName?.toLowerCase().includes(searchStr)) ||
        (order.delivery_info?.address?.toLowerCase().includes(searchStr));

      const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
      const matchesReceipt = selectedReceiptType === "all" || order.receipt_type === selectedReceiptType;

      return matchesSearch && matchesStatus && matchesReceipt;
    });
  }, [orders, searchTerm, selectedStatus, selectedReceiptType]);

  const stats = useMemo(() => {
    const totalCount = orders.length;
    const processingCount = orders.filter(o => o.status === 'processing').length;
    const completedCount = orders.filter(o => o.status === 'completed').length;
    const totalAmount = orders.filter(o => o.status !== 'canceled').reduce((sum, o) => sum + (o.summary?.total || 0), 0);
    
    const todayOrders = orders.filter(o => isToday(parseISO(o.order_date)));
    const todayAmount = todayOrders.reduce((sum, o) => sum + (o.summary?.total || 0), 0);
    const todayCount = todayOrders.length;

    return { totalCount, processingCount, completedCount, totalAmount, todayCount, todayAmount };
  }, [orders]);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
  };

  const handleEditClick = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setIsOrderEditOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setOrderToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleCardPrint = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPendingPrintOrder(order);
    setIsPrintTargetModalOpen(true);
  };

  const navigateToDesignStudio = (target: 'card' | 'formtec') => {
    if (!pendingPrintOrder) return;
    router.push(`/dashboard/design-studio?orderId=${pendingPrintOrder.id}&target=${target}`);
    setIsPrintTargetModalOpen(false);
  };

  const handleRibbonPrint = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    const { left, right } = smartSplitRibbonMessage(
      order.message?.content || "", 
      order.message?.sender, 
      order.orderer.name
    );
    
    router.push(`/dashboard/printer?left=${encodeURIComponent(left)}&right=${encodeURIComponent(right)}`);
  };

  const handleOutsourceClick = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setIsOutsourceOpen(true);
  };
  
  const handleOrderPrint = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.promise(printDocument(`/dashboard/orders/print-preview/${orderId}`), {
      loading: tf.f00632,
      success: tf.f00519,
      error: tf.f00518
    });
  };

  const handleStatusUpdate = async (id: string, status: Order['status']) => {
    const success = await updateOrderStatus(id, status);
    if (success) {
      toast.success(
        tf.f00792.replace("{label}", statusLabels[status] ?? "")
      );
    } else {
      toast.error(tf.f00324);
    }
  };

  const handlePaymentUpdate = async (id: string, status: Order['payment']['status']) => {
    const success = await updatePaymentStatus(id, status);
    if (success) {
      const payLabel = status === "paid" ? tf.f00470 : tf.f00217;
      toast.success(tf.f00793.replace("{state}", payLabel));
    } else {
      toast.error(tf.f00048);
    }
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    const success = await deleteOrder(orderToDelete);
    if (success) {
      toast.success(tf.f00636);
    } else {
      toast.error(tf.f00308);
    }
    setIsDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleGoogleSheetExport = async () => {
    if (!exportStartDate || !exportEndDate) {
      toast.error(tf.f00389);
      return;
    }
    
    setIsExporting(true);
    try {
      const data = prepareOrdersForGoogleSheet(orders, exportStartDate, exportEndDate, locale);
      const sheetId = settings?.googleSheetId;
      
      if (!sheetId) {
        toast.error(tf.f00362);
        setIsExporting(false);
        return;
      }
      
      const result = await exportToGoogleSheet(
        "orders",
        data,
        exportStartDate,
        exportEndDate,
        sheetId,
        undefined,
        undefined,
        locale,
      );
      if (result.success) {
        toast.success(tf.f00784);
      } else {
        throw new Error(
          result.message ||
            tr(
              "알 수 없는 오류",
              "Unknown error",
              "Lỗi không xác định",
              "不明なエラー",
              "未知错误",
              "Error desconocido",
              "Erro desconhecido",
              "Erreur inconnue",
              "Unbekannter Fehler",
              "Неизвестная ошибка",
            ),
        );
      }
    } catch (error: any) {
      console.error(error);
      const raw =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "";
      const msg =
        raw ||
        tr(
          "알 수 없는 오류",
          "Unknown error",
          "Lỗi không xác định",
          "不明なエラー",
          "未知错误",
          "Error desconocido",
          "Erro desconhecido",
          "Erreur inconnue",
          "Unbekannter Fehler",
          "Неизвестная ошибка",
        );
      toast.error(tf.f00794.replace("{message}", msg));
    } finally {
      setIsExporting(false);
    }
  };

  if (!hasAccess) {
    return <AccessDenied requiredTier="ERP" />;
  }

  return (
    <div className={cn("space-y-8 bg-[#F8FAFC]", touchUi ? "p-4 pb-6 sm:p-6 sm:pb-8" : "p-8")}>
      <PageHeader 
        title={tf.f00588} 
        description={
          touchUi
            ? tf.f00038
            : tf.f00560
        }
        className={touchUi ? "max-lg:mb-4" : undefined}
      >
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 px-0 lg:px-0">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/orders/daily-settlement')}
            className="flex-1 lg:flex-none h-11 lg:h-12 px-6 rounded-2xl border-2 border-slate-100 bg-white hover:bg-slate-50 font-bold transition-all shadow-sm gap-2 whitespace-nowrap"
          >
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span>{tf.f00531}</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => exportOrdersToExcel(orders, undefined, undefined, locale)}
            className="flex-1 lg:flex-none h-11 lg:h-12 px-6 rounded-2xl border-2 border-slate-100 bg-white hover:bg-slate-50 font-bold transition-all shadow-sm gap-2"
          >
            <Download className="h-4 w-4 text-slate-400" /> 
            <span>{tf.f00442}</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={handleGoogleSheetExport}
            disabled={isExporting}
            className="flex-1 lg:flex-none h-11 lg:h-12 px-6 rounded-2xl border-2 border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50 text-emerald-700 font-bold transition-all shadow-sm gap-2"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} 
            <span>{tf.f00091}</span>
          </Button>
          {!isAndroidApp && (
          <Button 
            variant="outline"
            onClick={() => syncShopOrders(false)}
            disabled={isCafe24Syncing}
            className="flex-1 lg:flex-none h-11 lg:h-12 px-6 rounded-2xl border-2 border-blue-100 bg-blue-50/20 hover:bg-blue-50 text-blue-700 font-bold transition-all shadow-sm gap-2"
          >
            {isCafe24Syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
            <span>{tf.f00369}</span>
          </Button>
          )}
          {!isAndroidApp && (
          <Button 
            className="w-full lg:w-auto h-11 lg:h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg shadow-slate-200 transition-all gap-2"
            onClick={() => router.push('/dashboard/orders/new')}
          >
            <PlusCircle className="h-4 w-4" /> 
            <span>{tf.f00346}</span>
          </Button>
          )}
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <div className={cn("grid gap-6", touchUi ? "grid-cols-2 lg:grid-cols-4 gap-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4")}>
        <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">{tf.f00463}</CardTitle>
            <div className="h-10 w-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{formatStatCount(stats.todayCount)}</div>
            <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
              {tf.f00101}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">{tf.f00582}</CardTitle>
            <div className="h-10 w-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <RefreshCw className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{formatStatCount(stats.processingCount)}</div>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              {tf.f00090}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              {tf.f00258}
            </CardTitle>
            <div className="h-10 w-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{formatStatCount(stats.completedCount)}</div>
            <p className="text-xs text-slate-400 mt-2 font-medium font-bold text-emerald-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />{" "}
              {tf.f00797.replace(
                "{pct}",
                String(
                  stats.totalCount > 0
                    ? Math.round((stats.completedCount / stats.totalCount) * 100)
                    : 0
                )
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 bg-slate-900 overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {tf.f00587}
            </CardTitle>
            <div className="h-10 w-10 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-400 group-hover:text-slate-900 transition-colors">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">₩{(stats.totalAmount || 0).toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {tf.f00359}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[40px] border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-50">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className={cn("flex items-center bg-slate-100/50 rounded-3xl border border-slate-200/50 w-full xl:w-[450px]", touchUi ? "px-4 py-2 min-h-12" : "px-6 py-2")}>
              <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
              <input 
                type="text" 
                placeholder={tf.f00626}
                className="bg-transparent border-none outline-none w-full text-slate-900 placeholder:text-slate-400 text-base sm:text-sm min-h-11 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-nowrap overflow-x-auto no-scrollbar items-center gap-3 w-full xl:w-auto pb-2 -mx-2 px-2 xl:pb-0 xl:mx-0 xl:px-0">
              <Select 
                value={filterBasis} 
                onValueChange={(val: any) => setFilterBasis(val)}
              >
                <SelectTrigger className="w-[120px] lg:w-[130px] flex-shrink-0 rounded-2xl h-11 lg:h-12 border-2 border-slate-100 bg-white font-bold text-slate-700 shadow-sm">
                   <div className="flex items-center gap-2">
                     <SelectValue>{basisLabels[filterBasis]}</SelectValue>
                   </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {Object.entries(basisLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="font-bold py-3">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={currentPeriod || '2months'} 
                onValueChange={(val) => setCurrentPeriod(val)}
              >
                <SelectTrigger className="w-[130px] lg:w-[150px] flex-shrink-0 rounded-2xl h-11 lg:h-12 border-2 border-slate-100 bg-white font-bold text-slate-700 shadow-sm">
                   <div className="flex items-center gap-2">
                     <CalendarIcon className="h-4 w-4 text-slate-400" />
                     <SelectValue>{periodLabels[currentPeriod || '2months']}</SelectValue>
                   </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {Object.entries(periodLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="font-bold py-3">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={(val: any) => setSelectedStatus(val)}>
                <SelectTrigger className="w-[110px] lg:w-[140px] flex-shrink-0 rounded-2xl h-11 lg:h-12 border-2 border-slate-100 bg-white font-bold text-slate-700 shadow-sm">
                  <SelectValue>{statusLabels[selectedStatus]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="font-bold py-3">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedReceiptType} onValueChange={(val: any) => setSelectedReceiptType(val)}>
                <SelectTrigger className="w-[110px] lg:w-[140px] flex-shrink-0 rounded-2xl h-11 lg:h-12 border-2 border-slate-100 bg-white font-bold text-slate-700 shadow-sm">
                  <SelectValue>{receiptTypeLabels[selectedReceiptType]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {Object.entries(receiptTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="font-bold py-3">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedOrderIds.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-2xl h-11 lg:h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-100 gap-2 animate-in slide-in-from-top-2 px-6 transition-all flex-shrink-0">
                    <SettingsIcon className="h-4 w-4" /> {tf.f00523} ({selectedOrderIds.length})
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-2xl border-none shadow-2xl min-w-[200px] p-2">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-bold text-xs text-slate-400 uppercase py-3 px-4">{tf.f00357}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange('completed')} className="rounded-xl py-3 font-bold gap-2 focus:bg-emerald-50 focus:text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> {tf.f00472}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange('processing')} className="rounded-xl py-3 font-bold gap-2 focus:bg-amber-50 focus:text-amber-700">
                        <RefreshCw className="h-4 w-4" /> {tf.f00655}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="bg-slate-50" />
                    <DropdownMenuItem onClick={() => setIsBulkDeleteDialogOpen(true)} className="rounded-xl py-3 font-bold gap-2 text-rose-600 focus:bg-rose-50 focus:text-rose-700">
                      <Trash2 className="h-4 w-4" /> {tf.f00524}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl bg-slate-50/50" />
              ))}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto no-scrollbar">
                <Table className="min-w-[1000px] border-separate border-spacing-0">
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="w-14 pl-8 py-5">
                        <div className="flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded-md border-2 border-slate-300 accent-slate-900 cursor-pointer"
                            checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                            onChange={handleToggleSelectAll}
                          />
                        </div>
                      </TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] py-5">{tf.f00615}</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] py-5">{tf.f00646}</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] py-5">{tf.f00382}</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] py-5">{tf.f00099}</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] py-5">{tf.f00319}</TableHead>
                      <TableHead className="w-16 pr-8 py-5 text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-96 text-center">
                           <div className="flex flex-col items-center justify-center space-y-4 opacity-30">
                             <ShoppingCart className="h-20 w-20 text-slate-300" />
                             <p className="text-xl font-medium text-slate-500">{tf.f00036}</p>
                           </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow 
                          key={order.id}
                          className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="pl-8 py-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded-md border-2 border-slate-200 accent-slate-900 cursor-pointer"
                                checked={selectedOrderIds.includes(order.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleSelectOne(order.id, e as any);
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="py-6 cursor-pointer" onClick={() => handleOrderClick(order)}>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{order.order_number}</span>
                                {order.source === 'pos' && (
                                  <Badge className="bg-indigo-600 text-white border-none h-4 px-1.5 text-[8px] font-bold gap-1 flex items-center shadow-sm">
                                    <Monitor className="w-2.5 h-2.5" /> POS
                                  </Badge>
                                )}
                                <span className="text-[10px] font-bold text-slate-400">
                                  {tf.f00638}:{" "}
                                  {format(parseISO(order.created_at || new Date().toISOString()), "P", {
                                    locale: dfLoc,
                                  })}
                                </span>
                              </div>
                              <div className="font-bold text-slate-900 truncate max-w-[200px]">
                                {order.items[0]?.name || tf.f00116}{" "}
                                {order.items.length > 1
                                  ? tr(
                                      `외 ${order.items.length - 1}건`,
                                      `+${order.items.length - 1}`,
                                      `+${order.items.length - 1}`,
                                      `ほか${order.items.length - 1}件`,
                                      `等${order.items.length - 1}项`,
                                      `+${order.items.length - 1}`,
                                      `+${order.items.length - 1}`,
                                      `+${order.items.length - 1}`,
                                      `+${order.items.length - 1}`,
                                      `+${order.items.length - 1}`,
                                    )
                                  : ""}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-6 cursor-pointer" onClick={() => handleOrderClick(order)}>
                             <div className="space-y-1">
                               <div className="flex items-center gap-2">
                                 <span className="text-sm font-bold text-slate-900">{order.orderer.name}</span>
                                 <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                   {tr(
                                     "보내는 분",
                                     "Sender",
                                     "Người gửi",
                                     "送り主",
                                     "下单人",
                                     "Remitente",
                                     "Remetente",
                                     "Expéditeur",
                                     "Absender",
                                     "Отправитель",
                                   )}
                                 </span>
                               </div>
                               <div className="text-xs text-slate-400 font-medium">{order.delivery_info?.recipientName || order.pickup_info?.pickerName || "-"} {tf.f00002}</div>
                             </div>
                          </TableCell>
                          <TableCell className="py-6 cursor-pointer" onClick={() => handleOrderClick(order)}>
                             <div className="space-y-1">
                               <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                                 <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                                 {format(parseISO(order.order_date), "Pp", { locale: dfLoc })}
                               </div>
                               <Badge variant="outline" className={cn(
                                 "text-[10px] border-none font-black px-0 uppercase tracking-tighter",
                                 order.receipt_type === 'delivery_reservation' ? "text-blue-500" : "text-amber-500"
                               )}>
                                 {receiptTypeLabels[order.receipt_type] || order.receipt_type}
                               </Badge>
                             </div>
                          </TableCell>
                          <TableCell className="py-6">
                            <div className="space-y-1">
                              <div className="text-sm font-black text-slate-900">₩{(order.summary?.total || 0).toLocaleString()}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">{order.payment?.method || "-"}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-6">
                             <Badge className={cn(
                               "rounded-xl px-4 py-1.5 font-bold text-xs border-none shadow-sm",
                               order.status === 'completed' ? "bg-emerald-50 text-emerald-600" : 
                               order.status === 'processing' ? "bg-amber-50 text-amber-600" : 
                               "bg-rose-50 text-rose-600"
                             )}>
                               {statusLabels[order.status] || order.status}
                             </Badge>
                          </TableCell>
                          <TableCell className="pr-8 py-6 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex items-center justify-center h-10 w-10 p-0 rounded-2xl hover:bg-white hover:shadow-md transition-all text-slate-400">
                                <MoreHorizontal className="h-5 w-5" />
                              </DropdownMenuTrigger>
                               <DropdownMenuContent align="end" className="rounded-3xl border-none shadow-2xl min-w-[200px] p-2">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tf.f00588}</DropdownMenuLabel>
                                  <DropdownMenuItem className="rounded-xl gap-2 font-bold py-3 px-4 focus:bg-slate-50" onClick={(e) => handleOrderClick(order)}>
                                    <ClipboardList className="h-4 w-4" /> {tf.f00314}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="rounded-xl gap-2 font-bold py-3 px-4 focus:bg-slate-50" onClick={(e) => handleEditClick(order, e)}>
                                    <PlusCircle className="h-4 w-4" /> {tf.f00602}
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                                
                                <DropdownMenuSeparator className="mx-1 bg-gray-50" />
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tf.f00516}</DropdownMenuLabel>
                                  <DropdownMenuItem className="rounded-xl gap-2 font-bold py-3 px-4 focus:bg-slate-50" onClick={(e) => handleOrderPrint(order.id, e)}>
                                    <FileText className="h-4 w-4" /> {tf.f00629}
                                  </DropdownMenuItem>
                                   <DropdownMenuItem className="rounded-xl gap-2 font-bold py-3 px-4 focus:bg-slate-50" onClick={(e) => handleCardPrint(order, e)}>
                                     <Printer className="h-4 w-4" /> {tf.f00706}
                                   </DropdownMenuItem>
                                   {!isAndroidApp && (
                                   <DropdownMenuItem className="rounded-xl gap-2 font-bold py-3 px-4 focus:bg-slate-50" onClick={(e) => handleRibbonPrint(order, e)}>
                                     <Printer className="h-4 w-4 text-indigo-500" /> {tf.f00181}
                                   </DropdownMenuItem>
                                   )}
                                </DropdownMenuGroup>

                                <DropdownMenuSeparator className="mx-1 bg-gray-50" />
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tf.f00320}</DropdownMenuLabel>
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="rounded-xl gap-2 font-bold py-3 px-4 focus:bg-slate-50">
                                      <RefreshCw className="h-4 w-4" /> {tf.f00322}
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                      <DropdownMenuSubContent className="rounded-2xl border-none shadow-xl min-w-[150px] p-1.5">
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'processing')} className="rounded-xl py-2.5 px-3 font-bold gap-2">
                                           {tf.f00654} {order.status === 'processing' && <Check className="h-3 w-3 ml-auto text-amber-500" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'completed')} className="rounded-xl py-2.5 px-3 font-bold gap-2">
                                           {tf.f00471} {order.status === 'completed' && <Check className="h-3 w-3 ml-auto text-emerald-500" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'canceled')} className="rounded-xl py-2.5 px-3 font-bold gap-2 text-rose-600">
                                           {tf.f00702} {order.status === 'canceled' && <Check className="h-3 w-3 ml-auto text-rose-500" />}
                                        </DropdownMenuItem>
                                      </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                  </DropdownMenuSub>
 
                                   <DropdownMenuSub>
                                     <DropdownMenuSubTrigger className="rounded-xl gap-2 font-bold py-3 px-4 focus:bg-slate-50">
                                       <PaymentIcon className="h-4 w-4" /> {tf.f00047}
                                     </DropdownMenuSubTrigger>
                                     <DropdownMenuPortal>
                                       <DropdownMenuSubContent className="rounded-2xl border-none shadow-xl min-w-[150px] p-1.5">
                                         <DropdownMenuItem onClick={() => handlePaymentUpdate(order.id, 'paid')} className="rounded-xl py-2.5 px-3 font-bold gap-2">
                                           {tf.f00470} {order.payment?.status === 'paid' && <Check className="h-3 w-3 ml-auto text-emerald-500" />}
                                         </DropdownMenuItem>
                                         <DropdownMenuItem onClick={() => handlePaymentUpdate(order.id, 'pending')} className="rounded-xl py-2.5 px-3 font-bold gap-2">
                                           {tf.f00217} {order.payment?.status !== 'paid' && <Check className="h-3 w-3 ml-auto text-amber-500" />}
                                         </DropdownMenuItem>
                                       </DropdownMenuSubContent>
                                     </DropdownMenuPortal>
                                   </DropdownMenuSub>
                                 </DropdownMenuGroup>
 
                                 <DropdownMenuSeparator className="mx-1 bg-gray-50" />
                                 <DropdownMenuGroup>
                                   <DropdownMenuItem className="rounded-xl gap-2 font-bold py-3 px-4 focus:bg-slate-50" onClick={(e) => handleOutsourceClick(order, e)}>
                                     <Share2 className="h-4 w-4" /> {tf.f00476}
                                   </DropdownMenuItem>
                                 </DropdownMenuGroup>
                                 
                                 <DropdownMenuSeparator className="mx-1 bg-gray-50" />
                                 <DropdownMenuItem className="text-rose-600 rounded-xl gap-2 font-bold py-3 px-4 hover:bg-rose-50 focus:bg-rose-50 focus:text-rose-700" onClick={() => handleDeleteClick(order.id)}>
                                  <Trash2 className="h-4 w-4" /> {tf.f00589}
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className={cn("lg:hidden space-y-4 p-2 sm:p-4", isAndroidApp ? "pb-32" : "pb-24")}>
                {filteredOrders.length > 0 && (
                  <div className="flex justify-between items-center px-2 mb-2">
                    <span className="text-xs font-bold text-slate-400">
                        {tr(
                          `Total ${filteredOrders.length}건`,
                          `Total ${filteredOrders.length}`,
                          `Tổng ${filteredOrders.length} đơn`,
                          `計${filteredOrders.length}件`,
                          `共 ${filteredOrders.length} 笔`,
                          `Total: ${filteredOrders.length}`,
                          `Total: ${filteredOrders.length}`,
                          `Total : ${filteredOrders.length}`,
                          `Gesamt: ${filteredOrders.length}`,
                          `Всего: ${filteredOrders.length}`,
                        )}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl h-8"
                      onClick={handleToggleSelectAll}
                    >
                      {selectedOrderIds.length === filteredOrders.length ? tf.f00358 : tf.f00557}
                    </Button>
                  </div>
                )}
                {filteredOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center space-y-4 opacity-30 py-20">
                    <ShoppingCart className="h-16 w-16 text-slate-300" />
                    <p className="font-medium text-slate-500">{tf.f00036}</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <Card 
                      key={order.id} 
                      className={cn(
                        "rounded-2xl border-none shadow-md shadow-slate-200/60 overflow-hidden active:scale-[0.99] transition-all relative",
                        selectedOrderIds.includes(order.id) ? "bg-indigo-50 border-2 border-indigo-200 ring-2 ring-indigo-100" : "bg-white"
                      )}
                    >
                      <CardContent className={cn("cursor-pointer", touchUi ? "p-5" : "p-4")} onClick={() => handleOrderClick(order)}>
                        <div className="flex justify-between items-start mb-3 gap-3">
                          <div className="flex items-center gap-3">
                            <div onClick={(e) => e.stopPropagation()} className={cn("flex items-center justify-center", touchUi && "min-h-11 min-w-11")}>
                              <input 
                                type="checkbox" 
                                className={cn("rounded-lg border-2 border-slate-200 accent-slate-900 cursor-pointer shrink-0", touchUi ? "w-6 h-6" : "w-5 h-5")}
                                checked={selectedOrderIds.includes(order.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleSelectOne(order.id, e as any);
                                }}
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{order.order_number}</span>
                              <span className="text-[9px] font-bold text-slate-400">{tf.f00638}: {format(parseISO(order.created_at || new Date().toISOString()), 'MM-dd')}</span>
                            </div>
                            <div className="font-bold text-slate-900">
                              {order.items[0]?.name || tf.f00116}{" "}
                              {order.items.length > 1
                                ? tr(
                                    `외 ${order.items.length - 1}건`,
                                    `+${order.items.length - 1}`,
                                    `+${order.items.length - 1}`,
                                    `ほか${order.items.length - 1}件`,
                                    `等${order.items.length - 1}项`,
                                    `+${order.items.length - 1}`,
                                    `+${order.items.length - 1}`,
                                    `+${order.items.length - 1}`,
                                    `+${order.items.length - 1}`,
                                    `+${order.items.length - 1}`,
                                  )
                                : ""}
                            </div>
                          </div>
                          <Badge className={cn(
                            "rounded-full px-3 py-0.5 font-bold text-[10px] border-none shadow-none",
                            order.status === 'completed' ? "bg-emerald-50 text-emerald-600" : 
                            order.status === 'processing' ? "bg-amber-50 text-amber-600" : 
                            "bg-rose-50 text-rose-600"
                          )}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">{tf.f00646}</div>
                            <div className="text-xs font-bold text-slate-900">{order.orderer.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {order.delivery_info?.recipientName || order.pickup_info?.pickerName || "-"}
                              {tr("님", "", "", "様")}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">{tf.f00097}</div>
                            <div className="text-xs font-black text-slate-900">₩{(order.summary?.total || 0).toLocaleString()}</div>
                            <div className="text-[10px] text-slate-500 uppercase">{order.payment?.method || "-"}</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <CalendarIcon className="h-3 w-3" />
                            {tf.f00378}: {format(parseISO(order.order_date), 'MM/dd HH:mm')}
                            <span className="mx-1">•</span>
                            <span className={cn(
                              order.receipt_type === 'delivery_reservation' ? "text-blue-500" : "text-amber-500"
                            )}>
                              {receiptTypeLabels[order.receipt_type] || order.receipt_type}
                            </span>
                          </div>
                          
                          <div onClick={(e) => e.stopPropagation()} className="relative z-10">
                            <DropdownMenu>
                              <DropdownMenuTrigger className={cn("inline-flex items-center justify-center p-0 rounded-xl hover:bg-slate-100 text-slate-500", touchUi ? "h-11 w-11" : "h-8 w-8")}>
                                <MoreHorizontal className={touchUi ? "h-5 w-5" : "h-4 w-4"} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl min-w-[200px] p-2">
                                <DropdownMenuItem className="rounded-xl gap-2 font-bold py-2.5 px-3 focus:bg-slate-50" onClick={(e) => { e.stopPropagation(); handleOrderClick(order); }}>
                                  <ClipboardList className="h-4 w-4" /> {tf.f00314}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-xl gap-2 font-bold py-2.5 px-3 focus:bg-slate-50" onClick={(e) => { e.stopPropagation(); handleEditClick(order, e as any); }}>
                                  <PlusCircle className="h-4 w-4" /> {tf.f00602}
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator className="mx-1 bg-gray-50" />
                                <DropdownMenuItem className="rounded-xl gap-2 font-bold py-2.5 px-3 focus:bg-slate-50" onClick={(e) => { e.stopPropagation(); handleOrderPrint(order.id, e as any); }}>
                                  <FileText className="h-4 w-4" /> {tf.f00629}
                                </DropdownMenuItem>
                                 <DropdownMenuItem className="rounded-xl gap-2 font-bold py-2.5 px-3 focus:bg-slate-50" onClick={(e) => { e.stopPropagation(); handleCardPrint(order, e as any); }}>
                                   <Printer className="h-4 w-4" /> {tf.f00706}
                                 </DropdownMenuItem>
                                 {!isAndroidApp && (
                                 <DropdownMenuItem className="rounded-xl gap-2 font-bold py-2.5 px-3 focus:bg-slate-50" onClick={(e) => { e.stopPropagation(); handleRibbonPrint(order, e as any); }}>
                                   <Printer className="h-4 w-4 text-indigo-500" /> {tf.f00181}
                                 </DropdownMenuItem>
                                 )}
 
                                <DropdownMenuSeparator className="mx-1 bg-gray-50" />
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="rounded-xl gap-2 font-bold py-2.5 px-3 focus:bg-slate-50">
                                    <RefreshCw className="h-4 w-4" /> {tf.f00325}
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                    <DropdownMenuSubContent className="rounded-2xl border-none shadow-xl min-w-[170px] p-1.5">
                                      <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tf.f00597}</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'processing')} className="rounded-xl py-2 font-bold">{tf.f00654}</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'completed')} className="rounded-xl py-2 font-bold">{tf.f00472}</DropdownMenuItem>
                                      <DropdownMenuSeparator className="my-1" />
                                      <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tf.f00047}</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => handlePaymentUpdate(order.id, 'paid')} className="rounded-xl py-2 font-bold">{tf.f00051}</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handlePaymentUpdate(order.id, 'pending')} className="rounded-xl py-2 font-bold">{tf.f00218}</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                                </DropdownMenuSub>
 
                                <DropdownMenuSeparator className="mx-1 bg-gray-50" />
                                <DropdownMenuItem className="rounded-xl gap-2 font-bold py-2.5 px-3 focus:bg-slate-50" onClick={(e) => { e.stopPropagation(); handleOutsourceClick(order, e as any); }}>
                                  <Share2 className="h-4 w-4" /> {tf.f00476}
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator className="mx-1 bg-gray-50" />
                                <DropdownMenuItem className="text-rose-600 rounded-xl gap-2 font-bold py-2.5 px-3 hover:bg-rose-50 focus:bg-rose-50 focus:text-rose-700" onClick={(e) => { e.stopPropagation(); handleDeleteClick(order.id); }}>
                                  <Trash2 className="h-4 w-4" /> {tf.f00595}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                      </div>
                    </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Mobile Bulk Action Bar */}
              {selectedOrderIds.length > 0 && (
                <div className={cn(
                  "lg:hidden fixed left-4 right-4 z-[102] animate-in fade-in slide-in-from-bottom-8 duration-300",
                  isAndroidApp ? "bottom-[calc(6.25rem+env(safe-area-inset-bottom))]" : "bottom-6"
                )}>
                  <div className="bg-slate-900 text-white rounded-3xl shadow-2xl p-4 flex items-center justify-between border border-slate-800">
                    <div className="flex flex-col px-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         {tr(
                           "선택됨",
                           "Selected",
                           "Đã chọn",
                           "選択済み",
                           "已选",
                           "Seleccionado",
                           "Selecionado",
                           "Sélectionné",
                           "Ausgewählt",
                           "Выбрано",
                         )}
                       </span>
                       <span className="text-sm font-bold">
                         {tr(
                           `${selectedOrderIds.length}건 선택 중`,
                           `${selectedOrderIds.length} selected`,
                           `Đang chọn ${selectedOrderIds.length} đơn`,
                           `${selectedOrderIds.length}件を選択中`,
                           `已选 ${selectedOrderIds.length} 笔`,
                           `${selectedOrderIds.length} seleccionados`,
                           `${selectedOrderIds.length} selecionados`,
                           `${selectedOrderIds.length} sélectionné(s)`,
                           `${selectedOrderIds.length} ausgewählt`,
                           `Выбрано: ${selectedOrderIds.length}`,
                         )}
                       </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-10 rounded-xl hover:bg-slate-800 text-slate-400"
                        onClick={() => setSelectedOrderIds([])}
                      >
                        {tf.f00702}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                          {tf.f00322}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl min-w-[160px] p-1.5 mb-2">
                          <DropdownMenuItem className="rounded-xl gap-2 font-bold py-2.5 px-3" onClick={() => handleBulkStatusChange('completed')}>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {tf.f00473}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl gap-2 font-bold py-2.5 px-3" onClick={() => handleBulkStatusChange('processing')}>
                            <Loader2 className="h-4 w-4 text-amber-500" /> {tf.f00679}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="mx-1 bg-gray-50" />
                          <DropdownMenuItem className="text-rose-600 rounded-xl gap-2 font-bold py-2.5 px-3" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                            <Trash2 className="h-4 w-4" /> {tf.f00524}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <OrderDetailDialog 
        isOpen={isOrderDetailOpen} 
        onOpenChange={setIsOrderDetailOpen} 
        order={selectedOrder} 
        onPrintMessage={handleCardPrint}
        onPrintRibbon={isAndroidApp ? undefined : handleRibbonPrint}
        onUpdate={() => {
          // Trigger a silent refresh of the orders
          const period = searchParams.get('period') || '2months';
          if (period === '2months') fetchOrdersByRange(subDays(new Date(), 60), new Date());
          else if (period === '3months') fetchOrdersByRange(subDays(new Date(), 90), new Date());
          else if (period === '6months') fetchOrdersByRange(subDays(new Date(), 180), new Date());
          else if (period === '1year') fetchOrdersByRange(subDays(new Date(), 365), new Date());
          else if (period === 'all') fetchOrdersByRange(new Date(2020, 0, 1), new Date());
        }}
      />
      <OrderEditDialog
        isOpen={isOrderEditOpen}
        onOpenChange={setIsOrderEditOpen}
        order={selectedOrder}
      />
      <OrderOutsourceDialog
        isOpen={isOutsourceOpen}
        onOpenChange={setIsOutsourceOpen}
        order={selectedOrder}
        onSuccess={() => fetchOrdersByRange(startOfMonth(new Date()), endOfMonth(new Date()))}
      />
      <MessagePrintDialog
        isOpen={isMessagePrintOpen}
        onOpenChange={setIsMessagePrintOpen}
        order={selectedOrder}
        onSubmit={(data) => {
          const params = new URLSearchParams();
          Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              params.set(key, value.join(','));
            } else {
              params.set(key, String(value));
            }
          });
          router.push(`/dashboard/orders/print-message?${params.toString()}`);
        }}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
               <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-slate-900">
              {tf.f00633}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium pt-2">
              {tf.f00496}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl font-bold h-11">
              {tf.f00426}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 rounded-xl font-bold h-11 border-none text-white">
              {tf.f00139}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
               <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-slate-900">
              {tf.f00798.replace(
                "{count}",
                String(selectedOrderIds.length)
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium pt-2">
              {tf.f00497}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl font-bold h-11">{tf.f00702}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-rose-600 hover:bg-rose-700 rounded-xl font-bold h-11 border-none text-white">
              {tf.f00138}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 카드 메시지 출력 대상 선택 모달 (신규 추가) */}
      <AlertDialog open={isPrintTargetModalOpen} onOpenChange={setIsPrintTargetModalOpen}>
        <AlertDialogContent className="rounded-[40px] border-none shadow-2xl max-w-md p-10">
          <AlertDialogHeader>
            <div className="w-14 h-14 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
               <Printer className="w-7 h-7 text-indigo-600" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
              {tf.f00701}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-bold pt-2 leading-relaxed">
              {tf.f00210}
              <br />
              {tf.f00552}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-5 py-8">
            <button 
              onClick={() => navigateToDesignStudio('card')}
              className="flex flex-col items-center justify-center gap-4 p-8 bg-slate-50 hover:bg-indigo-50 border-2 border-transparent hover:border-indigo-100 rounded-[32px] text-slate-900 transition-all group"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                <FileText size={28} />
              </div>
              <div className="flex flex-col items-center">
                <span className="font-black text-sm">{tf.f00114}</span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Design Studio</span>
              </div>
            </button>
            <button 
              onClick={() => navigateToDesignStudio('formtec')}
              className="flex flex-col items-center justify-center gap-4 p-8 bg-slate-50 hover:bg-amber-50 border-2 border-transparent hover:border-amber-100 rounded-[32px] text-slate-900 transition-all group"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition-transform">
                <Target size={28} />
              </div>
              <div className="flex flex-col items-center">
                <span className="font-black text-sm">{tf.f00745}</span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Formtec Lable</span>
              </div>
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="w-full rounded-2xl font-bold h-12 border-none bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
              {tf.f00425}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
