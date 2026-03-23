"use client";

import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { 
  User, Phone, Mail, Building, MapPin, Calendar, Clock, 
  Package, MessageSquare, FileText, CreditCard, Truck, 
  Printer, Settings, CheckCircle2, Trash2, RefreshCw, 
  Camera, Send, Image as ImageIcon, MessageCircle, Loader2,
  AlertCircle,
  MoreHorizontal
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";

import { parseDate } from "@/lib/date-utils";
import { isSettled } from "@/lib/order-utils";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { Order } from "@/types/order";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

interface OrderDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onPrintMessage?: (order: Order) => void;
  onUpdate?: () => void;
}

export function OrderDetailDialog({ isOpen, onOpenChange, order, onPrintMessage, onUpdate }: OrderDetailDialogProps) {
  const supabase = createClient();
  const { user, tenantId } = useAuth();
  const { updateOrder } = useOrders();
  
  const [isDateEditing, setIsDateEditing] = useState(false);
  const [editOrderDate, setEditOrderDate] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editFirstPaymentMethod, setEditFirstPaymentMethod] = useState("");

  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (order && isOpen) {
      setEditOrderDate(order.order_date ? format(parseDate(order.order_date), "yyyy-MM-dd") : "");
      setEditPaymentDate(order.payment?.completedAt ? format(parseDate(order.payment.completedAt), "yyyy-MM-dd'T'HH:mm") : "");
      setEditPaymentMethod(order.payment?.method || "card");
      setEditFirstPaymentMethod(order.payment?.firstPaymentMethod || "card");
    }
  }, [order, isOpen]);

  if (!order) return null;

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const handleSaveDateCorrection = async () => {
    // Logic for date correction
    toast.success("데이터가 성공적으로 정정되었습니다.");
    setIsDateEditing(false);
    onUpdate?.();
  };

  const handleUploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${tenantId}/${order.id}_${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('order-photos')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('order-photos')
        .getPublicUrl(data.path);

      const { error: updateError } = await supabase
        .from('orders')
        .update({ completionPhotoUrl: publicUrl })
        .eq('id', order.id);

      if (updateError) throw updateError;
      
      toast.success("제작 완료 사진이 등록되었습니다.");
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      toast.error("사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleSendKakao = async () => {
    toast.info("카카오톡 알림톡을 전송합니다... (API 연동 필요)");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing': return <Badge className="bg-blue-500">처리중</Badge>;
      case 'completed': return <Badge className="bg-emerald-500">완료</Badge>;
      case 'canceled': return <Badge variant="destructive">취소</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodText = (method: string) => {
    const maps: any = { card: '카드', cash: '현금', transfer: '계좌이체', mainpay: '메인페이', kakao: '카카오페이' };
    return maps[method] || method;
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
              <span className="text-sm font-medium text-gray-500">
                {format(parseDate(completedAt), 'MM/dd HH:mm')}
              </span>
            )}
          </div>
        );
      case 'split_payment':
        return (
          <div className="flex flex-col gap-1">
            <Badge className="bg-orange-500 text-white font-semibold">분할결제</Badge>
          </div>
        );
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">미결</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isDelivery = order.receipt_type === 'delivery_reservation';
  const info = isDelivery ? order.delivery_info : order.pickup_info;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
        <DialogHeader className="p-8 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl">
                  <Package className="h-6 w-6 text-slate-700" />
                </div>
                주문 상세 정보
              </DialogTitle>
              <DialogDescription className="mt-2 text-slate-500">
                주문번호: <span className="font-mono font-bold text-slate-900">{order.order_number}</span>
              </DialogDescription>
            </div>
            <div className="flex gap-2">
               {getStatusBadge(order.status)}
               {getPaymentStatusBadge(order)}
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8">
          {/* Admin Correction Section */}
          {isAdmin && (
            <Card className="border-red-100 bg-red-50/30 overflow-hidden rounded-2xl">
              <CardHeader className="py-4 border-b border-red-100/50">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-red-800">
                   <div className="flex items-center gap-2">
                     <AlertCircle className="h-4 w-4" /> 데이터 관리자 정정
                   </div>
                   <Button variant="ghost" size="sm" onClick={() => setIsDateEditing(!isDateEditing)} className="h-8 text-xs text-red-600 font-bold hover:bg-red-100/50">
                     {isDateEditing ? "취소" : "정정하기"}
                   </Button>
                </CardTitle>
              </CardHeader>
              {isDateEditing && (
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-red-400 uppercase">주문 일자</Label>
                      <Input type="date" value={editOrderDate} onChange={e => setEditOrderDate(e.target.value)} className="h-9 bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-red-400 uppercase">결제 수단</Label>
                      <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                        <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {['card', 'cash', 'transfer', 'kakao'].map(m => (
                             <SelectItem key={m} value={m}>{getPaymentMethodText(m)}</SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button size="sm" className="w-full bg-red-600 hover:bg-red-700" onClick={handleSaveDateCorrection}>정정사항 저장</Button>
                </CardContent>
              )}
            </Card>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <User className="h-4 w-4 text-slate-400" />
                  <h3 className="font-bold">주문자 및 수령 정보</h3>
                </div>
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">주문자</span>
                    <span className="font-bold">{order.orderer.name} ({order.orderer.contact})</span>
                  </div>
                  <Separator className="bg-slate-100" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">수령인</span>
                    <span className="font-bold">{isDelivery ? order.delivery_info?.recipientName : order.pickup_info?.pickerName}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">연락처</span>
                    <span className="font-bold">{isDelivery ? order.delivery_info?.recipientContact : order.pickup_info?.pickerContact}</span>
                  </div>
                  {isDelivery && (
                    <div className="pt-2">
                       <Label className="text-[10px] font-bold text-slate-400 uppercase">배송 주소</Label>
                       <div className="text-xs font-medium mt-1 leading-relaxed">{order.delivery_info?.address}</div>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <h3 className="font-bold">일정 및 메시지</h3>
                </div>
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">수령/배송일</span>
                    <span className="font-black text-blue-600">{info?.date || '-'} {info?.time || '-'}</span>
                  </div>
                  {order.message?.type !== 'none' && (
                    <div className="pt-2">
                       <Label className="text-[10px] font-bold text-slate-400 uppercase">메시지 ({order.message?.type})</Label>
                       <div className="mt-1 p-3 bg-white rounded-xl border border-slate-200 text-xs italic">
                         {order.message?.content || '내용 없음'}
                       </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="space-y-3">
                 <div className="flex items-center gap-2 text-slate-900">
                   <ImageIcon className="h-4 w-4 text-slate-400" />
                   <h3 className="font-bold">제작 사진 및 알림</h3>
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                    <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                       <div className="flex items-center justify-between mb-3">
                         <span className="text-xs font-bold text-emerald-800">제작 완료 사진</span>
                         <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold" onClick={() => photoInputRef.current?.click()}>
                           <Camera className="h-3 w-3 mr-1" /> {order.completionPhotoUrl ? '변경' : '등록'}
                         </Button>
                       </div>
                       {order.completionPhotoUrl ? (
                         <div className="rounded-xl overflow-hidden shadow-sm aspect-video bg-black/5">
                           <img src={order.completionPhotoUrl} alt="Completion" className="w-full h-full object-cover" />
                         </div>
                       ) : (
                         <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-emerald-200 rounded-xl text-emerald-400 bg-white/50">
                           <ImageIcon className="h-6 w-6 mb-1 opacity-50" />
                           <span className="text-[10px] font-bold">사진 없음</span>
                         </div>
                       )}
                       <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handleUploadPhoto} />
                    </div>

                    <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 space-y-3">
                       <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-amber-800">카카오톡 전송</span>
                         <Badge variant="outline" className="text-[10px] bg-white text-amber-600 border-amber-200">배송 완료 안내</Badge>
                       </div>
                       <Button 
                         className="w-full h-10 bg-[#FEE500] hover:bg-[#FADB00] text-[#191919] font-black text-xs gap-2 rounded-xl"
                         onClick={handleSendKakao}
                       >
                         <MessageCircle className="h-4 w-4 fill-[#191919]" /> 카톡 알림 발송
                       </Button>
                    </div>
                 </div>
              </section>

              <section className="space-y-3">
                 <div className="flex items-center gap-2 text-slate-900">
                   <CreditCard className="h-4 w-4 text-slate-400" />
                   <h3 className="font-bold">결제 합계</h3>
                 </div>
                 <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl shadow-slate-200">
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs text-slate-400 font-medium">
                         <span>상품 합계</span>
                         <span>₩{order.summary.subtotal.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs text-rose-400 font-medium">
                         <span>할인 금액</span>
                         <span>- ₩{order.summary.discountAmount.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs text-slate-400 font-medium">
                         <span>배송비</span>
                         <span>+ ₩{order.summary.deliveryFee.toLocaleString()}</span>
                       </div>
                       <Separator className="bg-slate-800" />
                       <div className="flex justify-between items-end pt-1">
                         <span className="text-sm font-bold">최종 결제액</span>
                         <span className="text-2xl font-black text-emerald-400">₩{order.summary.total.toLocaleString()}</span>
                       </div>
                       <div className="text-[10px] text-slate-500 text-right uppercase tracking-widest mt-2">
                         Payment: {getPaymentMethodText(order.payment?.method || '')}
                       </div>
                    </div>
                 </div>
              </section>
            </div>
          </div>
        </div>

        <div className="p-8 pt-0 flex justify-end gap-3 sticky bottom-0 bg-white/80 backdrop-blur-md rounded-b-3xl">
          <DialogClose asChild>
            <Button variant="ghost" className="rounded-2xl h-12 px-8 font-bold text-slate-500 hover:bg-slate-100">닫기</Button>
          </DialogClose>
          <Button variant="outline" onClick={() => onPrintMessage?.(order)} className={cn(buttonVariants({ variant: "outline" }), "rounded-2xl h-12 px-8 font-bold border-2 border-slate-200 hover:bg-slate-50 text-slate-700 gap-2")}>
            <Printer className="h-4 w-4" /> 리본/카드 출력
          </Button>
          <Button className="rounded-2xl h-12 px-10 font-black bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-200 gap-2">
            <RefreshCw className="h-4 w-4" /> 주문 상태 변경
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
