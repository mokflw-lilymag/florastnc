"use client";

import { useState, useEffect } from "react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  FileText, 
  Search, 
  Loader2,
  CheckCircle2,
  Printer,
  ChevronRight,
  Receipt as ReceiptIcon,
  Archive
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Customer } from "@/types/customer";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { printDocument } from "@/lib/print-document";
import { Badge } from "@/components/ui/badge";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

interface StatementDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'statement' | 'receipt' | 'estimate';
}

export function StatementDialog({ customer, isOpen, onOpenChange, type }: StatementDialogProps) {
  const supabase = createClient();
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  
  const [recipientName, setRecipientName] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  const [businessInfo, setBusinessInfo] = useState({
    name: "Floxync Florist Group",
    representative: "김미화",
    address: "서울특별시 서초구 꽃시장길 12",
    contact: "02-1234-5678",
    businessNumber: "123-45-67890"
  });
  const locale = usePreferredLocale();
  const isKo = toBaseLocale(locale) === "ko";
  const tr = (ko: string, en: string) => (isKo ? ko : en);

  useEffect(() => {
    if (isOpen && customer) {
      if (viewMode === 'edit') {
        setRecipientName(customer.name || "");
        setRecipientCompany(customer.company_name || "");
        setRecipientContact(customer.contact || "");
        setRecipientEmail(customer.email || "");
        fetchOrders();
        fetchBusinessInfo();
      }
    } else {
      setTimeout(() => setViewMode('edit'), 300);
    }
  }, [isOpen, customer, startDate, endDate]);

  const fetchBusinessInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.tenant_id) {
        // Fetch from tenants for the store name
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', profile.tenant_id)
          .single();

        const { data: settings } = await supabase
          .from('system_settings')
          .select('data')
          .eq('id', `settings_${profile.tenant_id}`)
          .single();
        
        if (settings?.data) {
          const d = settings.data;
          setBusinessInfo({
            name: tenant?.name || d.siteName || "Floxync Florist Group",
            representative: d.representative || "김미화",
            address: d.address || "서울특별시 서초구 꽃시장길 12",
            contact: d.contactPhone || "02-1234-5678",
            businessNumber: d.businessNumber || "123-45-67890"
          });
        } else if (tenant?.name) {
          setBusinessInfo(prev => ({ ...prev, name: tenant.name }));
        }
      }
    } catch (err) {
      console.error("Error fetching business info:", err);
    }
  };

  const fetchOrders = async () => {
    if (!customer || !startDate || !endDate) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', customer.tenant_id)
        .eq('orderer->>contact', customer.contact)
        .gte('order_date', startDate.toISOString())
        .lte('order_date', new Date(endDate.getTime() + 86400000).toISOString())
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      // Default select all
      setSelectedOrderIds((data || []).map(o => o.id));
    } catch (err) {
      console.error('Error fetching orders for statement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

   const handlePrint = async () => {
    if (selectedOrderIds.length === 0) return;

    // Save to document_logs
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();
      
      if (profile?.tenant_id) {
        const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
        const totalAmount = selectedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        
        await supabase.from('document_logs').insert({
          tenant_id: profile.tenant_id,
          type: type,
          recipient_info: {
            name: recipientName,
            company: recipientCompany,
            contact: recipientContact,
            email: recipientEmail
          },
          items: selectedOrders.map(o => ({ 
            id: o.id, 
            name: o.product_name, 
            price: o.total_amount,
            date: o.order_date 
          })),
          total_amount: totalAmount
        });
      }
    } catch (err) {
      console.error("Error saving document log:", err);
    }
    
    const params = new URLSearchParams({
      ids: selectedOrderIds.join(','),
      recipient: recipientName,
      company: recipientCompany,
      contact: recipientContact,
      email: recipientEmail,
      type: type
    });
    
    toast.promise(printDocument(`/dashboard/customers/print?${params.toString()}`), {
      loading: tr('서류를 인쇄용으로 변환 중...', 'Preparing document for print...'),
      success: tr('서류 출력이 준비되었습니다.', 'Document is ready to print.'),
      error: tr('인쇄 준비 중 오류가 발생했습니다.', 'Failed to prepare print.')
    });
    
    onOpenChange(false);
  };

  const selectedOrdersData = orders.filter(o => selectedOrderIds.includes(o.id));
  const subtotal = selectedOrdersData.reduce((sum, o) => sum + (o.summary?.total || 0), 0);

  if (!customer) return null;

  const typeTitle = type === 'statement' ? tr('거래명세서', 'Statement') : type === 'estimate' ? tr('견적서', 'Estimate') : tr('간이영수증', 'Receipt');
  const typeIcon = type === 'statement' ? <FileText /> : type === 'receipt' ? <ReceiptIcon /> : <FileText />;
  const themeColor = type === 'statement' ? 'bg-blue-600' : 'bg-emerald-600';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[95vh] flex flex-col p-0 border-none shadow-2xl overflow-hidden rounded-2xl">
        <DialogHeader className={`p-6 pb-4 border-b transition-colors duration-500 ${viewMode === 'preview' ? 'bg-slate-900 border-white/10' : themeColor}`}>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <span className={viewMode === 'preview' ? 'text-amber-400' : 'text-white/80'}>{typeIcon}</span>
            {viewMode === 'edit' ? `${typeTitle} 발행 항목 선택` : `${typeTitle} 최종 확인 및 발행`}
          </DialogTitle>
          <DialogDescription className={`${viewMode === 'preview' ? 'text-slate-400' : 'text-white/70'} font-medium`}>
            {viewMode === 'edit' 
              ? `${customer.name} 고객님의 거래 내역을 조회하여 명세서/영수증에 포함할 항목을 선택하세요.`
              : '인쇄 전 문서의 최종 상태를 확인하세요. 수정이 필요하면 이전 단계로 돌아갈 수 있습니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className={`flex-1 overflow-hidden flex flex-col p-8 space-y-6 overflow-y-auto transition-all duration-500 ${viewMode === 'preview' ? 'bg-slate-200/50' : 'bg-white'}`}>
          
          {viewMode === 'edit' ? (
            <>
              {/* Recipient & Provider Section (Same as Estimate) */}
              <div className="grid grid-cols-2 gap-8 border-b-2 border-slate-900 pb-8 mb-4">
                <div className="space-y-4">
                    <div className="border-b-2 border-slate-200 pb-3 space-y-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">귀하 (수신)</span>
                       <div className="flex flex-col gap-1.5 text-left">
                          <Input 
                            value={recipientCompany} 
                            onChange={e => setRecipientCompany(e.target.value)} 
                            className="text-xl font-black border-none p-0 focus-visible:ring-0 h-auto bg-transparent hover:bg-slate-50 transition-colors rounded-none placeholder:text-slate-300"
                            placeholder="수신 회사명"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">담당자:</span>
                            <Input 
                              value={recipientName} 
                              onChange={e => setRecipientName(e.target.value)} 
                              className="text-sm font-bold border-none p-0 focus-visible:ring-0 h-auto bg-transparent hover:bg-slate-50 transition-colors rounded-none placeholder:text-slate-300 w-full"
                              placeholder="담당자 이름"
                            />
                            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">님 귀하</span>
                          </div>
                       </div>
                    </div>
                </div>

                <div className="border-2 border-slate-900 p-4 rounded-sm bg-white relative text-left">
                   <div className="absolute top-2 right-2 w-10 h-10 border-2 border-red-500/20 rounded-full flex items-center justify-center text-red-500/20 font-black text-[8px] rotate-12"> (인) </div>
                   <div className="space-y-1.5 relative z-10">
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">공급자 (발행)</span>
                      <p className="text-sm font-black text-slate-900">{businessInfo.name}</p>
                      <p className="text-[10px] font-medium text-slate-500 flex gap-2">
                        <span className="text-slate-400 w-12 shrink-0">등록번호</span> <span>{businessInfo.businessNumber}</span>
                      </p>
                      <p className="text-[10px] font-medium text-slate-500 flex gap-2">
                        <span className="text-slate-400 w-12 shrink-0">대 표</span> <span>{businessInfo.representative}</span>
                      </p>
                      <p className="text-[10px] font-medium text-slate-500 flex gap-2">
                         <span className="text-slate-400 w-12 shrink-0">사업장</span>
                         <span className="leading-tight break-keep">{businessInfo.address}</span>
                      </p>
                      <p className="text-[10px] font-medium text-slate-500 flex gap-2">
                         <span className="text-slate-400 w-12 shrink-0">연락처</span> <span>{businessInfo.contact}</span>
                      </p>
                   </div>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">조회 시작일</Label>
                  <Popover>
                    <PopoverTrigger render={(props) => (
                      <Button {...props} variant="outline" className="w-full justify-start text-left font-bold border-slate-200 h-11 rounded-xl bg-white">
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                        {startDate ? format(startDate, "yyyy년 MM월 dd일") : "날짜 선택"}
                      </Button>
                    )} />
                    <PopoverContent className="w-auto p-0 border-none shadow-xl" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">조회 종료일</Label>
                  <Popover>
                    <PopoverTrigger render={(props) => (
                      <Button {...props} variant="outline" className="w-full justify-start text-left font-bold border-slate-200 h-11 rounded-xl bg-white">
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                        {endDate ? format(endDate, "yyyy년 MM월 dd일") : "날짜 선택"}
                      </Button>
                    )} />
                    <PopoverContent className="w-auto p-0 border-none shadow-xl" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Order List */}
              <div className="flex-1 flex flex-col min-h-0 border rounded-xl overflow-hidden shadow-inner bg-slate-50/30">
                <div className="p-3 bg-slate-100/50 border-b flex justify-between items-center text-[10px] font-black text-slate-500 px-6 uppercase tracking-widest">
                  <span>거래 내역 일자 및 품목</span>
                  <div className="flex items-center gap-4">
                    <span>금액</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px] font-black text-blue-600 p-0 px-2"
                      onClick={() => setSelectedOrderIds(selectedOrderIds.length === orders.length ? [] : orders.map(o => o.id))}
                    >
                      {selectedOrderIds.length === orders.length ? tr('전체 해제', 'Clear all') : tr('전체 선택', 'Select all')}
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="flex-1">
                  {loading ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Loader2 className="animate-spin h-6 w-6" />
                      <span className="text-xs font-bold">{tr("내역을 불러오는 중입니다...", "Loading records...")}</span>
                    </div>
                  ) : orders.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {orders.map(order => (
                        <div 
                          key={order.id} 
                          className={cn(
                            "p-5 flex items-center gap-6 cursor-pointer hover:bg-slate-50 transition-all",
                            selectedOrderIds.includes(order.id) ? "bg-blue-50/30" : ""
                          )}
                          onClick={() => handleToggleOrder(order.id)}
                        >
                          <Checkbox checked={selectedOrderIds.includes(order.id)} className="w-5 h-5" />
                          <div className="flex-1 text-left">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-black text-slate-900">{format(new Date(order.order_date), 'yyyy-MM-dd (EEE)', { locale: ko })}</span>
                              <span className="text-base font-black text-slate-900 italic">₩{(order.summary?.total || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed truncate max-w-[450px]">
                              {order.items?.map((i: any) => i.name).join(', ')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                       <FileText className="h-12 w-12 opacity-5" />
                       <span className="text-sm font-bold tracking-tight">{tr("지정된 기간에 거래 내역이 없습니다.", "No records in selected period.")}</span>
                       <span className="text-[10px] font-medium opacity-60">{tr("조회 기간을 다시 설정해 보세요.", "Adjust date range and try again.")}</span>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          ) : (
            /* PREVIEW MODE (Same as Estimate) */
            <div className="flex-1 flex flex-col items-center py-4">
               <div className="w-full max-w-[650px] bg-white shadow-2xl p-12 min-h-[800px] border border-slate-200 flex flex-col scale-[0.98] origin-top text-left">
                  <div className="flex justify-between items-baseline border-b-2 border-slate-900 pb-6 mb-10">
                     <h1 className="text-3xl font-black tracking-tighter">{typeTitle}</h1>
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400">발행일자</p>
                        <p className="text-sm font-black">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-10">
                     <div className="space-y-4">
                        <div className="space-y-1">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">귀하 (수신)</span>
                           <div className="border-b border-slate-200 pb-2">
                              {recipientCompany && <p className="text-lg font-black mb-1">{recipientCompany}</p>}
                              <p className="text-base font-bold">
                                 <span className="text-slate-400 text-xs mr-2 font-medium">담당자:</span>
                                 {recipientName} <span className="text-xs font-medium text-slate-500">님 귀하</span>
                              </p>
                           </div>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed pt-2 border-t border-dashed border-slate-100 italic">
                            아래와 같이 거래 내역을 {type === 'statement' ? '명세하오니' : '증명하오니'} 확인하여 주시기 바랍니다.
                        </p>
                     </div>

                     <div className="border border-slate-900 p-4 rounded-sm relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-2 right-2 w-10 h-10 border-2 border-red-500/30 rounded-full flex items-center justify-center text-red-500/30 font-black text-[10px] rotate-12"> (인) </div>
                        <div className="space-y-1.5 relative z-10 w-full text-[10px]">
                           <span className="text-slate-400 font-bold block mb-1">공급자 (발행)</span>
                           <p className="text-xs font-black">{businessInfo.name}</p>
                           <p className="text-slate-600 flex gap-2">
                              <span className="text-slate-400 w-14 shrink-0 font-medium">등록번호</span> <span>{businessInfo.businessNumber}</span>
                           </p>
                           <p className="text-slate-600 flex gap-2">
                              <span className="text-slate-400 w-14 shrink-0 font-medium">대 표</span> <span>{businessInfo.representative}</span>
                           </p>
                           <div className="text-slate-600 flex gap-2">
                              <span className="text-slate-400 w-14 shrink-0 font-medium">사업장</span> 
                              <span className="leading-tight break-keep">{businessInfo.address}</span>
                           </div>
                           <div className="text-slate-600 flex gap-2">
                              <span className="text-slate-400 w-14 shrink-0 font-medium">연락처</span> 
                              <span>{businessInfo.contact}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-slate-900 text-white text-[9px] uppercase font-black tracking-widest">
                              <th className="p-2 pl-4 w-20">일자</th>
                              <th className="p-2">품명 및 규격</th>
                              <th className="p-2 text-center w-12">수량</th>
                              <th className="p-2 text-right w-24">단가</th>
                              <th className="p-2 text-right w-32 pr-4">금액</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 border-b border-slate-200">
                           {selectedOrdersData.flatMap(order => {
                             const products = (order.items || []).map((item: any) => ({
                               date: order.order_date,
                               name: item.name,
                               quantity: item.quantity,
                               price: item.price,
                               amount: item.price * item.quantity,
                               order_number: order.order_number
                             }));

                             if (order.summary?.deliveryFee > 0) {
                               products.push({
                                 date: order.order_date,
                                 name: "배송비",
                                 quantity: 1,
                                 price: order.summary.deliveryFee,
                                 amount: order.summary.deliveryFee,
                                 order_number: order.order_number
                               });
                             }

                             if (order.summary?.discountAmount > 0) {
                               products.push({
                                 date: order.order_date,
                                 name: "할인",
                                 quantity: 1,
                                 price: -order.summary.discountAmount,
                                 amount: -order.summary.discountAmount,
                                 order_number: order.order_number
                               });
                             }

                             return products;
                           }).map((item, idx) => (
                              <tr key={idx} className="text-[11px] font-medium border-b border-slate-50">
                                 <td className="p-3 pl-4 text-slate-400 font-bold whitespace-nowrap">{format(new Date(item.date), 'MM-dd')}</td>
                                 <td className="p-3 font-bold">{item.name}</td>
                                 <td className="p-3 text-center">{item.quantity}</td>
                                 <td className="p-3 text-right">₩{item.price.toLocaleString()}</td>
                                 <td className="p-3 text-right pr-4 font-black">₩{item.amount.toLocaleString()}</td>
                              </tr>
                           ))}
                        </tbody>
                        <tfoot>
                           <tr className="bg-slate-100">
                              <td colSpan={2} className="p-4 pl-6 text-sm font-black uppercase tracking-widest text-slate-600 whitespace-nowrap">합 계 금 액</td>
                              <td colSpan={3} className="p-4 pr-6 text-right text-2xl font-black text-slate-900 italic tracking-tighter">
                                 ₩{subtotal.toLocaleString()}
                              </td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>

                   <div className="mt-auto pt-8 border-t border-dashed border-slate-200 h-10">
                      {/* Guidance text removed as requested */}
                   </div>
               </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col text-left w-full sm:w-auto">
            <p className="text-[10px] font-bold text-amber-600">※ 발행 문서는 관리 목적으로 30일간 보관됩니다.</p>
            <p className="text-[10px] text-slate-400">보관 기간이 지나면 자동 폐기되오니, 반드시 PDF로 다운로드 받으시기 바랍니다.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-bold text-slate-500">취소</Button>
            
            {viewMode === 'edit' ? (
              <Button 
                className={cn("px-10 font-black shadow-lg gap-2 h-11", themeColor, type === 'statement' ? 'shadow-blue-200' : 'shadow-emerald-200')}
                disabled={selectedOrderIds.length === 0}
                onClick={() => setViewMode('preview')}
              >
                내용 미리보기
                <ChevronRight size={16} className="ml-1 opacity-50" />
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline"
                  className="px-6 font-bold gap-2 border-slate-300 hover:bg-slate-100 h-11"
                  onClick={() => setViewMode('edit')}
                >
                  조회 기간 수정
                </Button>
                <Button 
                  className="px-10 font-black shadow-lg shadow-blue-200 gap-2 bg-slate-900 hover:bg-slate-800 h-11"
                  onClick={handlePrint}
                >
                  <Printer size={18} />
                  최종 인쇄하기
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
