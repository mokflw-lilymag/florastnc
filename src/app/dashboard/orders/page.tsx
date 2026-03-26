"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  PlusCircle, Search, MoreHorizontal, MessageSquare, 
  Upload, Download, FileText, ShoppingCart, 
  Package, Target, RefreshCw, Trash2, XCircle,
  Calendar as CalendarIcon, ExternalLink, Printer, ClipboardList, Info,
  TrendingUp, CreditCard, ShoppingBag, ArrowUpRight, Share2, Loader2, AlertCircle,
  BarChart3, DollarSign, CheckCircle2
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
import { OrderDetailDialog } from "./components/order-detail-dialog";
import { OrderEditDialog } from "./components/order-edit-dialog";
import { MessagePrintDialog } from "./components/message-print-dialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";

import { OrderOutsourceDialog } from "./components/order-outsource-dialog";

import { exportOrdersToExcel, prepareOrdersForGoogleSheet, exportToGoogleSheet } from "@/lib/excel-export";
import { createClient } from "@/utils/supabase/client";
import { useSettings } from "@/hooks/use-settings";
import { FileSpreadsheet, Settings as SettingsIcon } from "lucide-react";

export default function OrdersPage() {
  const { profile, isLoading: authLoading, tenantId } = useAuth();
  const plan = profile?.tenants?.plan || "free";
  const isSuperAdmin = profile?.role === 'super_admin';
  const supabase = createClient();
  const { settings } = useSettings();

  const statusLabels: Record<string, string> = {
    all: "전체 상태",
    processing: "준비중",
    completed: "완료",
    canceled: "취소"
  };

  const receiptTypeLabels: Record<string, string> = {
    all: "전체 수령",
    delivery_reservation: "배송",
    pickup_reservation: "수령예약",
    store_pickup: "매장수령"
  };

  const periodLabels: Record<string, string> = {
    "2months": "기존 2개월",
    "3months": "최근 3개월",
    "6months": "최근 6개월",
    "1year": "최근 1년",
    "all": "전체 데이터"
  };

  const { 
    orders, 
    loading, 
    fetchOrdersByRange, 
    updateOrderStatus, 
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMessagePrintOpen, setIsMessagePrintOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  // Google Sheets export date range
  const [exportStartDate, setExportStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [exportEndDate, setExportEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

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
      toast.success(`${selectedOrderIds.length}건의 주문 상태가 변경되었습니다.`);
      setSelectedOrderIds([]);
      // Refresh
      const period = searchParams.get('period') || '2months';
      if (period === '2months') fetchOrdersByRange(subDays(new Date(), 60), new Date());
      else if (period === '3months') fetchOrdersByRange(subDays(new Date(), 90), new Date());
      else if (period === '6months') fetchOrdersByRange(subDays(new Date(), 180), new Date());
      else if (period === '1year') fetchOrdersByRange(subDays(new Date(), 365), new Date());
    } catch (e) {
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrderIds.length === 0) return;
    try {
      for (const id of selectedOrderIds) {
        await deleteOrder(id);
      }
      toast.success(`${selectedOrderIds.length}건의 주문이 삭제되었습니다.`);
      setSelectedOrderIds([]);
    } catch (e) {
      toast.error("삭제에 실패했습니다.");
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
        order.summary.total.toString().includes(searchTerm) ||
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
    const totalAmount = orders.filter(o => o.status !== 'canceled').reduce((sum, o) => sum + o.summary.total, 0);
    
    const todayOrders = orders.filter(o => isToday(parseISO(o.order_date)));
    const todayAmount = todayOrders.reduce((sum, o) => sum + o.summary.total, 0);
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

  const handlePrintClick = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setIsMessagePrintOpen(true);
  };

  const handleOutsourceClick = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setIsOutsourceOpen(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    const success = await deleteOrder(orderToDelete);
    if (success) {
      toast.success("주문이 삭제되었습니다.");
    } else {
      toast.error("삭제에 실패했습니다.");
    }
    setIsDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleGoogleSheetExport = async () => {
    if (!exportStartDate || !exportEndDate) {
      toast.error("수령일 범위를 선택해주세요.");
      return;
    }
    
    setIsExporting(true);
    try {
      const data = prepareOrdersForGoogleSheet(orders, exportStartDate, exportEndDate);
      const sheetId = settings?.googleSheetId;
      
      if (!sheetId) {
        toast.error("설정에서 Google Spreadsheet ID를 먼저 등록해주세요.");
        setIsExporting(false);
        return;
      }
      
      const result = await exportToGoogleSheet(
        'orders', 
        data, 
        exportStartDate, 
        exportEndDate, 
        sheetId
      );
      if (result.success) {
        toast.success("Google Sheets로 데이터가 성공적으로 전송되었습니다.");
      } else {
        throw new Error(result.message || "알 수 없는 오류");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(`전송 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!hasAccess) {
    return <AccessDenied requiredTier="ERP" />;
  }

  return (
    <div className="space-y-8 p-8 bg-[#F8FAFC]">
      <PageHeader 
        title="주문 현황" 
        description="실시간 주문 관리 및 처리 상태를 확인하세요"
      >
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => exportOrdersToExcel(orders)}
            className="rounded-2xl h-12 px-6 font-semibold border-2 border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" /> 엑셀 다운로드
          </Button>
          <Button 
            variant="outline" 
            onClick={handleGoogleSheetExport}
            disabled={isExporting}
            className="rounded-2xl h-12 px-6 font-semibold border-2 border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50 text-emerald-700 shadow-sm"
          >
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />} 
            구글 시트 전송
          </Button>
          <Button 
            onClick={() => router.push('/dashboard/orders/new')}
            className="rounded-2xl h-12 px-8 font-bold bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-200 transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="h-5 w-5 mr-2" /> 새 주문 등록
          </Button>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">오늘 주문</CardTitle>
            <div className="h-10 w-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{stats.todayCount}건</div>
            <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
              금일 누적 실시간 데이터
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">제작 중</CardTitle>
            <div className="h-10 w-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <RefreshCw className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{stats.processingCount}건</div>
            <p className="text-xs text-slate-400 mt-2 font-medium">관리자 확인 및 작업 대기</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">배송/완료</CardTitle>
            <div className="h-10 w-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{stats.completedCount}건</div>
            <p className="text-xs text-slate-400 mt-2 font-medium font-bold text-emerald-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> 전체 주문의 {stats.totalCount > 0 ? Math.round((stats.completedCount / stats.totalCount) * 100) : 0}% 처리됨
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 bg-slate-900 overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">조회 매출</CardTitle>
            <div className="h-10 w-10 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-400 group-hover:text-slate-900 transition-colors">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">₩{stats.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-2 font-medium">선택된 기간의 총 매출액</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[40px] border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center bg-slate-100/50 rounded-3xl px-6 py-2 border border-slate-200/50 w-full md:w-[450px]">
              <Search className="h-5 w-5 text-slate-400 mr-3" />
              <input 
                type="text" 
                placeholder="주문번호, 주문자, 연락처, 배송지..."
                className="bg-transparent border-none outline-none w-full text-slate-900 placeholder:text-slate-400 text-sm h-10 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Select 
                value={searchParams.get('period') || '2months'} 
                onValueChange={(val) => {
                  const current = new URLSearchParams(Array.from(searchParams.entries()));
                  current.set('period', val);
                  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/dashboard/orders';
                  router.push(`${pathname}?${current.toString()}`);
                  
                  // Fetch data based on period
                  if (val === '2months') fetchOrdersByRange(subDays(new Date(), 60), new Date());
                  else if (val === '3months') fetchOrdersByRange(subDays(new Date(), 90), new Date());
                  else if (val === '6months') fetchOrdersByRange(subDays(new Date(), 180), new Date());
                  else if (val === '1year') fetchOrdersByRange(subDays(new Date(), 365), new Date());
                  else if (val === 'all') fetchOrdersByRange(new Date(2000, 0, 1), new Date());
                }}
              >
                <SelectTrigger className="w-[150px] rounded-2xl h-12 border-2 border-slate-100 bg-white font-bold text-slate-700 shadow-sm">
                   <div className="flex items-center gap-2">
                     <CalendarIcon className="h-4 w-4 text-slate-400" />
                     <SelectValue>{periodLabels[searchParams.get('period') || '2months']}</SelectValue>
                   </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {Object.entries(periodLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="font-bold py-3">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={(val: any) => setSelectedStatus(val)}>
                <SelectTrigger className="w-[140px] rounded-2xl h-12 border-2 border-slate-100 bg-white font-bold text-slate-700 shadow-sm">
                  <SelectValue>{statusLabels[selectedStatus]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="font-bold py-3">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedReceiptType} onValueChange={(val: any) => setSelectedReceiptType(val)}>
                <SelectTrigger className="w-[140px] rounded-2xl h-12 border-2 border-slate-100 bg-white font-bold text-slate-700 shadow-sm">
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
                  <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-2xl h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-100 gap-2 animate-in slide-in-from-top-2 px-6 transition-all">
                    <SettingsIcon className="h-4 w-4" /> 일괄 작업 ({selectedOrderIds.length})
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-2xl border-none shadow-2xl min-w-[200px]">
                    <DropdownMenuLabel className="font-bold text-xs text-slate-400 uppercase py-3 px-4">선택 작업</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('completed')} className="rounded-xl py-3 font-bold gap-2 focus:bg-emerald-50 focus:text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> 완료 처리
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('processing')} className="rounded-xl py-3 font-bold gap-2">
                      <RefreshCw className="h-4 w-4" /> 준비중 변경
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-50" />
                    <DropdownMenuItem onClick={() => setIsBulkDeleteDialogOpen(true)} className="rounded-xl py-3 font-bold gap-2 text-rose-600 focus:bg-rose-50 focus:text-rose-700">
                      <Trash2 className="h-4 w-4" /> 일괄 삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-50/50" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
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
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] py-5">주문 정보</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] py-5">주문자/수령인</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] py-5">수령/배송일</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] py-5">금액/결제</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] py-5">상태</TableHead>
                    <TableHead className="w-16 pr-8 py-5 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-96 text-center">
                         <div className="flex flex-col items-center justify-center space-y-4 opacity-30">
                           <ShoppingCart className="h-20 w-20 text-slate-300" />
                           <p className="text-xl font-medium text-slate-500">검색 결과가 없습니다.</p>
                         </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow 
                        key={order.id}
                        className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => handleOrderClick(order)}
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
                        <TableCell className="py-6">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{order.order_number}</span>
                            <div className="font-bold text-slate-900 truncate max-w-[200px]">{order.items[0]?.name || "기타 상품"} {order.items.length > 1 ? `외 ${order.items.length - 1}건` : ""}</div>
                          </div>
                        </TableCell>
                        <TableCell className="py-6">
                           <div className="space-y-1">
                             <div className="flex items-center gap-2">
                               <span className="text-sm font-bold text-slate-900">{order.orderer.name}</span>
                               <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">Sender</span>
                             </div>
                             <div className="text-xs text-slate-400 font-medium">{order.delivery_info?.recipientName || order.pickup_info?.pickerName || "-"} (수령)</div>
                           </div>
                        </TableCell>
                        <TableCell className="py-6">
                           <div className="space-y-1">
                             <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                               <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                               {format(parseISO(order.order_date), 'yyyy-MM-dd HH:mm')}
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
                            <div className="text-sm font-black text-slate-900">₩{order.summary.total.toLocaleString()}</div>
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
                            <DropdownMenuContent align="end" className="rounded-3xl border-none shadow-2xl min-w-[180px] p-2">
                              <DropdownMenuLabel className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">주문 관리</DropdownMenuLabel>
                              <DropdownMenuItem className="rounded-xl gap-2 font-bold py-3 px-4 focus:bg-slate-50" onClick={(e) => handleOrderClick(order)}>
                                <ClipboardList className="h-4 w-4" /> 상세 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem className="rounded-xl gap-2 font-bold py-3 px-4 focus:bg-slate-50" onClick={(e) => handleEditClick(order, e)}>
                                <PlusCircle className="h-4 w-4" /> 주문 수정
                              </DropdownMenuItem>
                              <DropdownMenuItem className="rounded-xl gap-2 font-bold py-3 px-4 focus:bg-slate-50" onClick={(e) => handlePrintClick(order, e)}>
                                <Printer className="h-4 w-4" /> 리본/카드 출력
                              </DropdownMenuItem>
                              <DropdownMenuItem className="rounded-xl gap-2 font-bold py-3 px-4 focus:bg-slate-50" onClick={(e) => handleOutsourceClick(order, e)}>
                                <Share2 className="h-4 w-4" /> 아웃소싱 전송
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="mx-1 bg-gray-50" />
                              <DropdownMenuItem className="text-rose-600 rounded-xl gap-2 font-bold py-3 px-4 hover:bg-rose-50 focus:bg-rose-50 focus:text-rose-700" onClick={() => handleDeleteClick(order.id)}>
                                <Trash2 className="h-4 w-4" /> 주문 내역 삭제
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
          )}
        </CardContent>
      </Card>

      <OrderDetailDialog 
        isOpen={isOrderDetailOpen} 
        onOpenChange={setIsOrderDetailOpen} 
        order={selectedOrder} 
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
            <AlertDialogTitle className="text-xl font-bold text-slate-900">주문을 영구 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium pt-2">
              이 작업은 되돌릴 수 없으며, 모든 매출 통계에서 해당 주문 데이터가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl font-bold h-11">아니오, 취소함</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 rounded-xl font-bold h-11 border-none text-white">네, 삭제하겠습니다</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
               <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-slate-900">선택된 {selectedOrderIds.length}건을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium pt-2">
              이 작업은 되돌릴 수 없으며, 선택된 모든 주문이 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl font-bold h-11">취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-rose-600 hover:bg-rose-700 rounded-xl font-bold h-11 border-none text-white">네, 모두 삭제합니다</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
