"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  PlusCircle, Search, MoreHorizontal, MessageSquare, 
  Upload, Download, FileText, ShoppingCart, 
  Package, Target, RefreshCw, Trash2, XCircle,
  Calendar as CalendarIcon, ExternalLink, Printer 
} from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { useOrders } from "@/hooks/use-orders";
import { Order } from "@/types/order";
import { parseDate } from "@/lib/date-utils";
import { OrderDetailDialog } from "./components/order-detail-dialog";
import { OrderEditDialog } from "./components/order-edit-dialog";
import { MessagePrintDialog } from "./components/message-print-dialog";
import { useRouter, useSearchParams } from "next/navigation";

export default function OrdersPage() {
  const { 
    orders, 
    loading, 
    fetchOrdersByRange, 
    updateOrderStatus, 
    deleteOrder, 
    cancelOrder 
  } = useOrders();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedReceiptType, setSelectedReceiptType] = useState("all");
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [isOrderEditOpen, setIsOrderEditOpen] = useState(false);
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
    // Default fetch for current month
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    fetchOrdersByRange(start, end);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchSearch = searchTerm === "" || 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderer.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = selectedStatus === "all" || order.status === selectedStatus;
      const matchReceiptType = selectedReceiptType === "all" || order.receipt_type === selectedReceiptType;

      return matchSearch && matchStatus && matchReceiptType;
    });
  }, [orders, searchTerm, selectedStatus, selectedReceiptType]);

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
      case 'completed': return <Badge variant="default" className="bg-blue-500">완료</Badge>;
      case 'processing': return <Badge variant="secondary" className="bg-yellow-500 text-white">처리중</Badge>;
      case 'canceled': return <Badge variant="destructive">취소</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReceiptTypeBadge = (type: string) => {
    switch (type) {
      case 'delivery_reservation': return <Badge variant="outline" className="border-green-500 text-green-600">배송</Badge>;
      case 'pickup_reservation': return <Badge variant="outline" className="border-purple-500 text-purple-600">픽업</Badge>;
      case 'store_pickup': return <Badge variant="outline" className="border-gray-500 text-gray-600">매장상시</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="주문 관리" 
        description="주문 내역을 조회하고 관리합니다." 
        icon={ShoppingCart}
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const start = startOfMonth(new Date());
            const end = endOfMonth(new Date());
            fetchOrdersByRange(start, end);
          }}>
            <RefreshCw className="h-4 w-4 mr-2" /> 새로고침
          </Button>
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-2" /> 새 주문
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="주문자, 주문번호 검색"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedStatus} onValueChange={(val) => val && setSelectedStatus(val)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="processing">처리중</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="canceled">취소</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedReceiptType} onValueChange={(val) => val && setSelectedReceiptType(val)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="수령방식" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 수령</SelectItem>
                  <SelectItem value="delivery_reservation">배송</SelectItem>
                  <SelectItem value="pickup_reservation">픽업</SelectItem>
                  <SelectItem value="store_pickup">매장픽업</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>주문일</TableHead>
                    <TableHead>주문번호</TableHead>
                    <TableHead>주문자</TableHead>
                    <TableHead>동작/수령</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">주문 내역이 없습니다.</TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow 
                        key={order.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(order)}
                      >
                        <TableCell className="text-xs">
                          {format(parseDate(order.order_date), 'MM/dd HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium text-xs">{order.order_number}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{order.orderer.name}</span>
                            <span className="text-[10px] text-muted-foreground">{order.orderer.contact}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getReceiptTypeBadge(order.receipt_type)}
                        </TableCell>
                        <TableCell className="text-sm font-semibold">
                          ₩{order.summary.total.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" className="h-8 w-8 p-0" />
                            }>
                                <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>동작</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleRowClick(order)}>
                                <FileText className="mr-2 h-4 w-4" /> 상세 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditClick(order)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> 수정
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintClick(order)}>
                                <Printer className="mr-2 h-4 w-4" /> 메시지 인쇄
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(order.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> 삭제
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>주문을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
