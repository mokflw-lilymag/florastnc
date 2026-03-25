"use client";
import * as React from 'react';
import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Truck, 
  ShoppingBag, 
  MapPin, 
  Clock, 
  Phone, 
  User, 
  Search,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Printer,
  ChevronRight,
  ExternalLink,
  Loader2,
  Info,
  Calendar as CalendarIcon,
  Settings,
  Plus,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSettings } from '@/hooks/use-settings';
import { useOrders } from '@/hooks/use-orders';
import { Badge } from '@/components/ui/badge';
import { format, isToday, parseISO, addDays, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessagePrintDialog } from '../orders/components/message-print-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

export default function DeliveryManagementPage() {
  const { orders, loading, updateOrder } = useOrders();
  const { settings, saveSettings } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "delivery" | "pickup">("all");
  const [newCarrier, setNewCarrier] = useState("");
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateFilterMode, setDateFilterMode] = useState<"today" | "tomorrow" | "all" | "custom">("today");
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<any>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Date Filter
      const orderDate = order.order_date ? new Date(order.order_date) : null;
      let dateMatch = true;

      if (dateFilterMode === "today") {
        dateMatch = orderDate ? isToday(orderDate) : false;
      } else if (dateFilterMode === "tomorrow") {
        dateMatch = orderDate ? isSameDay(orderDate, addDays(new Date(), 1)) : false;
      } else if (dateFilterMode === "custom" && selectedDate) {
        dateMatch = orderDate ? isSameDay(orderDate, selectedDate) : false;
      }

      if (!dateMatch) return false;

      // Type Filter
      const isDelivery = order.receipt_type === "delivery_reservation";
      const isPickup = order.receipt_type === "pickup_reservation" || order.receipt_type === "store_pickup";
      
      if (filterType === "delivery" && !isDelivery) return false;
      if (filterType === "pickup" && !isPickup) return false;

      // Search Filter
      const matchSearch = 
        order.orderer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.delivery_info?.recipientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.delivery_info?.address || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchSearch;
    });
  }, [orders, searchTerm, filterType, dateFilterMode, selectedDate]);

  const handleStatusChange = async (orderId: string, status: 'processing' | 'completed' | 'canceled') => {
    try {
      await updateOrder(orderId, { status });
      toast.success(`주문 상태가 ${status === 'completed' ? '완료' : '변경'}되었습니다.`);
    } catch (error) {
       toast.error("상태 변경 실패");
    }
  };

  const openRibbonPrint = (order: any) => {
    setPrintingOrder(order);
    setIsPrintDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <PageHeader 
        title="배송 및 픽업 관리" 
        description="오늘의 배송 및 픽업 일정을 확인하고 진행 상태를 관리합니다."
        icon={Truck}
      >
        <Link 
          href="/dashboard/delivery/profit" 
          className={cn(buttonVariants({ variant: "outline" }), "gap-2 font-bold shadow-sm rounded-xl border-gray-200")}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" /> 배송비 정산 내역
        </Link>
        <Dialog>
          <DialogTrigger render={<Button variant="outline" className="gap-2 font-bold shadow-sm rounded-xl border-gray-200" />}>
            <Settings className="w-4 h-4" /> 배송업체 관리
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>배송업체 항목 관리</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="새 배송업체 입력" 
                  value={newCarrier}
                  onChange={(e) => setNewCarrier(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCarrier) {
                      saveSettings({
                        ...settings,
                        deliveryCarriers: [...(settings.deliveryCarriers || []), newCarrier]
                      });
                      setNewCarrier("");
                    }
                  }}
                />
                <Button onClick={() => {
                  if (newCarrier) {
                    saveSettings({
                      ...settings,
                      deliveryCarriers: [...(settings.deliveryCarriers || []), newCarrier]
                    });
                    setNewCarrier("");
                  }
                }}>
                  <Plus className="w-4 h-4" /> 추가
                </Button>
              </div>
              <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                {(settings?.deliveryCarriers || []).map((carrier: string, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3">
                    <span className="font-medium text-sm">{carrier}</span>
                    <Button variant="ghost" size="sm" onClick={() => {
                      saveSettings({
                        ...settings,
                        deliveryCarriers: settings.deliveryCarriers.filter((_, i) => i !== idx)
                      });
                    }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                {(!settings?.deliveryCarriers || settings.deliveryCarriers.length === 0) && (
                  <div className="p-4 text-center text-sm text-gray-500">등록된 배송업체가 없습니다.</div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none shadow-lg shadow-indigo-200">
           <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-indigo-100 text-sm font-medium">전체 일정</p>
                    <h3 className="text-3xl font-bold mt-1 text-white">{filteredOrders.length} <span className="text-lg font-normal">건</span></h3>
                 </div>
                 <div className="p-2 bg-white/20 rounded-lg">
                    <Clock className="w-6 h-6" />
                 </div>
              </div>
           </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg shadow-blue-200">
           <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-blue-100 text-sm font-medium">배송 예약</p>
                    <h3 className="text-3xl font-bold mt-1 text-white">
                      {filteredOrders.filter(o => o.receipt_type === "delivery_reservation").length} <span className="text-lg font-normal">건</span>
                    </h3>
                 </div>
                 <div className="p-2 bg-white/20 rounded-lg">
                    <Truck className="w-6 h-6" />
                 </div>
              </div>
           </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-lg shadow-amber-200">
           <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-amber-100 text-sm font-medium">픽업 예약</p>
                    <h3 className="text-3xl font-bold mt-1 text-white">
                      {filteredOrders.filter(o => o.receipt_type !== "delivery_reservation").length} <span className="text-lg font-normal">건</span>
                    </h3>
                 </div>
                 <div className="p-2 bg-white/20 rounded-lg">
                    <ShoppingBag className="w-6 h-6" />
                 </div>
              </div>
           </CardContent>
        </Card>
      </div>

      {/* Date Filter & Status Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
          <Button 
            variant={dateFilterMode === "today" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDateFilterMode("today")}
            className={`rounded-xl px-4 h-9 font-bold ${dateFilterMode === "today" ? "bg-primary text-white" : "text-gray-500"}`}
          >
            오늘
          </Button>
          <Button 
            variant={dateFilterMode === "tomorrow" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDateFilterMode("tomorrow")}
            className={`rounded-xl px-4 h-9 font-bold ${dateFilterMode === "tomorrow" ? "bg-primary text-white" : "text-gray-500"}`}
          >
            내일
          </Button>
          <Button 
            variant={dateFilterMode === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDateFilterMode("all")}
            className={`rounded-xl px-4 h-9 font-bold ${dateFilterMode === "all" ? "bg-primary text-white" : "text-gray-500"}`}
          >
            전체 일정
          </Button>
          
          <div className="h-4 w-[1px] bg-gray-200 mx-1" />
          
          <Popover>
            <PopoverTrigger className={cn(
                buttonVariants({ variant: dateFilterMode === "custom" ? "default" : "ghost", size: "sm" }),
                "rounded-xl px-4 h-9 font-bold gap-2",
                dateFilterMode === "custom" ? "bg-primary text-white" : "text-gray-500"
              )}>
              <CalendarIcon className="w-4 h-4" />
              {selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '날짜 선택'}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setDateFilterMode("custom");
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-2xl shadow-sm border border-gray-100/50">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl w-full md:w-auto">
              <Button 
                variant={filterType === "all" ? "default" : "ghost"}
                onClick={() => setFilterType("all")}
                className={`rounded-lg flex-1 md:flex-none h-9 ${filterType === "all" ? "bg-white text-black shadow-sm font-bold border-none" : "text-gray-500 hover:text-black hover:bg-white/50"}`}
              >
                전체
              </Button>
              <Button 
                variant={filterType === "delivery" ? "default" : "ghost"}
                onClick={() => setFilterType("delivery")}
                className={`rounded-lg flex-1 md:flex-none h-9 ${filterType === "delivery" ? "bg-white text-blue-600 shadow-sm font-bold border-none" : "text-gray-500 hover:text-blue-600 hover:bg-white/50"}`}
              >
                배송
              </Button>
              <Button 
                variant={filterType === "pickup" ? "default" : "ghost"}
                onClick={() => setFilterType("pickup")}
                className={`rounded-lg flex-1 md:flex-none h-9 ${filterType === "pickup" ? "bg-white text-amber-600 shadow-sm font-bold border-none" : "text-gray-500 hover:text-amber-600 hover:bg-white/50"}`}
              >
                픽업
              </Button>
          </div>
          <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="주문자, 수령인, 주소 검색..." 
                className="pl-10 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-none shadow-xl overflow-hidden bg-white/90 backdrop-blur-sm">
        <CardContent className="p-0">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-gray-500 font-medium animate-pulse text-lg">데이터를 매칭하는 중...</p>
             </div>
           ) : (
             <Table>
                <TableHeader className="bg-gray-50/80">
                   <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="py-4 pl-6 font-bold text-gray-700">시간 / 구분</TableHead>
                      <TableHead className="font-bold text-gray-700">고객 정보</TableHead>
                      <TableHead className="font-bold text-gray-700">상품 정보</TableHead>
                      <TableHead className="font-bold text-gray-700">수령 정보</TableHead>
                      <TableHead className="font-bold text-gray-700 text-center">상태</TableHead>
                      <TableHead className="pr-6 text-right font-bold text-gray-700">관리</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {filteredOrders.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={6} className="h-96 text-center">
                           <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                              <Truck className="w-20 h-20" />
                              <p className="text-xl font-bold">진행 중인 배송/픽업 일정이 없습니다.</p>
                           </div>
                        </TableCell>
                     </TableRow>
                   ) : (
                     filteredOrders.map((order) => {
                       const isDelivery = order.receipt_type === "delivery_reservation";
                       const info = isDelivery ? order.delivery_info : order.pickup_info;
                       
                       return (
                         <TableRow key={order.id} className="group hover:bg-gray-50/80 transition-all border-b border-gray-100 last:border-none">
                            <TableCell className="py-6 pl-6">
                               <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 text-primary font-bold text-lg">
                                     <Clock className="w-4 h-4" />
                                     {info?.time || "시간미정"}
                                  </div>
                                  <Badge 
                                    className={`w-fit py-0.5 px-2 text-[10px] font-black uppercase tracking-wider shadow-sm transition-all ${
                                      isDelivery ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"
                                    }`}
                                  >
                                    {isDelivery ? "Delivery" : "Pickup"}
                                  </Badge>
                               </div>
                            </TableCell>
                            <TableCell>
                               <div className="flex flex-col">
                                  <span className="font-bold text-gray-900 text-base">{order.orderer.name}</span>
                                  <span className="text-xs text-gray-500 font-medium mt-0.5">{order.orderer.contact}</span>
                                  <span className="text-[10px] text-gray-400 mt-1 font-mono tracking-tighter">#{order.order_number}</span>
                               </div>
                            </TableCell>
                            <TableCell>
                               <div className="max-w-[200px]">
                                  <p className="font-semibold text-gray-700 truncate text-sm">
                                    {order.items.map((item: any) => item.name).join(", ")}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate italic">
                                    {order.memo || "요청사항 없음"}
                                  </p>
                               </div>
                            </TableCell>
                            <TableCell>
                               {isDelivery ? (
                                 <div className="flex flex-col gap-1 max-w-[250px]">
                                    <div className="flex items-center gap-1.5 font-bold text-sm text-gray-800">
                                       <MapPin className="w-3.5 h-3.5 text-red-500" />
                                       <span className="truncate">{order.delivery_info?.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                                       <User className="w-3 h-3" /> {order.delivery_info?.recipientName}
                                       <span className="text-gray-300">|</span>
                                       <Phone className="w-3 h-3" /> {order.delivery_info?.recipientContact}
                                    </div>
                                 </div>
                               ) : (
                                 <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 font-bold text-sm text-gray-800">
                                       <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                                       매장 수령
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                                       <User className="w-3 h-3" /> {order.pickup_info?.pickerName}
                                       <span className="text-gray-300">|</span>
                                       <Phone className="w-3 h-3" /> {order.pickup_info?.pickerContact}
                                    </div>
                                 </div>
                               )}
                            </TableCell>
                            <TableCell className="text-center">
                               <Badge 
                                 variant="outline" 
                                 className={`rounded-lg px-2.5 py-1 text-xs font-bold shadow-sm transition-all border-2 ${
                                   order.status === 'completed' 
                                     ? "bg-green-50 text-green-700 border-green-200" 
                                     : order.status === 'processing'
                                       ? "bg-blue-50 text-blue-700 border-blue-200"
                                       : "bg-red-50 text-red-700 border-red-200"
                                 }`}
                               >
                                 {order.status === 'completed' ? "처리 완료" : order.status === 'processing' ? "준비중" : "취소됨"}
                               </Badge>
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                               <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="rounded-xl font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={() => handleStatusChange(order.id, 'completed')}
                                    disabled={order.status === 'completed'}
                                  >
                                    완료처리
                                  </Button>
                                  
                                  <DropdownMenu>
                                     <DropdownMenuTrigger className={cn(
                                         buttonVariants({ variant: "ghost", size: "icon" }),
                                         "rounded-xl h-8 w-8"
                                       )}>
                                        <MoreVertical className="w-4 h-4" />
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end" className="rounded-xl w-40 p-1">
                                        <DropdownMenuItem onClick={() => openRibbonPrint(order)} className="rounded-lg gap-2 font-medium">
                                           <Printer className="w-4 h-4 text-primary" /> 리본 출력
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => window.location.href=`/dashboard/orders/${order.id}`} className="rounded-lg gap-2 font-medium">
                                           <ExternalLink className="w-4 h-4 text-blue-500" /> 상세 보기
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'processing')} className="rounded-lg gap-2 font-medium">
                                           <Loader2 className="w-4 h-4 text-amber-500" /> 준비중으로 변경
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'canceled')} className="rounded-lg gap-2 font-medium text-red-600 hover:bg-red-50">
                                           <AlertCircle className="w-4 h-4" /> 주문 취소
                                        </DropdownMenuItem>
                                     </DropdownMenuContent>
                                  </DropdownMenu>
                               </div>
                            </TableCell>
                         </TableRow>
                       );
                     })
                   )}
                </TableBody>
             </Table>
           )}
        </CardContent>
      </Card>
      
      {/* Footer Instructions */}
      <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50 flex items-start gap-3">
         <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
         <div className="text-xs text-blue-700 leading-relaxed font-medium">
            <p>• 배송 리스트는 실시간으로 업데이트 됩니다. 배송 출발 시 '준비중' 상태를 확인하고, 완료 시 '완료처리'를 눌러 상태를 변경해 주세요.</p>
            <p>• 리본 출력이 필요한 경우 리스트의 '더보기' 메뉴에서 바로 리본 출력 페이지로 이동할 수 있습니다.</p>
         </div>
      </div>

      {printingOrder && (
        <MessagePrintDialog
          isOpen={isPrintDialogOpen}
          onOpenChange={setIsPrintDialogOpen}
          onSubmit={(data) => {
            console.log("Printing message:", data);
            toast.success("인쇄 명령을 보냈습니다.");
            setIsPrintDialogOpen(false);
          }}
          order={printingOrder}
        />
      )}
    </div>
  );
}
