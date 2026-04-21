"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Printer,
  ChevronRight
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Customer } from "@/types/customer";
import { createClient } from "@/utils/supabase/client";
import { printDocument } from "@/lib/print-document";
import { toast } from "sonner";

interface EstimateDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EstimateItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export function EstimateDialog({ customer, isOpen, onOpenChange }: EstimateDialogProps) {
  const supabase = createClient();
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [recipientName, setRecipientName] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [useVat, setUseVat] = useState(false);
  
  const [items, setItems] = useState<EstimateItem[]>([
    { id: Math.random().toString(36).substr(2, 9), name: "", quantity: 1, price: 0 }
  ]);
  const [businessInfo, setBusinessInfo] = useState({
    name: "Floxync Florist Group",
    representative: "김미화",
    address: "서울특별시 서초구 꽃시장길 12",
    contact: "02-1234-5678",
    businessNumber: "123-45-67890"
  });

  useEffect(() => {
    if (isOpen && customer) {
      if (viewMode === 'edit') {
        setRecipientName(customer.name || "");
        setRecipientCompany(customer.company_name || "");
        setRecipientContact(customer.contact || "");
        setRecipientEmail(customer.email || "");
        fetchBusinessInfo();
      }
    } else {
      setTimeout(() => setViewMode('edit'), 300);
    }
  }, [isOpen, customer]);

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

