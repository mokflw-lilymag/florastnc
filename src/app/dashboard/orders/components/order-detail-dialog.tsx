"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  User, Phone, Mail, Building, MapPin, Calendar, Clock, 
  Package, MessageSquare, FileText, CreditCard, Truck, 
  Printer, Settings 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { parseDate } from "@/lib/date-utils";
import { isSettled } from "@/lib/order-utils";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { Order } from "@/types/order";

interface OrderDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onPrintMessage?: (order: Order) => void;
}

export function OrderDetailDialog({ isOpen, onOpenChange, order, onPrintMessage }: OrderDetailDialogProps) {
  const { user } = useAuth();
  const { updateOrder } = useOrders();
  const [editOrderDate, setEditOrderDate] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editSecondPaymentDate, setEditSecondPaymentDate] = useState("");
  
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editFirstPaymentMethod, setEditFirstPaymentMethod] = useState("");
  const [editSecondPaymentMethod, setEditSecondPaymentMethod] = useState("");

  const [isDateEditing, setIsDateEditing] = useState(false);

  useEffect(() => {
    if (order && isOpen) {
      setEditOrderDate(order.order_date ? format(parseDate(order.order_date), "yyyy-MM-dd") : "");
      
      const firstDate = order.payment?.isSplitPayment
        ? (order.payment.firstPaymentDate || order.payment.completedAt)
        : order.payment?.completedAt;

      setEditPaymentDate(firstDate ? format(parseDate(firstDate), "yyyy-MM-dd'T'HH:mm") : "");

      const secDate = order.payment?.secondPaymentDate || (order.payment?.isSplitPayment ? order.payment?.completedAt : null);
      setEditSecondPaymentDate(secDate ? format(parseDate(secDate), "yyyy-MM-dd'T'HH:mm") : "");

      const p: any = order.payment || {};
      setEditPaymentMethod(p.method || 'card');
      setEditFirstPaymentMethod(p.firstPaymentMethod || p.method || 'card');
      setEditSecondPaymentMethod(p.secondPaymentMethod || p.method || 'card');

      setIsDateEditing(false);
    }
  }, [order, isOpen]);

  const handleOrderDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setEditOrderDate(newDate);
    if (newDate) {
      const currentPaymentTime = editPaymentDate ? editPaymentDate.split('T')[1] : "09:00";
      setEditPaymentDate(`${newDate}T${currentPaymentTime}`);
    }
  };

  const isAdmin = true; // For now, allow simplification. Should be based on role.

  const handleSaveDateCorrection = async () => {
    if (!order) return;
    try {
      const updates: any = {};
      const original = parseDate(order.order_date);

      if (editOrderDate) {
        const newDate = new Date(editOrderDate);
        newDate.setHours(original.getHours(), original.getMinutes(), original.getSeconds());
        updates.order_date = newDate.toISOString();
      }

      if (editPaymentDate || editSecondPaymentDate || editPaymentMethod || editFirstPaymentMethod || editSecondPaymentMethod) {
        const currentPayment: any = order.payment || {};
        const newPayment: any = { ...currentPayment };

        if (currentPayment.isSplitPayment) {
          newPayment.firstPaymentMethod = editFirstPaymentMethod;
          newPayment.secondPaymentMethod = editSecondPaymentMethod;
        } else {
          newPayment.method = editPaymentMethod;
        }

        if (editPaymentDate) {
          const d = new Date(editPaymentDate).toISOString();
          if (currentPayment.isSplitPayment) {
            newPayment.firstPaymentDate = d;
          } else {
            newPayment.completedAt = d;
            newPayment.firstPaymentDate = d;
          }
        }

        if (editSecondPaymentDate && currentPayment.isSplitPayment) {
          const d = new Date(editSecondPaymentDate).toISOString();
          newPayment.secondPaymentDate = d;
          newPayment.completedAt = d;
        }

        updates.payment = newPayment;
      }

      await updateOrder(order.id, updates);
      setIsDateEditing(false);
    } catch (e) {
      console.error(e);
    }
  };

  if (!order) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="default">완료</Badge>;
      case 'processing': return <Badge variant="secondary">처리중</Badge>;
      case 'canceled': return <Badge variant="destructive">취소</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'card': return '카드';
      case 'cash': return '현금';
      case 'transfer': return '계좌이체';
      case 'mainpay': return '메인페이';
      case 'shopping_mall': return '쇼핑몰';
      case 'epay': return '이페이';
      default: return method;
    }
  };

  const getPaymentStatusBadge = (order: Order) => {
    const status = order.payment?.status;
    const completedAt = order.payment?.completedAt;

    switch (status) {
      case 'paid':
      case 'completed':
        return (
          <div className="flex flex-col gap-1">
            <Badge className="bg-blue-500 text-white">완결</Badge>
            {completedAt && (
              <span className="text-xs text-gray-500">
                {format(parseDate(completedAt), 'MM/dd HH:mm')}
              </span>
            )}
          </div>
        );
      case 'split_payment':
        return (
          <div className="flex flex-col gap-1">
            <Badge className="bg-orange-500 text-white font-semibold">분할결제</Badge>
            <span className="text-xs text-gray-500">후결제 대기</span>
          </div>
        );
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">미결</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            주문 상세 정보
            <span className="text-sm font-normal text-muted-foreground">
              ({order.order_number})
            </span>
          </DialogTitle>
          <DialogDescription>주문의 상세 정보를 확인합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Admin Correction Card */}
          {isAdmin && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base text-red-700">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    관리자 데이터 정정
                  </div>
                  <Button
                    variant={isDateEditing ? "outline" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsDateEditing(!isDateEditing)}
                  >
                    {isDateEditing ? "취소" : "수정 모드"}
                  </Button>
                </CardTitle>
              </CardHeader>
              {isDateEditing && (
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-red-600">주문 일자</Label>
                      <Input type="date" value={editOrderDate} onChange={handleOrderDateChange} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-red-600">결제 완료일</Label>
                      <Input type="datetime-local" value={editPaymentDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditPaymentDate(e.target.value)} className="bg-white" />
                      <div className="mt-2">
                        <Label className="text-xs font-semibold text-red-600 mb-1 block">결제 수단</Label>
                        <Select value={order.payment?.isSplitPayment ? editFirstPaymentMethod : editPaymentMethod} onValueChange={(val) => {
                          if (!val) return;
                          if (order.payment?.isSplitPayment) {
                            setEditFirstPaymentMethod(val);
                          } else {
                            setEditPaymentMethod(val);
                          }
                        }}>
                          <SelectTrigger className="bg-white h-8 text-xs">
                            <SelectValue placeholder="결제 수단 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {['card', 'cash', 'transfer', 'mainpay', 'kakao', 'naver', 'zero', 'shopping_mall'].map(m => (
                              <SelectItem key={m} value={m}>{getPaymentMethodText(m)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={handleSaveDateCorrection} className="bg-red-600 hover:bg-red-700 text-white">저장</Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> 주문 정보</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">주문번호</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">주문일시</span>
                  <span>{format(parseDate(order.order_date), 'yyyy-MM-dd HH:mm')}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">상태</span>
                  <div className="flex gap-2">{getStatusBadge(order.status)} {getPaymentStatusBadge(order)}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> 주문자 정보</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">이름</span>
                  <span className="font-medium">{order.orderer.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">연락처</span>
                  <span>{order.orderer.contact}</span>
                </div>
                {order.orderer.company && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">회사</span>
                    <span>{order.orderer.company}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Items */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> 주문 상품</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity}개 x ₩{item.price.toLocaleString()}</p>
                    </div>
                    <p className="font-semibold text-sm">₩{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between pt-2">
                  <span className="font-bold">총 결제 금액</span>
                  <span className="font-bold text-red-600">₩{order.summary.total.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery/Pickup */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> 수령 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{order.receipt_type === 'delivery_reservation' ? '배송' : '픽업'}</Badge>
              </div>
              {order.delivery_info ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground block mb-1">수령인</span> {order.delivery_info.recipientName} ({order.delivery_info.recipientContact})</div>
                  <div><span className="text-muted-foreground block mb-1">배송일시</span> {order.delivery_info.date} {order.delivery_info.time}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground block mb-1">주소</span> {order.delivery_info.address}</div>
                </div>
              ) : order.pickup_info ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground block mb-1">픽업자</span> {order.pickup_info.pickerName} ({order.pickup_info.pickerContact})</div>
                  <div><span className="text-muted-foreground block mb-1">픽업일시</span> {order.pickup_info.date} {order.pickup_info.time}</div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Message */}
          {order.extra_data?.message && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> 메시지</CardTitle></CardHeader>
              <CardContent>
                <div className="p-3 bg-slate-50 rounded-lg text-sm whitespace-pre-wrap">
                  {order.extra_data.message.content}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
             <DialogClose render={<Button variant="outline" />}>닫기</DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
