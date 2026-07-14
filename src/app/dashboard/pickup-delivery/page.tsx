"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  Package, Truck, CheckCircle, Clock, MapPin, Phone,
  Calendar as CalendarIcon, Download, DollarSign, Filter, Search, X
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/types/order";
import { useOrders } from "@/hooks/use-orders";;
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, subMonths, startOfMonth, endOfMonth, isToday } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBranches, Branch } from "@/hooks/use-branches";
import Textarea from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useSimpleExpenses } from "@/hooks/use-simple-expenses";
import { SimpleExpenseCategory } from "@/types/simple-expense";
import { usePartners } from "@/hooks/use-partners";
import { OrderDetailDialog } from "./components/order-detail-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Sub-components
import { TodayDashboard } from "./components/TodayDashboard";
import { PickupTable } from "./components/PickupTable";
import { DeliveryTable } from "./components/DeliveryTable";
import { DeliveryCostTable } from "./components/DeliveryCostTable";
import { CalendarView } from "./components/CalendarView";
import { DeliverySettingsDialog } from "./components/DeliverySettingsDialog";
import { DeliveryStatsChart } from "./components/DeliveryStatsChart";
import { parseDate } from "@/lib/date-utils";
import { useCurrency } from "@/hooks/use-currency";

const toLocalDate = (dateVal: any): Date => {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal === 'string') return new Date(dateVal);
  if (dateVal && typeof dateVal === 'object' && dateVal.seconds) return new Date(dateVal.seconds * 1000);
  return new Date(dateVal);
};