  const addItem = () => {
    setItems([
      ...items,
      { id: Math.random().toString(36).substr(2, 9), name: "", quantity: 1, price: 0 }
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof EstimateItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const vat = useVat ? Math.floor(subtotal * 0.1) : 0;
  const total = subtotal + vat;

   const handlePrint = async () => {
    const validItems = items.filter(item => item.name.trim() !== "");
    if (validItems.length === 0) return;
    
    // Save to document_logs
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();
      
      if (profile?.tenant_id) {
        await supabase.from('document_logs').insert({
          tenant_id: profile.tenant_id,
          type: 'estimate',
          recipient_info: {
            name: recipientName,
            company: recipientCompany,
            contact: recipientContact,
            email: recipientEmail
          },
          items: validItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
          total_amount: total,
          use_vat: useVat
        });
      }
    } catch (err) {
      console.error("Error saving document log:", err);
    }

    // Pass items as base64 encoded JSON
    const itemsJson = JSON.stringify(validItems.map(i => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price
    })));
    
    const params = new URLSearchParams({
      recipient: recipientName,
      company: recipientCompany,
      contact: recipientContact,
      email: recipientEmail,
      type: 'estimate',
      use_vat: useVat.toString(),
      manual_items: btoa(encodeURIComponent(itemsJson))
    });
    
    toast.promise(printDocument(`/dashboard/customers/print?${params.toString()}`), {
      loading: '견적서를 인쇄용으로 변환 중...',
      success: '인쇄 준비가 완료되었습니다.',
      error: '인쇄 준비 중 오류가 발생했습니다.'
    });
    
    onOpenChange(false);
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[95vh] flex flex-col p-0 border-none shadow-2xl overflow-hidden rounded-2xl">
        <DialogHeader className={`p-6 pb-4 border-b transition-colors duration-500 ${viewMode === 'preview' ? 'bg-slate-900 border-white/10' : 'bg-gradient-to-r from-amber-600 to-amber-500'}`}>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <FileText className={viewMode === 'preview' ? 'text-amber-400' : 'text-amber-100'} />
            {viewMode === 'edit' ? '신규 견적서 작성' : '견적서 최종 확인 및 발행'}
          </DialogTitle>
          <DialogDescription className={`${viewMode === 'preview' ? 'text-slate-400' : 'text-amber-50/70'} font-medium`}>
            {viewMode === 'edit' 
              ? '주문 전 전송할 견적 내용을 자유롭게 입력하세요. 저장된 상호와 사업자 정보가 자동으로 연동됩니다.'
              : '인쇄 전 문서의 최종 상태를 확인하세요. 수정이 필요하면 이전 단계로 돌아갈 수 있습니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className={`flex-1 overflow-hidden flex flex-col p-8 space-y-6 overflow-y-auto transition-all duration-500 ${viewMode === 'preview' ? 'bg-slate-200/50' : 'bg-white'}`}>
          
          {viewMode === 'edit' ? (
            <>
              {/* Document Preview Header (EDIT MODE) */}
              <div className="grid grid-cols-2 gap-8 border-b-2 border-slate-900 pb-8 mb-4">
                {/* Left: Recipient Details */}
                <div className="space-y-4">
                    <div className="border-b-2 border-slate-200 pb-3 space-y-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">귀하 (수신)</span>
                       <div className="flex flex-col gap-1.5">
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
                            <span className="text-xs font-bold text-slate-500">님 귀하</span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500">
                            <div className="flex gap-2 items-center">
                               <span className="text-slate-400">연락처</span>
                               <Input 
                                 value={recipientContact} 
                                 onChange={e => setRecipientContact(e.target.value)} 
                                 className="border-none p-0 h-auto bg-transparent focus-visible:ring-0 w-32"
                                 placeholder="연락처"
                               />
                            </div>
                            <div className="flex gap-2 items-center">
                               <span className="text-slate-400">이메일</span>
                               <Input 
                                 value={recipientEmail} 
                                 onChange={e => setRecipientEmail(e.target.value)} 
                                 className="border-none p-0 h-auto bg-transparent focus-visible:ring-0 w-40"
                                 placeholder="이메일 주소"
                               />
                            </div>
                          </div>
                       </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
                       <p className="text-[11px] text-slate-500 leading-relaxed font-bold italic">
                          "아래와 같이 품목 및 규격에 따른 견적을 제출하오니 검토하여 주시기 바랍니다."
                       </p>
                    </div>
                </div>

                {/* Right: Provider (Our Info) */}
                <div className="border-2 border-slate-900 p-4 rounded-sm bg-white relative">
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

              <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm transition-all">
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 bg-white p-1 rounded-full border border-slate-200">
                       <button 
                         onClick={() => setUseVat(false)}
                         className={`px-4 py-1.5 rounded-full text-[11px] font-black transition-all ${!useVat ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         부가세 면세 (기본)
                       </button>
                       <button 
                         onClick={() => setUseVat(true)}
                         className={`px-4 py-1.5 rounded-full text-[11px] font-black transition-all ${useVat ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         과세 (부가세 10% 별도)
                       </button>
                    </div>
                    
                    <div className="flex gap-8 items-end">
                       {useVat && (
                         <>
                           <div className="text-right">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">공급가액</span>
                              <span className="text-sm font-bold text-slate-600">₩{subtotal.toLocaleString()}</span>
                           </div>
                           <div className="text-right">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">부가세(10%)</span>
                              <span className="text-sm font-bold text-slate-600">₩{vat.toLocaleString()}</span>
                           </div>
                         </>
                       )}
                       <div className="text-right">
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-0.5">최종 견적합계</span>
                          <span className="text-3xl font-black text-slate-900 tracking-tighter">₩{total.toLocaleString()}</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 border rounded-xl overflow-hidden shadow-inner bg-slate-50/30">
                <div className="p-3 bg-slate-100/50 border-b grid grid-cols-[1fr_80px_140px_140px_40px] gap-2 items-center text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">
                  <span>품명 및 규격</span>
                  <span className="text-center">수량</span>
                  <span className="text-right">단가</span>
                  <span className="text-right">합계</span>
                  <span></span>
                </div>
                
                <ScrollArea className="flex-1 px-2 py-1">
                   <div className="space-y-2 p-2">
                      {items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-[1fr_80px_140px_140px_40px] gap-2 items-center group bg-white p-1 rounded-lg border border-slate-100 shadow-sm hover:border-amber-200 transition-all">
                          <Input 
                            id={`item-name-${index}`}
                            value={item.name}
                            onChange={e => updateItem(item.id, 'name', e.target.value)}
                            placeholder="예: 계절꽃다발 (L사이즈)"
                            className="h-9 text-sm font-medium border-transparent focus:border-slate-200 focus:bg-white bg-slate-50/50"
                            lang="ko"
                            autoFocus={index === items.length - 1 && index > 0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                document.getElementById(`item-qty-${index}`)?.focus();
                              }
                            }}
                          />
                          <Input 
                            id={`item-qty-${index}`}
                            type="number"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="h-9 text-center text-sm font-black border-transparent focus:border-slate-200 bg-slate-50/50"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                document.getElementById(`item-price-${index}`)?.focus();
                              }
                            }}
                          />
                          <Input 
                            id={`item-price-${index}`}
                            type="number"
                            value={item.price}
                            onChange={e => updateItem(item.id, 'price', parseInt(e.target.value) || 0)}
                            className="h-9 text-right text-sm font-black text-blue-600 border-transparent focus:border-slate-200 bg-slate-50/50"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (index === items.length - 1) {
                                  addItem();
                                } else {
                                  document.getElementById(`item-name-${index + 1}`)?.focus();
                                }
                              }
                            }}
                          />
                          <div className="text-right text-sm font-black text-slate-900 pr-2 italic">
                            ₩{(item.quantity * item.price).toLocaleString()}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-300 hover:text-red-500 transition-colors"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      ))}
                   </div>
                </ScrollArea>

                <div className="p-4 bg-white border-t">
                   <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={addItem}
                     className="w-full border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-700 font-bold transition-all h-10 gap-2"
                   >
                     <Plus size={16} />
                     항목 추가하기 (Enter)
                   </Button>
                </div>
              </div>
            </>
          ) : (
            /* PREVIEW MODE: Document-style Rendering */
            <div className="flex-1 flex flex-col items-center py-4">
               <div className="w-full max-w-[650px] bg-white shadow-2xl p-12 min-h-[800px] border border-slate-200 flex flex-col scale-[0.98] origin-top">
                  {/* Real Document Header */}
                  <div className="flex justify-between items-baseline border-b-2 border-slate-900 pb-6 mb-10">
                     <h1 className="text-3xl font-black tracking-tighter">견 적 서</h1>
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400">발행일자</p>
                        <p className="text-sm font-black">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                     </div>
                  </div>

                  {/* Recipient & Provider Section */}
                  <div className="grid grid-cols-2 gap-8 mb-10">
                     <div className="space-y-4 text-left">
                        <div className="space-y-1">
                           <span className="text-[10px] font-bold text-slate-400">귀하 (수신)</span>
                           <div className="border-b border-slate-200 pb-2">
                              {recipientCompany && <p className="text-lg font-black mb-1">{recipientCompany}</p>}
                              <p className="text-base font-bold">
                                 <span className="text-slate-400 text-xs mr-2">담당자:</span>
                                 {recipientName} <span className="text-xs font-medium text-slate-500">님 귀하</span>
                              </p>
                           </div>
                           {(recipientContact || recipientEmail) && (
                              <div className="text-[9px] text-slate-400 space-y-0.5 mt-2">
                                 {recipientContact && <p>연락처: {recipientContact}</p>}
                                 {recipientEmail && <p>이메일: {recipientEmail}</p>}
                              </div>
                           )}
                        </div>
                        <p className="text-[10px] text-slate-500 italic font-bold leading-relaxed pt-2 border-t border-dashed border-slate-100">
                            "아래와 같이 품목 및 규격에 따른 견적을 제출하오니 검토하여 주시기 바랍니다."
                        </p>
                     </div>

                     <div className="border border-slate-900 p-4 rounded-sm relative overflow-hidden flex flex-col justify-between text-left">
                        <div className="absolute top-2 right-2 w-10 h-10 border-2 border-red-500/30 rounded-full flex items-center justify-center text-red-500/30 font-black text-[10px] rotate-12 -z-0"> (인) </div>
                        <div className="space-y-1.5 relative z-10 w-full text-[10px]">
                           <span className="text-slate-400 font-bold block mb-1">공급자 (발행)</span>
                           <p className="text-xs font-black">{businessInfo.name}</p>
                           <p className="text-slate-600 flex gap-2">
                              <span className="text-slate-400 w-14 shrink-0">등록번호</span> <span>{businessInfo.businessNumber}</span>
                           </p>
                           <p className="text-slate-600 flex gap-2">
                              <span className="text-slate-400 w-14 shrink-0">대 표</span> <span>{businessInfo.representative}</span>
                           </p>
                           <div className="text-slate-600 flex gap-2">
                              <span className="text-slate-400 w-14 shrink-0 font-medium">사업장</span> 
                              <span className="leading-tight break-keep">{businessInfo.address}</span>
                           </div>
                           <div className="text-slate-600 flex gap-2">
                              <span className="text-slate-400 w-14 shrink-0 font-medium">연락처</span> 
                              <span className="font-medium">{businessInfo.contact}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Items Table */}
                  <div className="flex-1">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-slate-900 text-white text-[9px] uppercase font-black tracking-widest">
                              <th className="p-2 pl-4">품명 및 규격</th>
                              <th className="p-2 text-center w-12">수량</th>
                              <th className="p-2 text-right w-24">단가</th>
                              <th className="p-2 text-right w-24 pr-4">금액</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 border-b border-slate-200">
                           {items.filter(i => i.name.trim() !== "").map((item, idx) => (
                              <tr key={idx} className="text-[11px] font-medium">
                                 <td className="p-3 pl-4 font-bold">{item.name}</td>
                                 <td className="p-3 text-center">{item.quantity}</td>
                                 <td className="p-3 text-right">₩{item.price.toLocaleString()}</td>
                                 <td className="p-3 text-right pr-4 font-black">₩{(item.quantity * item.price).toLocaleString()}</td>
                              </tr>
                           ))}
                        </tbody>
                        <tfoot className="bg-slate-50/80">
                           {useVat && (
                              <>
                                 <tr className="text-[9px] font-bold text-slate-500">
                                    <td colSpan={3} className="p-2 text-right">공급가액</td>
                                    <td className="p-2 text-right pr-4">₩{subtotal.toLocaleString()}</td>
                                 </tr>
                                 <tr className="text-[9px] font-bold text-slate-500">
                                    <td colSpan={3} className="p-2 pt-0 text-right">부가세(10%)</td>
                                    <td className="p-2 pt-0 text-right pr-4 border-b border-slate-200 pb-3">₩{vat.toLocaleString()}</td>
                                 </tr>
                              </>
                           )}
                           <tr className="bg-slate-100">
                              <td colSpan={2} className="p-4 pl-6 text-sm font-black uppercase tracking-widest text-slate-600">합 계 금 액</td>
                              <td colSpan={2} className="p-4 pr-6 text-right text-2xl font-black text-slate-900 italic tracking-tighter relative">
                                 ₩{total.toLocaleString()}
                                 {!useVat && <span className="absolute -top-3 right-6 text-[8px] font-bold text-slate-300">(부가세 면세)</span>}
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
                className="px-10 font-black shadow-lg shadow-amber-200 gap-2 bg-amber-600 hover:bg-amber-700 h-11"
                disabled={items.filter(i => i.name.trim() !== "").length === 0}
                onClick={() => setViewMode('preview')}
              >
                미리보기 확인
                <ChevronRight size={16} className="ml-1 opacity-50" />
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline"
                  className="px-6 font-bold gap-2 border-slate-300 hover:bg-slate-100 h-11"
                  onClick={() => setViewMode('edit')}
                >
                  수정하러 가기
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
