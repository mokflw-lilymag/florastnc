"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/use-orders';
import { Order } from '@/types/order';
import { 
  ArrowLeft, 
  Printer, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Store, 
  Calendar,
  AlertCircle,
  MoreVertical,
  Phone,
  MapPin,
  CreditCard,
  User,
  Package,
  Receipt,
  FileEdit,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { orders, loading, updateOrder, deleteOrder } = useOrders();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!loading && orders.length > 0) {
      const found = orders.find(o => o.id === id);
      if (found) {
        setOrder(found);
      }
    }
  }, [id, orders, loading]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium">주문 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> 뒤로 가기
        </Button>
        <Card className="border-dashed py-20">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-900">주문을 찾을 수 없습니다</h2>
            <p className="text-slate-500 mt-2">요청하신 주문이 존재하지 않거나 접근 권한이 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleStatusUpdate = async (status: string) => {
    const success = await updateOrder(order.id, { status: status as any });
    if (success) {
      toast.success('주문 상태가 업데이트되었습니다.');
    }
  };

  const statusLabels: Record<string, string> = {
    pending: "주문 대기",
    processing: "처리 중",
    completed: "완료",
    canceled: "취소"
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between gap-4 mb-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.back()} 
          className="rounded-full shadow-sm bg-white hover:bg-slate-50 border-slate-200 text-slate-600 font-bold px-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> 목록으로
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full gap-2 font-bold bg-white text-slate-700 h-9" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> 프린트
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm" className="rounded-full w-9 h-9 p-0 bg-white shadow-sm border-slate-200">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl p-1.5 shadow-xl border-slate-100 min-w-[160px]">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/orders/${order.id}`)} className="rounded-lg gap-2 font-medium">
                <ExternalLink className="w-4 h-4 text-blue-500" /> 상세 보기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/dashboard/orders?edit=${order.id}`)} className="rounded-xl gap-2 font-bold py-2.5">
                <FileEdit className="w-4 h-4 text-indigo-500" /> 주문 수정
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl gap-2 font-bold py-2.5 text-rose-600" onClick={async () => {
                if (confirm('정말로 이 주문을 삭제하시겠습니까?')) {
                  await deleteOrder(order.id);
                  router.push('/dashboard/orders');
                }
              }}>
                <Trash2 className="w-4 h-4" /> 주문 삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info Column */}
        <div className="md:col-span-2 space-y-6">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
            <div className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Badge className={cn(
                    "rounded-full px-3 py-0.5 font-bold text-[10px] border-none",
                    order.status === 'completed' ? "bg-emerald-50 text-emerald-600" : 
                    order.status === 'processing' ? "bg-amber-50 text-amber-600" : 
                    "bg-rose-50 text-rose-600"
                  )}>
                    {statusLabels[order.status]}
                  </Badge>
                  <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest leading-none">#{order.order_number}</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {order.items[0]?.name || "커스텀 주문"} {order.items.length > 1 ? `외 ${order.items.length - 1}건` : ""}
                </h1>
              </div>
              <div className="md:text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">총 결제 금액</div>
                <div className="text-2xl font-black text-indigo-600">₩{(order.summary?.total || 0).toLocaleString()}</div>
              </div>
            </div>

            <CardContent className="p-6">
              <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-wrap gap-6 items-center">
                 <div className="space-y-1">
                   <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                     <Calendar className="w-3 h-3" /> 주문 일시
                   </div>
                   <div className="text-sm font-bold text-slate-700">{format(parseISO(order.order_date), 'yyyy년 MM월 dd일 HH:mm')}</div>
                 </div>
                 <div className="space-y-1">
                   <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                     {order.receipt_type === 'pickup_reservation' ? <Store className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                     {order.receipt_type === 'pickup_reservation' ? '픽업 예정' : '배송 예정'}
                   </div>
                   <div className="text-sm font-bold text-slate-700">
                     {order.receipt_type === 'pickup_reservation' 
                       ? `${order.pickup_info?.date} ${order.pickup_info?.time || ''}`
                       : `${order.delivery_info?.date} ${order.delivery_info?.time || ''}`
                     }
                   </div>
                 </div>
                 <div className="space-y-1">
                   <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                     <CreditCard className="w-3 h-3" /> 결제 수단
                   </div>
                   <div className="text-sm font-bold text-slate-700 uppercase">{order.payment.method || '미지정'} ({order.payment.status === 'paid' ? '결제완료' : '결제전'})</div>
                 </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                  주문 상품 상세
                </h3>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-300" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500">수량: {item.quantity} | 단가: ₩{item.price.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="text-sm font-black text-slate-900">₩{(item.price * item.quantity).toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 rounded-2xl bg-indigo-50/30 border border-indigo-50 flex flex-col gap-2">
                   <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>상품 소계</span>
                      <span>₩{(order.summary?.subtotal || 0).toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>배송비</span>
                      <span>+ ₩{(order.summary?.deliveryFee || 0).toLocaleString()}</span>
                   </div>
                   {(order.summary?.discountAmount || 0) > 0 && (
                     <div className="flex justify-between text-xs font-medium text-rose-500">
                        <span>할인 금액</span>
                        <span>- ₩{(order.summary?.discountAmount || 0).toLocaleString()}</span>
                     </div>
                   )}
                   <Separator className="my-1 bg-indigo-100" />
                   <div className="flex justify-between text-sm font-black text-indigo-700">
                      <span>최종 결제 금액</span>
                      <span>₩{(order.summary?.total || 0).toLocaleString()}</span>
                   </div>
                </div>
              </div>

              {(order.memo || order.message?.content) && (
                <div className="mt-8 grid md:grid-cols-2 gap-6">
                  {order.message?.content && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-rose-500 rounded-full" />
                        메시지 카드/리본 내용
                      </h3>
                      <div className="p-5 rounded-3xl bg-rose-50/30 border border-rose-100 italic text-slate-700 text-sm leading-relaxed">
                        "{order.message.content}"
                        <div className="mt-3 text-[11px] font-bold text-rose-400 not-italic uppercase tracking-wider">— {order.message.sender || '보내는 분'}</div>
                      </div>
                    </div>
                  )}
                  {order.memo && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-slate-400 rounded-full" />
                        관리자 메모
                      </h3>
                      <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 text-slate-600 text-sm">
                        {order.memo}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-5">
               <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                 <User className="w-4 h-4 text-indigo-500" /> 주문 정보
               </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
               <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">주문자</Label>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900">{order.orderer.name}</div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-indigo-600 hover:bg-indigo-50">
                          <Phone className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">{order.orderer.contact}</div>
                  </div>

                  <Separator className="bg-slate-50" />

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">수령인 / 받는 분</Label>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900">
                        {order.receipt_type === 'pickup_reservation' 
                          ? order.pickup_info?.pickerName || order.orderer.name
                          : order.delivery_info?.recipientName || '수령인 정보 없음'
                        }
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {order.receipt_type === 'pickup_reservation' 
                        ? order.pickup_info?.pickerContact 
                        : order.delivery_info?.recipientContact || '-'
                      }
                    </div>
                    {order.receipt_type === 'delivery_reservation' && order.delivery_info?.address && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl mt-2 flex gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>{order.delivery_info.address}</span>
                      </div>
                    )}
                  </div>
               </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-indigo-900 text-white">
            <CardHeader className="pb-3 p-5">
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                 <Receipt className="w-4 h-4 text-indigo-300" /> 지출 연동 정보
               </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="space-y-3">
                 <div className="bg-white/10 rounded-2xl p-4 border border-white/5">
                   <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">실지불 배송비 (지출용)</div>
                   <div className="text-xl font-black">₩{(order.actual_delivery_cost || 0).toLocaleString()}</div>
                   <div className="text-[10px] text-indigo-300 mt-1 italic">* 이 금액이 지출 관리로 자동 연동됩니다.</div>
                 </div>
                 
                 <div className="space-y-1.5 px-1">
                   <div className="flex justify-between text-xs">
                     <span className="text-indigo-200">배송 수취액 (매출)</span>
                     <span className="font-bold font-mono">₩{(order.summary?.deliveryFee || 0).toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                     <span className="text-indigo-200">배송 결제 수단</span>
                     <span className="font-bold uppercase">{order.actual_delivery_payment_method || '현금'}</span>
                   </div>
                 </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full bg-indigo-800 border-indigo-700 text-white hover:bg-indigo-700 font-bold rounded-2xl"
                onClick={() => router.push(`/dashboard/orders?edit=${order.id}`)}
              >
                상세 배송비 수정하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
