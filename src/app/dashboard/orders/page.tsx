"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  PlusCircle, Search, MoreHorizontal, MessageSquare, 
  Upload, Download, FileText, ShoppingCart, 
  Package, Target, RefreshCw, Trash2, XCircle,
  Calendar as CalendarIcon, ExternalLink, Printer, ClipboardList, Info,
  TrendingUp, CreditCard, ShoppingBag, ArrowUpRight, Share2, Loader2, AlertCircle,
  BarChart3, Calendar, DollarSign, CheckCircle2
} from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, isToday, isThisMonth, isThisYear, parseISO, startOfToday } from "date-fns";
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

export default function OrdersPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const plan = profile?.tenants?.plan || "free";
  const isSuperAdmin = profile?.role === 'super_admin';

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
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [isOrderEditOpen, setIsOrderEditOpen] = useState(false);
  const [isOutsourceOpen, setIsOutsourceOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMessagePrintOpen, setIsMessagePrintOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle returning from print preview with openMessagePrint param
    const openPrint = searchParams.get('openMessagePrint') === 'true';
    const orderId = searchParams.get('orderId');
    if (openPrint && orderId) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setSelectedOrder(order);
        setIsMessagePrintOpen(true);
      }
    }
  }, [searchParams, orders]);

  useEffect(() => {
    // Default fetch for current year to get annual stats
    const start = new Date(new Date().getFullYear(), 0, 1);
    const end = new Date(new Date().getFullYear(), 11, 31);
    fetchOrdersByRange(start, end);
  }, []);

  const getRecipientName = (order: Order) => {
    if (order.receipt_type === 'delivery_reservation') return order.delivery_info?.recipientName || "미지정";
    if (order.receipt_type === 'pickup_reservation') return order.pickup_info?.pickerName || "미지정";
    return order.orderer?.name || "미지정";
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const recipientName = getRecipientName(order);
      const matchSearch = searchTerm === "" || 
        (order.orderer?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.orderer?.contact || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recipientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.order_number || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = selectedStatus === "all" || order.status === selectedStatus;
      const matchReceiptType = selectedReceiptType === "all" || order.receipt_type === selectedReceiptType;

      return matchSearch && matchStatus && matchReceiptType;
    });
  }, [orders, searchTerm, selectedStatus, selectedReceiptType]);

  const stats = useMemo(() => {
    const validOrders = orders.filter(o => o.status !== 'canceled');
    
    const todayOrders = validOrders.filter(o => isToday(new Date(o.order_date)));
    const monthOrders = validOrders.filter(o => isThisMonth(new Date(o.order_date)));
    const yearOrders = validOrders.filter(o => isThisYear(new Date(o.order_date)));

    return {
      todayRevenue: todayOrders.reduce((sum, o) => sum + (o.summary?.total || 0), 0),
      todayCount: todayOrders.length,
      monthRevenue: monthOrders.reduce((sum, o) => sum + (o.summary?.total || 0), 0),
      yearRevenue: yearOrders.reduce((sum, o) => sum + (o.summary?.total || 0), 0),
      processingCount: orders.filter(o => o.status === 'processing').length
    };
  }, [orders]);

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
  };

  const handleEditClick = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderEditOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setOrderToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handlePrintClick = (order: Order) => {
    setSelectedOrder(order);
    setIsMessagePrintOpen(true);
  };

  const handleOutsourceClick = (order: Order) => {
    setSelectedOrder(order);
    setIsOutsourceOpen(true);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      if (status !== 'processing' && status !== 'completed' && status !== 'canceled') return;
      await updateOrderStatus(id, status);
      toast.success(`주문 상태가 ${status === 'completed' ? '완료' : status === 'canceled' ? '취소' : '준비중'}로 변경되었습니다.`);
    } catch (e) {
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const confirmDelete = async () => {
    if (orderToDelete) {
      try {
        await deleteOrder(orderToDelete);
        toast.success("주문이 삭제되었습니다.");
      } catch (e) {
        toast.error("삭제에 실패했습니다.");
      } finally {
        setIsDeleteDialogOpen(false);
        setOrderToDelete(null);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="default" className="bg-emerald-500 rounded-full px-3 text-[11px] font-light">완료</Badge>;
      case 'processing': return <Badge variant="secondary" className="bg-amber-500 text-white rounded-full px-3 text-[11px] font-light">준비중</Badge>;
      case 'canceled': return <Badge variant="destructive" className="rounded-full px-3 text-[11px] font-light">취소</Badge>;
      default: return <Badge variant="outline" className="rounded-full px-3 text-[11px] font-light">{status}</Badge>;
    }
  };

  const getReceiptTypeBadge = (type: string) => {
    switch (type) {
      case 'delivery_reservation': return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-600 rounded-full text-[11px] font-light">배송</Badge>;
      case 'pickup_reservation': return <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-600 rounded-full text-[11px] font-light">픽업</Badge>;
      case 'store_pickup': return <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-600 rounded-full text-[11px] font-light">매장픽업</Badge>;
      default: return <Badge variant="outline" className="rounded-full text-[11px] font-light">{type}</Badge>;
    }
  };

  if (!hasAccess) {
    return <AccessDenied requiredTier="ERP" />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <PageHeader 
        title="주문 현황" 
        description="실시간 주문 접수 및 배송/픽업 작업 현황입니다." 
        icon={ClipboardList}
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/orders/daily-settlement')} className="rounded-xl font-light bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 text-xs">
            <BarChart3 className="h-4 w-4 mr-2" /> 일일 정산 관리
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            fetchOrdersByRange(startOfMonth(new Date()), endOfMonth(new Date()));
          }} className="rounded-xl font-light bg-white h-10 px-4 text-xs">
            <RefreshCw className="h-4 w-4 mr-2" /> 새로고침
          </Button>
          <Button size="sm" onClick={() => router.push("/dashboard/orders/new")} className="rounded-xl font-light px-5 h-10 text-xs shadow-lg shadow-primary/20">
            <PlusCircle className="h-4 w-4 mr-2" /> 새 주문 접수
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-3xl overflow-hidden relative group">
           <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-150 transition-all" />
           <CardContent className="p-5 font-light">
              <div className="flex items-center gap-2 text-white/90 text-[12px] font-medium mb-3 uppercase tracking-wider">
                 <Calendar className="w-3 h-3" /> 연 총매출 ({format(new Date(), 'yyyy')})
              </div>
              <div className="text-2xl font-light text-white">₩{stats.yearRevenue.toLocaleString()}</div>
              <div className="mt-2 text-[10px] text-white/70 font-medium">올해 누적 결제 완료액</div>
           </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden relative group">
           <CardContent className="p-5 font-light">
              <div className="flex items-center gap-2 text-slate-900 text-[12px] font-medium mb-3 uppercase tracking-wider">
                 <TrendingUp className="w-3 h-3 text-emerald-500" /> 이번 달 매출
              </div>
              <div className="text-2xl font-light text-gray-900">₩{stats.monthRevenue.toLocaleString()}</div>
              <div className="mt-2 text-[10px] text-emerald-600 font-light bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                {format(new Date(), 'MM월')} 실적 집계 중
              </div>
           </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden relative group">
           <CardContent className="p-5 font-light">
              <div className="flex items-center gap-2 text-slate-900 text-[12px] font-medium mb-3 uppercase tracking-wider">
                 <DollarSign className="w-3 h-3 text-blue-500" /> 금일 매출
              </div>
              <div className="text-2xl font-light text-blue-600">₩{stats.todayRevenue.toLocaleString()}</div>
              <div className="mt-2 flex items-center justify-between">
                 <span className="text-[10px] text-slate-500 font-light">{stats.todayCount}건 접수됨</span>
                 <ArrowUpRight className="w-4 h-4 text-blue-500" />
              </div>
           </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-slate-900 text-white rounded-3xl overflow-hidden relative group">
           <CardContent className="p-5 font-light">
              <div className="flex items-center gap-2 text-white/90 text-[12px] font-medium mb-3 uppercase tracking-wider">
                 <Loader2 className="w-3 h-3 animate-spin" /> 현재 작업 중
              </div>
              <div className="text-2xl font-light text-amber-400">{stats.processingCount} <span className="text-xs font-medium text-white/50 ml-1">건</span></div>
              <div className="mt-2 text-[10px] text-white/70 font-medium">제작 및 배송 대기 중인 주문</div>
           </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
        <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/30">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center sm:items-end">
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-700" />
                <Input
                  type="search"
                  placeholder="주문자, 받는분, 연락처, 주문번호 검색"
                  className="pl-10 h-10 rounded-xl border-gray-200 focus:ring-primary/20 text-xs font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedStatus} onValueChange={(val) => val && setSelectedStatus(val)}>
                <SelectTrigger className="w-[120px] h-10 rounded-xl border-gray-200 text-xs font-light">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs font-medium">전체 상태</SelectItem>
                  <SelectItem value="processing" className="text-xs font-medium">준비중</SelectItem>
                  <SelectItem value="completed" className="text-xs font-medium">완료</SelectItem>
                  <SelectItem value="canceled" className="text-xs font-medium">취소</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedReceiptType} onValueChange={(val) => val && setSelectedReceiptType(val)}>
                <SelectTrigger className="w-[120px] h-10 rounded-xl border-gray-200 text-xs font-light">
                  <SelectValue placeholder="수령방식" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs font-medium">전체 수령</SelectItem>
                  <SelectItem value="delivery_reservation" className="text-xs font-medium">배송</SelectItem>
                  <SelectItem value="pickup_reservation" className="text-xs font-medium">픽업</SelectItem>
                  <SelectItem value="store_pickup" className="text-xs font-medium">매장픽업</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-slate-700 h-10 px-3 hover:bg-gray-100 rounded-xl">
                   <Download className="w-4 h-4 mr-2" /> 엑셀
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-y border-slate-100/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-slate-900 font-medium py-4 px-6 text-[12px] uppercase tracking-wider">주문일시</TableHead>
                    <TableHead className="text-slate-900 font-medium py-4 text-[12px] uppercase tracking-wider">주문번호</TableHead>
                    <TableHead className="text-slate-900 font-medium py-4 text-[12px] uppercase tracking-wider">주문자/수령인</TableHead>
                    <TableHead className="text-slate-900 font-medium py-4 text-center text-[12px] uppercase tracking-wider">수령방식</TableHead>
                    <TableHead className="text-slate-900 font-medium py-4 text-right text-[12px] uppercase tracking-wider">결제금액</TableHead>
                    <TableHead className="text-slate-900 font-medium py-4 text-center px-6 text-[12px] uppercase tracking-wider">상태</TableHead>
                    <TableHead className="w-[100px] text-slate-900 font-medium py-4 text-right pr-6 text-[12px] uppercase tracking-wider">동작</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center text-slate-700 font-medium font-light">검색된 주문 내역이 없습니다.</TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow 
                        key={order.id} 
                        className="cursor-pointer hover:bg-gray-50/80 transition-colors border-b last:border-0 h-16"
                        onClick={() => handleRowClick(order)}
                      >
                        <TableCell className="px-6 py-3">
                           <div className="flex flex-col">
                              <span className="font-light text-gray-900 text-xs">{format(parseDate(order.order_date), 'MM/dd')}</span>
                              <span className="text-[10px] text-slate-700 font-light">{format(parseDate(order.order_date), 'HH:mm')}</span>
                           </div>
                        </TableCell>
                        <TableCell>
                           <span className="font-mono text-xs text-slate-700 uppercase tracking-tighter">{order.order_number}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-light text-gray-800">{order.orderer?.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                               <ArrowUpRight className="w-3 h-3 text-gray-300" />
                               <span className="text-[11px] font-light text-gray-500">{getRecipientName(order)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getReceiptTypeBadge(order.receipt_type)}
                        </TableCell>
                        <TableCell className="text-right">
                           <div className="flex flex-col items-end">
                              <span className="text-sm font-light text-gray-900 tracking-tight">₩{(order.summary?.total || 0).toLocaleString()}</span>
                              <span className="text-[9px] text-slate-700 font-light uppercase">{order.payment?.method === 'card' ? '카드' : order.payment?.method === 'transfer' ? '이체' : '기타'}</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-center px-6">
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()} className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger className={cn(
                              buttonVariants({ variant: "ghost" }), 
                              "h-9 w-9 p-0 hover:bg-gray-100 rounded-xl"
                            )}>
                              <MoreHorizontal className="h-5 w-5 text-slate-700" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 p-1 rounded-2xl shadow-2xl border-none">
                              <DropdownMenuLabel className="text-[10px] font-light text-slate-700 uppercase px-3 py-2">동작 관리</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/orders/print-preview/${order.id}`)} className="rounded-xl gap-2 font-light py-2.5 text-xs">
                                <FileText className="h-4 w-4 text-primary" /> 주문서 출력
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintClick(order)} className="rounded-xl gap-2 font-light py-2.5 text-xs">
                                <Printer className="h-4 w-4 text-emerald-500" /> 메시지/카드 인쇄
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="mx-1 bg-gray-50" />
                              <DropdownMenuItem onClick={() => handleEditClick(order)} className="rounded-xl gap-2 font-light py-2.5 text-xs">
                                <PlusCircle className="h-4 w-4 text-blue-500" /> 주문 정보 수정
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(order.id, order.status === 'completed' ? 'processing' : 'completed')} 
                                className="rounded-xl gap-2 font-light py-2.5 text-xs"
                              >
                                {order.status === 'completed' ? <Loader2 className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500 font-light" />}
                                {order.status === 'completed' ? '준비중으로 복구' : '완료 처리'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOutsourceClick(order)} className="rounded-xl gap-2 font-light py-2.5 text-indigo-600 text-xs">
                                <Package className="h-4 w-4" /> 외부 연합 발주
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="mx-1 bg-gray-50" />
                              <DropdownMenuItem className="text-rose-600 rounded-xl gap-2 font-light py-2.5 hover:bg-rose-50 text-xs" onClick={() => handleDeleteClick(order.id)}>
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
            <AlertDialogTitle className="text-xl font-light">주문을 영구 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-light pt-2">
              이 작업은 되돌릴 수 없으며, 모든 매출 통계에서 해당 주문 데이터가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl font-light h-11">아니오, 취소함</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 rounded-xl font-light h-11 border-none">네, 삭제하겠습니다</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
