"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  History, 
  FileText, 
  Receipt as ReceiptIcon,
  Package,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Target
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Customer } from "@/types/customer";
import { createClient } from "@/utils/supabase/client";

interface CustomerDetailDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onIssueStatement?: (customer: Customer) => void;
  onIssueReceipt?: (customer: Customer) => void;
}

export function CustomerDetailDialog({ 
  customer, 
  isOpen, 
  onOpenChange,
  onIssueStatement,
  onIssueReceipt 
}: CustomerDetailDialogProps) {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      fetchCustomerOrders();
    }
  }, [isOpen, customer]);

  const fetchCustomerOrders = async () => {
    if (!customer) return;
    setLoading(true);
    try {
      // Find orders by phone number (most reliable for history including legacy)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', customer.tenant_id)
        .eq('orderer->>phone', customer.contact)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching customer orders:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-slate-50 shadow-2xl">
        <DialogHeader className="p-6 pb-0 bg-white border-b border-slate-100">
           <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                 <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                    {customer.type === 'company' ? <Building2 size={28} /> : <Users size={28} />}
                 </div>
                 <div>
                    <div className="flex items-center gap-2">
                       <DialogTitle className="text-2xl font-black text-slate-900">{customer.name}</DialogTitle>
                       <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 uppercase tracking-tighter font-black text-[10px]">
                          {customer.grade || '일반 고객'}
                       </Badge>
                    </div>
                    <DialogDescription className="text-slate-500 font-medium">
                       {customer.company_name ? `${customer.company_name} · ${customer.department || '부서 미정'}` : '개인 회원'}
                    </DialogDescription>
                 </div>
              </div>
              <div className="flex gap-2">
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onIssueStatement?.(customer)}
                    className="h-9 hover:bg-blue-50 border-slate-200 gap-2 font-bold"
                 >
                    <FileText className="h-4 w-4 text-blue-600" />
                    거래명세서
                 </Button>
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onIssueReceipt?.(customer)}
                    className="h-9 hover:bg-emerald-50 border-slate-200 gap-2 font-bold"
                 >
                    <ReceiptIcon className="h-4 w-4 text-emerald-600" />
                    간이영수증
                 </Button>
              </div>
           </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           {/* Summary Stats Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-none shadow-sm bg-blue-600 text-white overflow-hidden">
                 <div className="p-4 relative">
                    <TrendingUp className="absolute right-4 top-4 h-12 w-12 opacity-10" />
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">총 구매액</p>
                    <h3 className="text-2xl font-black mt-1">₩{(customer.total_spent || 0).toLocaleString()}</h3>
                    <p className="text-blue-200 text-[10px] mt-1 font-medium italic">{(customer.order_count || 0)} 번의 꾸준한 구매</p>
                 </div>
              </Card>
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                 <div className="p-4 border-l-4 border-l-indigo-500">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">마지막 구매일</p>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                       {customer.last_order_date ? format(new Date(customer.last_order_date), 'yyyy년 MM월 dd일') : '첫 구매 대기중'}
                    </h3>
                    <p className="text-slate-500 text-[10px] mt-1 font-medium">{customer.last_order_date ? '꽃과 함께한지 얼마 되지 않았네요 :)' : '새로운 인연을 환영합니다'}</p>
                 </div>
              </Card>
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                 <div className="p-4 border-l-4 border-l-amber-500">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">보유 포인트</p>
                    <div className="flex items-center gap-2 mt-1">
                       <h3 className="text-xl font-bold text-slate-900">{(customer.points || 0).toLocaleString()} P</h3>
                       <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none px-1.5 h-5 text-[10px]">REWARD</Badge>
                    </div>
                    <p className="text-slate-500 text-[10px] mt-1 font-medium">다음 구매에 사용 가능한 혜택</p>
                 </div>
              </Card>
           </div>

           <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-1">
                 <TabsTrigger value="history" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">주문 이력 ({orders.length})</TabsTrigger>
                 <TabsTrigger value="info" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">상세 정보</TabsTrigger>
              </TabsList>
              
              <TabsContent value="history" className="mt-4 animate-in fade-in duration-300">
                 <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-50">
                       <CardTitle className="text-base font-black flex items-center gap-2 text-slate-800">
                          <History className="h-4 w-4 text-blue-500" /> 주문 히스토리
                       </CardTitle>
                       <span className="text-xs text-slate-400 font-medium">최신 주문순으로 정렬됨</span>
                    </CardHeader>
                    <CardContent className="p-0">
                       <ScrollArea className="h-[400px]">
                          {loading ? (
                             <div className="p-4 space-y-4">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                             </div>
                          ) : orders.length > 0 ? (
                             <div className="divide-y divide-slate-50">
                                {orders.map((order) => (
                                   <div key={order.id} className="p-5 hover:bg-slate-50/80 transition-all group">
                                      <div className="flex justify-between items-start mb-2">
                                         <div>
                                            <div className="flex items-center gap-2 mb-1">
                                               <span className="text-sm font-black text-slate-900">{format(new Date(order.order_date), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}</span>
                                               <Badge className={
                                                  order.status === 'completed' 
                                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                  : 'bg-blue-50 text-blue-600 border-blue-100'
                                               }>
                                                  {order.status === 'completed' ? '배송완료' : '진행중'}
                                               </Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-1 items-center">
                                               {order.items?.map((item: any, idx: number) => (
                                                  <Badge key={idx} variant="outline" className="text-[11px] font-bold border-slate-200 bg-white group-hover:bg-slate-50">
                                                     {item.name} ({item.quantity})
                                                  </Badge>
                                               ))}
                                            </div>
                                         </div>
                                         <div className="text-right">
                                            <p className="text-lg font-black text-slate-900 italic">₩{(order.summary?.total || 0).toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-400 font-medium font-mono">#{order.order_number}</p>
                                         </div>
                                      </div>
                                      <div className="flex items-center justify-between mt-3">
                                         <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
                                            <div className="flex items-center gap-1">
                                               <Package className="h-3 w-3" />
                                               {order.receipt_type === 'delivery_reservation' ? '배송예약' : '매장픽업'}
                                            </div>
                                            {order.memo && (
                                               <div className="flex items-center gap-1 max-w-[300px] truncate italic text-slate-400">
                                                  " {order.memo} "
                                               </div>
                                            )}
                                         </div>
                                         <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 opacity-40 group-hover:opacity-100 transition-all text-blue-600 font-black">
                                            주문상세 <ChevronRight className="h-3 w-3" />
                                         </Button>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          ) : (
                             <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <History className="h-12 w-12 opacity-10" />
                                <p className="font-bold text-lg">아직 주문 이력이 없네요!</p>
                                <p className="text-xs">첫 주문을 기록해 보세요.</p>
                             </div>
                          )}
                       </ScrollArea>
                    </CardContent>
                 </Card>
              </TabsContent>

              <TabsContent value="info" className="mt-4 animate-in fade-in duration-300">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-slate-200 shadow-sm bg-white">
                       <CardHeader className="pb-2 border-b border-slate-50">
                          <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                             <Phone className="h-4 w-4 text-blue-500" /> 연락처 및 기본정보
                          </CardTitle>
                       </CardHeader>
                       <CardContent className="space-y-4 pt-4">
                          <div className="space-y-1">
                             <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">휴대전화</Label>
                             <p className="text-slate-900 font-bold">{customer.contact || '등록된 번호 없음'}</p>
                          </div>
                          <div className="space-y-1">
                             <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">이메일</Label>
                             <p className="text-slate-900 font-bold">{customer.email || '등록된 이메일 없음'}</p>
                          </div>
                          <div className="space-y-1">
                             <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">주소</Label>
                             <div className="flex items-start gap-1 p-3 bg-slate-50 rounded-lg text-slate-700 text-sm font-medium border border-slate-100">
                                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                {customer.address || '기본 주소지가 없습니다.'}
                             </div>
                          </div>
                       </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm bg-white">
                       <CardHeader className="pb-2 border-b border-slate-50">
                          <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                             <FileText className="h-4 w-4 text-amber-500" /> 주문 시 메모 & 특징
                          </CardTitle>
                       </CardHeader>
                       <CardContent className="pt-4">
                          <div className="p-4 bg-amber-50 text-amber-900 rounded-xl min-h-[120px] text-sm leading-relaxed border border-amber-100 font-medium">
                             {customer.memo || '고객에 대한 특이사항이 없습니다.'}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                             <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold"># {customer.type === 'company' ? '기업회원' : '개인회원'}</Badge>
                             <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold"># {customer.grade || '골드등급'}</Badge>
                          </div>
                       </CardContent>
                    </Card>
                 </div>
              </TabsContent>
           </Tabs>
        </div>

        <DialogFooter className="p-6 pt-2 bg-white border-t border-slate-100">
           <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-8 font-bold border border-slate-200 text-slate-600">닫기</Button>
           <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 font-black shadow-lg shadow-blue-200 gap-2">
              정보 수정하기
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