export default function PickupDeliveryPage() {
    const { symbol: currencySymbol } = useCurrency();
  const completeDelivery = async (id: string, completionPhotoUrl?: string, completedBy?: string) => {
  const order = orders.find(o => o.id === id);
  if (order) updateOrder(id, { status: "completed", delivery_info: { ...(order.delivery_info || {}), completionPhotoUrl, completedAt: new Date().toISOString(), completedBy } as any });
};
const { orders, loading, updateOrderStatus, updateOrder, fetchOrdersByRange } = useOrders(false);
  const { branches, loading: branchesLoading, updateBranch } = useBranches();
  const { user } = useAuth();
  const { addExpense, updateExpenseByOrderId, deleteExpenseByOrderId } = useSimpleExpenses();
  const { partners, addPartner } = usePartners();

  // View State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [activeTab, setActiveTab] = useState("pickup");
  const [dateFilterType, setDateFilterType] = useState<'order' | 'pickup' | 'delivery'>('pickup');
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());

  // Fetch orders when filters change
  useEffect(() => {
    if (viewMode === 'list') {
      if (startDate && endDate) {
        if (dateFilterType === 'pickup' || dateFilterType === 'delivery') {
          if (fetchOrdersByRange) fetchOrdersByRange(startDate, endDate);
        } else if (dateFilterType === 'order') {
          if (fetchOrdersByRange) fetchOrdersByRange(startDate, endDate);
        }
      }
    } else if (viewMode === 'calendar') {
      // In calendar mode, fetch data for the whole month of the current view
      const start = startOfMonth(currentCalendarDate);
      const end = endOfMonth(currentCalendarDate);
      if (fetchOrdersByRange) fetchOrdersByRange(start, end);
    }
  }, [viewMode, startDate, endDate, dateFilterType, currentCalendarDate, fetchOrdersByRange, fetchOrdersByRange, activeTab]);

  // Statistics specific range fetch
  useEffect(() => {
    if (activeTab === 'costs' || activeTab === 'stats') {
      const start = new Date(2026, 0, 1); // 2026년 1월 1일
      const end = endOfMonth(new Date());
      setStartDate(start);
      setEndDate(end);
      setDateFilterType('delivery');
    } else {
      // 픽업/배송 탭으로 돌아오면 해당 달로 리셋
      setStartDate(startOfMonth(new Date()));
      setEndDate(endOfMonth(new Date()));
      setDateFilterType('pickup');
    }
  }, [activeTab]);

  // UI States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'pickup' | 'delivery'>('pickup');
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined);
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined);
  const [isDeliveryCostDialogOpen, setIsDeliveryCostDialogOpen] = useState(false);
  const [selectedOrderForCost, setSelectedOrderForCost] = useState<Order | null>(null);
  const [deliveryCost, setDeliveryCost] = useState('');
  const [deliveryCostCash, setDeliveryCostCash] = useState('');
  const [deliveryAffiliation, setDeliveryAffiliation] = useState('');
  const [deliveryCostReason, setDeliveryCostReason] = useState('');

  const [editingDriverInfo, setEditingDriverInfo] = useState<{
    orderId: string;
    driverAffiliation: string;
    driverName: string;
    driverContact: string;
    actual_delivery_cost?: string;
    actual_delivery_cost_cash?: string;
  } | null>(null);

  // Settings States
  const [isDeliveryFeeSettingsOpen, setIsDeliveryFeeSettingsOpen] = useState(false);
  const [selectedBranchForSettings, setSelectedBranchForSettings] = useState<Branch | null>(null);

  const isAdmin = user?.role === '본사 관리자';
  const userBranch = user?.franchise;

  // Integration Logic
  const ensurePartnerExists = async (driverAffiliation: string, driverName?: string, driverContact?: string) => {
    if (!driverAffiliation || driverAffiliation === '운송업체') return;
    try {
      const existingPartner = partners.find(partner =>
        partner.name === driverAffiliation ||
        partner.contact_person === driverName ||
        partner.contact === driverContact
      );
      if (!existingPartner) {
        await addPartner({
          name: driverAffiliation,
          type: '운송업체',
          contact_person: driverName || '',
          contact: driverContact || '',
          memo: `자동 등록 - 기사: ${driverName || ''}`,
          items: '배송 서비스',
          bank_account: '',
          business_number: '',
          ceo_name: '',
          address: '',
          email: ''
        });
      }
    } catch (error) { console.error('거래처 자동 등록 오류:', error); }
  };

  // 운송비(배송비) 지출 동기화 헬퍼 함수
  const syncDeliveryExpense = async (
    orderId: string,
    actualCost: number,
    actualCostCash: number,
    driverAffil: string,
    pickupDateStr: string | undefined,
    tenantName: string
  ) => {
    try {
      const branchId = branches.find(b => b.name === tenantName)?.id || branches[0]?.id || '';
      
      // 기존 배송비 지출 내역 모두 삭제
      await deleteExpenseByOrderId(orderId, 'delivery');

      const parsedDate = pickupDateStr ? parseDate(pickupDateStr) : null;
      const targetDate = parsedDate || new Date();

      const baseExpenseData = {
        date: targetDate,
        category: 'transport' as any,
        subCategory: 'delivery',
        description: `배송비 (${driverAffil || '운송업체'})`,
        supplier: driverAffil || '운송업체',
        quantity: 1,
        relatedOrderId: orderId
      };

      // 1. 실제배송비(카드)
      if (actualCost > 0 && branchId) {
        await addExpense({
          ...baseExpenseData,
          amount: actualCost,
          unitPrice: actualCost,
          paymentMethod: 'card' as any,
          inventoryUpdates: []
        }, branchId, tenantName);
      }

      // 2. 기사현금지급(현금)
      if (actualCostCash > 0 && branchId) {
        await addExpense({
          ...baseExpenseData,
          amount: actualCostCash,
          unitPrice: actualCostCash,
          paymentMethod: 'cash' as any,
          description: `배송비 현금지급 (${driverAffil || '운송업체'})`,
          inventoryUpdates: []
        }, branchId, tenantName);
      }
    } catch (e) { console.error('배송비 지출 동기화 에러', e); }
  };

  // Handlers
  const handleCompletePickup = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'completed');
      toast.success('픽업이 완료 처리되었습니다.');
    } catch (error) { toast.error('픽업 완료 처리 중 오류가 발생했습니다.'); }
  };

  const handleCompleteDelivery = async (orderId: string, completionPhotoUrl?: string) => {
    try {
      if (completionPhotoUrl) {
        await completeDelivery(orderId, completionPhotoUrl, user?.id);
        
        // 배송 완료 알림톡 자동 발송
        try {
//          await AlimtalkService.sendDeliveryComplete(orderId, completionPhotoUrl);
        } catch (alimtalkError) {
          console.error('알림톡 발송 중 오류:', alimtalkError);
          // 알림톡 실패해도 배송 완료 처리는 유지
        }
        
        toast.success('사진과 함께 배송이 완료 처리되었습니다.');
      } else {
        await updateOrderStatus(orderId, 'completed');
        toast.success('배송이 완료 처리되었습니다.');
      }
    } catch (error) { toast.error('배송 완료 처리 중 오류가 발생했습니다.'); }
  };

  const handleDeleteDeliveryPhoto = async (orderId: string, photoUrl: string) => {
    if (!confirm('배송완료 사진을 삭제하시겠습니까?')) return;
    try {
      const { deleteFromOptimalStorage } = await import('@/lib/storage-manager');
      await deleteFromOptimalStorage(photoUrl);
      const order = orders.find(o => o.id === orderId);
      if (order?.delivery_info) {
        await updateOrder(orderId, { delivery_info: { ...order.delivery_info, completionPhotoUrl: undefined } });
        toast.success("사진 삭제 완료");
      }
    } catch (error) { toast.error('사진 삭제 중 오류가 발생했습니다.'); }
  };

  const handleUpdateDriverInfo = async () => {
    if (!editingDriverInfo) return;
    try {
      const order = orders.find(o => o.id === editingDriverInfo.orderId);
      if (!order?.delivery_info) return;
      const updateData: any = {
        delivery_info: {
          ...order.delivery_info,
          driverAffiliation: editingDriverInfo.driverAffiliation,
          driverName: editingDriverInfo.driverName,
          driverContact: editingDriverInfo.driverContact,
        }
      };
      if (editingDriverInfo.actual_delivery_cost?.trim() || editingDriverInfo.actual_delivery_cost_cash?.trim()) {
        const actualCost = parseInt(editingDriverInfo.actual_delivery_cost || '0');
        const actualCostCash = parseInt(editingDriverInfo.actual_delivery_cost_cash || '0');
        updateData.actual_delivery_cost = actualCost;
        updateData.actual_delivery_cost_cash = actualCostCash;
        updateData.deliveryCostStatus = 'completed';
        updateData.deliveryProfit = (order.summary?.deliveryFee || 0) - (actualCost + actualCostCash);

        // 배송업체 자동 등록
        await ensurePartnerExists(
          editingDriverInfo.driverAffiliation,
          editingDriverInfo.driverName,
          editingDriverInfo.driverContact
        );
      }
      await updateOrder(editingDriverInfo.orderId, updateData);

      // 배송비 지출 내역 동기화
      const actualCost = parseInt(editingDriverInfo.actual_delivery_cost || '0');
      const actualCostCash = parseInt(editingDriverInfo.actual_delivery_cost_cash || '0');
      await syncDeliveryExpense(
        editingDriverInfo.orderId,
        actualCost,
        actualCostCash,
        editingDriverInfo.driverAffiliation,
        order.delivery_info?.date || order.pickup_info?.date || order.order_date,
        order.tenant_id || ''
      );

      toast.success('정보가 업데이트되었습니다.');
      setIsDriverDialogOpen(false);
    } catch (error) {
      console.error('Driver info update error:', error);
      toast.error('정보 업데이트 중 오류가 발생했습니다.');
    }
  };

  const handleExportToExcel = () => {
    if (!exportStartDate || !exportEndDate) {
      toast.error('시작일과 종료일을 모두 선택해주세요.');
      return;
    }
    try {
      const startDateStr = format(exportStartDate, 'yyyy-MM-dd');
      const endDateStr = format(exportEndDate, 'yyyy-MM-dd');
      const targetOrders = exportType === 'pickup' ? pickupOrders : deliveryOrders;
      console.log(targetOrders, exportType, startDateStr, endDateStr);
      toast.success('엑셀 파일이 다운로드되었습니다.');
      setIsExportDialogOpen(false);
      setExportStartDate(undefined);
      setExportEndDate(undefined);
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('엑셀 파일 생성 중 오류가 발생했습니다.');
    }
  };

  const handleSaveDeliveryCost = async () => {
    if (!selectedOrderForCost) return;
    try {
      const actualCost = parseInt(deliveryCost || '0');
      const actualCostCash = parseInt(deliveryCostCash || '0');

      const updateData: any = {
        actual_delivery_cost: actualCost,
        actual_delivery_cost_cash: actualCostCash,
        deliveryCostStatus: 'completed',
        deliveryCostUpdatedAt: new Date().toISOString(),
        deliveryCostUpdatedBy: user?.email || 'unknown',
        deliveryCostReason: deliveryCostReason,
        deliveryProfit: (selectedOrderForCost.summary?.deliveryFee || 0) - (actualCost + actualCostCash),
      };

      // 배송 소속 정보 업데이트
      if (deliveryAffiliation || selectedOrderForCost.delivery_info) {
        updateData.delivery_info = {
          ...(selectedOrderForCost.delivery_info || {}),
          driverAffiliation: deliveryAffiliation || selectedOrderForCost.delivery_info?.driverAffiliation || ''
        };
      }

      await updateOrder(selectedOrderForCost.id, updateData);

      // 배송업체 자동 등록
      if (deliveryAffiliation) {
        await ensurePartnerExists(deliveryAffiliation);
      }

      // 배송비 지출 내역 동기화
      await syncDeliveryExpense(
        selectedOrderForCost.id,
        actualCost,
        actualCostCash,
        deliveryAffiliation || selectedOrderForCost.delivery_info?.driverAffiliation || '',
        selectedOrderForCost.delivery_info?.date || selectedOrderForCost.pickup_info?.date || selectedOrderForCost.order_date,
        selectedOrderForCost.tenantName || ''
      );

      toast.success('배송비 정보가 업데이트되었습니다.');
      setIsDeliveryCostDialogOpen(false);
      setSelectedOrderForCost(null);
      setDeliveryCost('');
      setDeliveryCostCash('');
      setDeliveryAffiliation('');
      setDeliveryCostReason('');
    } catch (error) {
      console.error('Error saving delivery cost:', error);
      toast.error('배송비 입력 중 오류가 발생했습니다.');
    }
  };

  const handleQuickFilter = (type: 'today' | 'tomorrow' | 'week' | 'month' | '2months' | '3months' | '6months' | 'year') => {
    const now = new Date();
    if (type === 'today') {
      setStartDate(startOfDay(now));
      setEndDate(endOfDay(now));
    } else if (type === 'tomorrow') {
      const tomorrow = addDays(now, 1);
      setStartDate(startOfDay(tomorrow));
      setEndDate(endOfDay(tomorrow));
    } else if (type === 'week') {
      setStartDate(startOfDay(startOfWeek(now, { weekStartsOn: 1 })));
      setEndDate(endOfDay(endOfWeek(now, { weekStartsOn: 1 })));
    } else if (type === 'month') {
      setStartDate(startOfMonth(now));
      setEndDate(endOfMonth(now));
    } else if (type === '2months') {
      setStartDate(startOfMonth(subMonths(now, 1)));
      setEndDate(endOfMonth(now));
    } else if (type === '3months') {
      setStartDate(startOfMonth(subMonths(now, 2)));
      setEndDate(endOfMonth(now));
    } else if (type === '6months') {
      setStartDate(startOfMonth(subMonths(now, 5)));
      setEndDate(endOfMonth(now));
    } else if (type === 'year') {
      setStartDate(startOfMonth(subMonths(now, 11)));
      setEndDate(endOfMonth(now));
    }
  };

  // Memoized Filters
  const isDateInRange = (dateString: string, start?: Date, end?: Date) => {
    if (!dateString) return true;
    const target = new Date(dateString);
    if (start && target < start) return false;
    if (end && target > end) return false;
    return true;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Basic Filters
      if (order.status === 'canceled') return false;
      if (!isAdmin && userBranch  ) return false;
      if (selectedBranch !== 'all'  ) return false;

      // Date Filter
      if (startDate || endDate) {
        let dateStr = '';
        if (dateFilterType === 'order') dateStr = toLocalDate(order.order_date).toISOString();
        else if (dateFilterType === 'pickup') dateStr = order.pickup_info?.date || '';
        else if (dateFilterType === 'delivery') dateStr = order.delivery_info?.date || '';

        const inRange = isDateInRange(dateStr, startDate, endDate);
        const isPending = order.status === 'processing';

        // 해당 달에 포함되거나, 아직 완료되지 않은(배송전/픽업전) 주문만 표시
        if (!inRange && !isPending) return false;
      }

      // Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return order.orderer.name.toLowerCase().includes(s) ||
          order.id.toLowerCase().includes(s) ||
          order.delivery_info?.recipientName?.toLowerCase().includes(s) ||
          order.pickup_info?.pickerName?.toLowerCase().includes(s);
      }
      return true;
    }).sort((a, b) => {
      // 배송일/픽업일 기준으로 정렬
      const dateA = a.receipt_type === 'delivery_reservation'
        ? (a.delivery_info?.date || '')
        : (a.pickup_info?.date || '');
      const dateB = b.receipt_type === 'delivery_reservation'
        ? (b.delivery_info?.date || '')
        : (b.pickup_info?.date || '');

      if (dateA !== dateB) return dateB.localeCompare(dateA);

      // 날짜가 같으면 시간순 (내림차순)
      const timeA = a.receipt_type === 'delivery_reservation'
        ? (a.delivery_info?.time || '00:00')
        : (a.pickup_info?.time || '00:00');
      const timeB = b.receipt_type === 'delivery_reservation'
        ? (b.delivery_info?.time || '00:00')
        : (b.pickup_info?.time || '00:00');

      return timeB.localeCompare(timeA);
    });
  }, [orders, isAdmin, userBranch, selectedBranch, startDate, endDate, dateFilterType, searchTerm]);

  const pickupOrders = useMemo(() => filteredOrders.filter(o => o.receipt_type === 'pickup_reservation'), [filteredOrders]);
  const deliveryOrders = useMemo(() => filteredOrders.filter(o => o.receipt_type === 'delivery_reservation'), [filteredOrders]);
  const completedDeliveryOrders = useMemo(() =>
    deliveryOrders.filter(o =>
      (o.status === 'completed' || o.actual_delivery_cost !== undefined) &&
      ((o.summary?.deliveryFee || 0) > 0 || (o.actual_delivery_cost || 0) > 0 || (o.actual_delivery_cost_cash || 0) > 0)
    ), [deliveryOrders]);

  const stats = useMemo(() => ({
    pendingPickup: pickupOrders.filter(o => o.status === 'processing').length,
    completedPickup: pickupOrders.filter(o => o.status === 'completed').length,
    pendingDelivery: deliveryOrders.filter(o => o.status === 'processing').length,
    completedDelivery: deliveryOrders.filter(o => o.status === 'completed').length,
  }), [pickupOrders, deliveryOrders]);

  if (loading || branchesLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-10 w-1/4" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="픽업/배송 관리"
        description="예약된 픽업 및 배송 일정을 한눈에 확인하고 관리하세요."
      >
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => {
                const branch = branches.find(b => b.name === (selectedBranch === 'all' ? (userBranch || branches[0]?.name) : selectedBranch));
                if (branch) {
                  setSelectedBranchForSettings(branch);
                  setIsDeliveryFeeSettingsOpen(true);
                }
              }}
              className="flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              배송비 설정
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setIsExportDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            엑셀 출력
          </Button>
        </div>
      </PageHeader>

      <TodayDashboard pickupOrders={pickupOrders} deliveryOrders={deliveryOrders} />

      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardContent className="p-4 pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="flex items-center gap-2 bg-white p-1 rounded-lg border mr-2">
                <Button
                  variant={viewMode === 'list' ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 text-xs font-medium"
                >
                  리스트형
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="h-8 text-xs font-medium"
                >
                  달력형
                </Button>
              </div>

              {viewMode === 'list' && (
                <>
                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="주문자, 번호 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-10 border-slate-200 bg-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-lg border">
                    <Button variant="ghost" size="sm" onClick={() => handleQuickFilter('today')} className="h-7 text-[10px] px-2">오늘</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleQuickFilter('tomorrow')} className="h-7 text-[10px] px-2">내일</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleQuickFilter('week')} className="h-7 text-[10px] px-2">이번주</Button>
                    <div className="w-[1px] h-3 bg-slate-200 mx-0.5" />
                    <Button variant="ghost" size="sm" onClick={() => handleQuickFilter('month')} className="h-7 text-[10px] px-2">당월</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleQuickFilter('2months')} className="h-7 text-[10px] px-2">2개월</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleQuickFilter('3months')} className="h-7 text-[10px] px-2">3개월</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleQuickFilter('6months')} className="h-7 text-[10px] px-2">6개월</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleQuickFilter('year')} className="h-7 text-[10px] px-2">1년</Button>
                  </div>

                  <Popover>
                    <PopoverTrigger render={(props) => (
                      <Button {...props} variant="outline" className="w-[130px] h-8 bg-slate-50 justify-start text-left font-normal border-slate-200">
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                        {startDate ? (endDate ? `${format(startDate, "MM/dd")} - ${format(endDate, "MM/dd")}` : format(startDate, "MM/dd")) : "기간 선택"}
                      </Button>
                    )} />
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-2 border-b">
                        <Select value={dateFilterType} onValueChange={(v: any) => setDateFilterType(v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pickup">픽업일 기준</SelectItem>
                            <SelectItem value="delivery">배송일 기준</SelectItem>
                            <SelectItem value="order">주문일 기준</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Calendar mode="range" selected={{ from: startDate, to: endDate }} onSelect={(range: any) => { setStartDate(range?.from); setEndDate(range?.to); }} initialFocus locale={ko} />
                    </PopoverContent>
                  </Popover>

                  <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setStartDate(undefined); setEndDate(undefined); }} className="h-10 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4 mr-1" /> 초기화
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <Select value={selectedBranch} onValueChange={(v: string | null) => setSelectedBranch(v || '')}>
                  <SelectTrigger className="w-[160px] h-10 bg-white">
                    <SelectValue placeholder="지점 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 지점</SelectItem>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === 'calendar' ? (
        <CalendarView
          orders={orders}
          onDateClick={(date) => {
            setStartDate(startOfDay(date));
            setEndDate(endOfDay(date));
            setViewMode('list');
          }}
          currentDate={currentCalendarDate}
          onCurrentDateChange={setCurrentCalendarDate}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full h-12 bg-slate-100 p-1">
            <TabsTrigger value="pickup" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              픽업 <Badge variant="secondary" className="ml-1.5 h-5 px-1 bg-slate-200 text-slate-600 border-none font-bold">{stats.pendingPickup}</Badge>
            </TabsTrigger>
            <TabsTrigger value="delivery" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              배송 <Badge variant="secondary" className="ml-1.5 h-5 px-1 bg-slate-200 text-slate-600 border-none font-bold">{stats.pendingDelivery}</Badge>
            </TabsTrigger>
            <TabsTrigger value="costs" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              차액 정산 <Badge variant="secondary" className="ml-1.5 h-5 px-1 bg-slate-200 text-slate-600 border-none font-bold">{completedDeliveryOrders.filter(o => !o.actual_delivery_cost).length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              통계분석
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pickup" className="mt-6">
            <PickupTable
              orders={pickupOrders}
              onComplete={handleCompletePickup}
              onRowClick={(order) => { setSelectedOrder(order); setIsDialogOpen(true); }}
              formatDateTime={(d, t) => {
                if (!d) return '-';
                const date = new Date(d);
                if (isNaN(date.getTime())) return '-';
                return `${format(date, 'MM/dd')} ${t || ''}`;
              }}
              getStatusBadge={(s) => s === 'processing' ? <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-none h-5 px-2 text-[10px]">처리중</Badge> : <Badge className="bg-green-100 text-green-700 border-none h-5 px-2 text-[10px]">완료</Badge>}
            />
          </TabsContent>

          <TabsContent value="delivery" className="mt-6">
            <DeliveryTable
              orders={deliveryOrders}
              onComplete={handleCompleteDelivery}
              onDeletePhoto={handleDeleteDeliveryPhoto}
              onEditDriver={(order) => {
                setEditingDriverInfo({
                  orderId: order.id,
                  driverAffiliation: order.delivery_info?.driverAffiliation || '',
                  driverName: order.delivery_info?.driverName || '',
                  driverContact: order.delivery_info?.driverContact || '',
                  actual_delivery_cost: order.actual_delivery_cost?.toString() || '',
                  actual_delivery_cost_cash: order.actual_delivery_cost_cash?.toString() || '',
                });
                setIsDriverDialogOpen(true);
              }}
              onRowClick={(order) => { setSelectedOrder(order); setIsDialogOpen(true); }}
              formatDateTime={(d, t) => {
                if (!d) return '-';
                const date = new Date(d);
                if (isNaN(date.getTime())) return '-';
                return `${format(date, 'MM/dd')} ${t || ''}`;
              }}
              getStatusBadge={(s) => s === 'processing' ? <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-none h-5 px-2 text-[10px]">배송전</Badge> : <Badge className="bg-green-100 text-green-700 border-none h-5 px-2 text-[10px]">완료</Badge>}
            />
          </TabsContent>

          <TabsContent value="costs" className="mt-6">
            <div className="bg-white p-4 rounded-xl border mb-6 flex justify-between items-center shadow-sm">
              <div>
                <h3 className="font-bold text-slate-800">배송 비용 정산 관리</h3>
                <p className="text-xs text-slate-500">고객 수취 배송비와 실제 지불 비용의 차액을 관리합니다.</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right border-r pr-4">
                  <p className="text-[10px] text-slate-400">전체 고객 배송비</p>
                  <p className="font-bold text-slate-700">{currencySymbol}{completedDeliveryOrders.reduce((sum, o) => sum + (o.summary?.deliveryFee || 0), 0).toLocaleString()}</p>
                </div>
                <div className="text-right border-r pr-4">
                  <p className="text-[10px] text-slate-400">전체 실제 지출</p>
                  <p className="font-bold text-red-600">{currencySymbol}{completedDeliveryOrders.reduce((sum, o) => sum + (o.actual_delivery_cost || 0) + (o.actual_delivery_cost_cash || 0), 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">전체 배송 수익</p>
                  <p className="font-bold text-emerald-600">{currencySymbol}{(
                    completedDeliveryOrders.reduce((sum, o) => sum + (o.summary?.deliveryFee || 0), 0) - 
                    completedDeliveryOrders.reduce((sum, o) => sum + (o.actual_delivery_cost || 0) + (o.actual_delivery_cost_cash || 0), 0)
                  ).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <DeliveryCostTable
              orders={completedDeliveryOrders}
              onCostInput={(order) => {
                setSelectedOrderForCost(order);
                setDeliveryCost(order.actual_delivery_cost?.toString() || '');
                setDeliveryCostCash(order.actual_delivery_cost_cash?.toString() || '');
                setDeliveryAffiliation(order.delivery_info?.driverAffiliation || '');
                setDeliveryCostReason((order as any).deliveryCostReason || '');
                setIsDeliveryCostDialogOpen(true);
              }}
              onRowClick={(order) => { setSelectedOrder(order); setIsDialogOpen(true); }}
            />
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <DeliveryStatsChart orders={deliveryOrders} />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      {selectedOrder && (
        <OrderDetailDialog
          order={selectedOrder}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}

      {/* 기사 정보 수정 다이얼로그 */}
      <Dialog open={isDriverDialogOpen} onOpenChange={setIsDriverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>배송 상세 정보 수정</DialogTitle>
            <DialogDescription>배송 기사 정보와 실제 배송 비용을 입력합니다.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="affiliation">배송 소속</Label>
              <Input
                id="affiliation"
                value={editingDriverInfo?.driverAffiliation}
                onChange={(e) => setEditingDriverInfo(prev => prev ? { ...prev, driverAffiliation: e.target.value } : null)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="driverName">기사 성함</Label>
              <Input
                id="driverName"
                value={editingDriverInfo?.driverName}
                onChange={(e) => setEditingDriverInfo(prev => prev ? { ...prev, driverName: e.target.value } : null)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="driverContact">연락처</Label>
              <Input
                id="driverContact"
                value={editingDriverInfo?.driverContact}
                onChange={(e) => setEditingDriverInfo(prev => prev ? { ...prev, driverContact: e.target.value } : null)}
              />
            </div>
            <div className="grid gap-2 border-t pt-4">
              <Label htmlFor="actualCost">실제 배송 비용 ({currencySymbol})</Label>
              <Input
                id="actualCost"
                type="number"
                placeholder="지출된 배송비를 입력하세요"
                value={editingDriverInfo?.actual_delivery_cost}
                onChange={(e) => setEditingDriverInfo(prev => prev ? { ...prev, actual_delivery_cost: e.target.value } : null)}
              />
              <p className="text-[10px] text-slate-400">배송비를 입력하면 자동으로 지출 내역에 등록됩니다.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="actualCostCash" className="text-red-600 font-bold">기사 현금 결제액 (시재 차감)</Label>
              <Input
                id="actualCostCash"
                type="number"
                placeholder="현금 지급액을 입력하세요"
                value={editingDriverInfo?.actual_delivery_cost_cash}
                onChange={(e) => setEditingDriverInfo(prev => prev ? { ...prev, actual_delivery_cost_cash: e.target.value } : null)}
                className="border-red-200 focus-visible:ring-red-500"
              />
              <p className="text-[10px] text-red-500">이 금액은 일일 정산 시재에서 차감됩니다.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsDriverDialogOpen(false)}>취소</Button>
            <Button onClick={handleUpdateDriverInfo}>저장하기</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 엑셀 수출 다이얼로그 */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>엑셀 출력 설정</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>출력 대상</Label>
              <RadioGroup value={exportType} onValueChange={(v: any) => setExportType(v)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pickup" id="ex-pickup" />
                  <Label htmlFor="ex-pickup">픽업 리스트</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="delivery" id="ex-delivery" />
                  <Label htmlFor="ex-delivery">배송 리스트</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>시작일</Label>
                <Input type="date" value={exportStartDate ? exportStartDate.toISOString().split('T')[0] : ''} onChange={(e) => setExportStartDate(new Date(e.target.value))} />
              </div>
              <div className="grid gap-2">
                <Label>종료일</Label>
                <Input type="date" value={exportEndDate ? exportEndDate.toISOString().split('T')[0] : ''} onChange={(e) => setExportEndDate(new Date(e.target.value))} />
              </div>
            </div>
          </div>
          <Button onClick={handleExportToExcel} className="w-full">파일 생성 및 다운로드</Button>
        </DialogContent>
      </Dialog>

      {/* 배송비 입력 다이얼로그 */}
      <Dialog open={isDeliveryCostDialogOpen} onOpenChange={setIsDeliveryCostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>배송 비용 및 정보 입력</DialogTitle>
            <DialogDescription>실제 지출된 배송비와 기사 정보를 입력합니다.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="deliveryAffiliation">배송 업체/소속</Label>
              <div className="flex flex-col gap-2">
                <Input
                  id="deliveryAffiliation"
                  value={deliveryAffiliation}
                  onChange={(e) => setDeliveryAffiliation(e.target.value)}
                  placeholder="직접 입력 또는 아래 버튼 선택"
                  className="h-9"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    { name: '카카오T', color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700' },
                    { name: '지역업체1', color: 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' },
                    { name: '지역업체2', color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700' }
                  ].map((company) => (
                    <Button
                      key={company.name}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`h-7 text-[10px] px-2 font-medium ${company.color}`}
                      onClick={() => setDeliveryAffiliation(company.name)}
                    >
                      {company.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="deliveryCost">실제 배송비 (비현금)</Label>
                <Input
                  id="deliveryCost"
                  type="number"
                  value={deliveryCost}
                  onChange={(e) => setDeliveryCost(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deliveryCostCash" className="text-red-600 font-bold">기사 현금 지급액</Label>
                <Input
                  id="deliveryCostCash"
                  type="number"
                  value={deliveryCostCash}
                  onChange={(e) => setDeliveryCostCash(e.target.value)}
                  placeholder="0"
                  className="border-red-200"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deliveryCostReason">비고 (메모)</Label>
              <Textarea
                id="deliveryCostReason"
                value={deliveryCostReason}
                onChange={(e) => setDeliveryCostReason(e.target.value)}
                placeholder="특이사항 입력"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setIsDeliveryCostDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveDeliveryCost}>정보 저장 및 지출 반영</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 배송 설정 다이얼로그 */}
      {selectedBranchForSettings && (
        <DeliverySettingsDialog
          branch={selectedBranchForSettings}
          isOpen={isDeliveryFeeSettingsOpen}
          onOpenChange={setIsDeliveryFeeSettingsOpen}
          onSave={async (branchId, settings) => {
            await updateBranch(branchId, settings as any);
            setIsDeliveryFeeSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}
