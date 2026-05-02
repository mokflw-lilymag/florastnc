"use client";
import { getMessages } from "@/i18n/getMessages";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/utils/supabase/client";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

function PrintContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [recipient, setRecipient] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [type, setType] = useState<string | null>("");
  const [loading, setLoading] = useState(true);
  const [useVat, setUseVat] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
    name: "Floxync Florist Group",
    representative: "김미화",
    address: "서울특별시 서초구 꽃시장길 12",
    contact: "02-1234-5678",
    businessNumber: "123-45-67890"
  });
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const isKo = toBaseLocale(locale) === "ko";  useEffect(() => {
    const ids = searchParams.get("ids")?.split(",") || [];
    const manualItemsBase64 = searchParams.get("manual_items");
    const recipientParam = searchParams.get("recipient") || "";
    const companyParam = searchParams.get("company") || "";
    const contactParam = searchParams.get("contact") || "";
    const emailParam = searchParams.get("email") || "";
    const typeParam = searchParams.get("type");
    const vatParam = searchParams.get("use_vat") === "true";
    
    setRecipient(recipientParam);
    setRecipientCompany(companyParam);
    setRecipientContact(contactParam);
    setRecipientEmail(emailParam);
    setType(typeParam);
    setUseVat(vatParam);

    const init = async () => {
      try {
        if (manualItemsBase64) {
             const decoded = JSON.parse(decodeURIComponent(atob(manualItemsBase64)));
             setItems(decoded.map((item: any) => ({
                 order_date: new Date().toISOString(),
                 items: [{ name: item.name, quantity: item.quantity, price: item.price }],
                 summary: { total: item.quantity * item.price }
             })));
        } else if (ids.length > 0) {
          await fetchOrders(ids);
        }
        
        await fetchBusinessInfo();

        // Auto-trigger print IF NOT in an iframe (direct access)
        if (window.self === window.top) {
          setTimeout(() => {
            window.print();
          }, 1000);
        }
      } catch (err) {
        console.error("Print init error:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [searchParams]);

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

  const fetchOrders = async (ids: string[]) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("id", ids)
        .order("order_date", { ascending: true });

      if (error) throw error;
      setItems(data || []);
      
      // If we have orders, try simple logic to get customer info for recipient header if not in params
      if (data && data[0] && !recipient) {
         const customerId = data[0].customer_id;
         if (customerId) {
            const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).single();
            if (customer) {
               setRecipient(customer.name);
               setRecipientCompany(customer.company_name || "");
               setRecipientContact(customer.contact || "");
               setRecipientEmail(customer.email || "");
            }
         }
      }
    } catch (err) {
      console.error("Error fetching print data:", err);
    }
  };

  if (loading) return <div className="p-10 text-center">{tf.f00513}</div>;

  const flattenedItems = items.flatMap(order => {
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
        name: tf.f00259,
        quantity: 1,
        price: order.summary.deliveryFee,
        amount: order.summary.deliveryFee,
        order_number: order.order_number
      });
    }

    if (order.summary?.discountAmount > 0) {
      products.push({
        date: order.order_date,
        name: tf.f00759,
        quantity: 1,
        price: -order.summary.discountAmount,
        amount: -order.summary.discountAmount,
        order_number: order.order_number
      });
    }

    return products;
  });

  const subtotal = flattenedItems.reduce((sum, item) => sum + item.amount, 0);
  const vat = useVat ? Math.floor(subtotal * 0.1) : 0;
  const totalAmount = subtotal + vat;

  return (
    <div className="p-8 max-w-[800px] mx-auto bg-white text-slate-900 font-sans">
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tighter mb-1">
            {type === 'statement' ? tf.f00031 : type === 'estimate' ? tf.f00040 : tf.f00023}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">발행일자</p>
          <p className="text-sm font-black">{isKo ? format(new Date(), 'yyyy년 MM월 dd일') : format(new Date(), 'yyyy-MM-dd')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-10">
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400 block">귀하 (수신)</span>
            <div className="text-xl font-black border-b-2 border-slate-200 pb-2 mb-2">
              {recipientCompany && <p className="mb-0.5">{recipientCompany}</p>}
              <div className="flex items-baseline gap-2">
                 <span className="text-sm font-bold text-slate-500">담당자:</span>
                 {recipient} <span className="text-xs font-medium text-slate-500">님 귀하</span>
              </div>
            </div>
            {(recipientContact || recipientEmail) && (
              <div className="flex flex-col gap-0.5 text-[10px] font-medium text-slate-400">
                {recipientContact && <p>연락처: {recipientContact}</p>}
                {recipientEmail && <p>이메일: {recipientEmail}</p>}
              </div>
            )}
          </div>
          <p className="text-xs leading-relaxed text-slate-500 italic font-bold">
            {type === 'estimate' 
              ? tf.f00429
              : tf.f00428
            }<br />
            {tf.f00766}
          </p>
        </div>
        
        <div className="border-2 border-slate-900 p-4 rounded-sm relative overflow-hidden flex flex-col justify-between">
           {/* Mock Stamp */}
           <div className="absolute top-2 right-2 w-12 h-12 border-4 border-red-500/30 rounded-full flex items-center justify-center text-red-500/30 font-black text-[10px] rotate-12 -z-0">
             (인)
           </div>
           
           <div className="space-y-2 relative z-10 w-full">
              <span className="text-[10px] font-black uppercase text-slate-400 block">공급자 (발행)</span>
              <p className="text-sm font-black">{businessInfo.name}</p>
              <p className="text-[10px] text-slate-600 flex gap-2">
                <span className="text-slate-400 w-14 shrink-0">등록번호</span> {businessInfo.businessNumber}
              </p>
              <p className="text-[10px] text-slate-600 flex gap-2">
                <span className="text-slate-400 w-14 shrink-0">대 표</span> {businessInfo.representative}
              </p>
              <div className="text-[10px] text-slate-600 flex gap-2">
                <span className="text-slate-400 w-14 shrink-0">사업장</span> 
                <span className="leading-tight break-keep">{businessInfo.address}</span>
              </div>
              <p className="text-[10px] text-slate-600 flex gap-2">
                <span className="text-slate-400 w-14 shrink-0">연락처</span> {businessInfo.contact}
              </p>
           </div>
        </div>
      </div>

      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
            <th className="p-3 text-left w-24">일자</th>
            <th className="p-3 text-left">품명 및 규격</th>
            <th className="p-3 text-center w-16">수량</th>
            <th className="p-3 text-right w-32">단가</th>
            <th className="p-3 text-right w-32">금액</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {flattenedItems.map((item, idx) => (
            <tr key={idx} className="text-xs font-medium">
              <td className="p-3 text-slate-500">{format(new Date(item.date), 'MM-dd')}</td>
              <td className="p-3">
                <div className="font-bold text-slate-900">{item.name}</div>
                {item.order_number && <div className="text-[10px] text-slate-400 mt-0.5 font-mono">#{item.order_number}</div>}
              </td>
              <td className="p-3 text-center">{item.quantity}</td>
              <td className="p-3 text-right">₩{item.price.toLocaleString()}</td>
              <td className="p-3 text-right font-bold">₩{item.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {useVat && (
            <>
              <tr className="bg-slate-50 text-[11px] font-bold">
                <td colSpan={3} className="p-2 text-center border-t border-slate-200">공 급 가 액</td>
                <td colSpan={2} className="p-2 text-right border-t border-slate-200">₩{subtotal.toLocaleString()}</td>
              </tr>
              <tr className="bg-slate-50 text-[11px] font-bold">
                <td colSpan={3} className="p-2 text-center border-t border-slate-200">부 가 세 (10%)</td>
                <td colSpan={2} className="p-2 text-right border-t border-slate-200">₩{vat.toLocaleString()}</td>
              </tr>
            </>
          )}
          <tr className="bg-slate-50 font-black border-t-2 border-slate-900">
            <td colSpan={3} className="p-4 text-center text-lg uppercase tracking-widest">
              합 계 금 액 {!useVat && <span className="text-[10px] font-medium text-slate-400 ml-2">(부가세 면세)</span>}
            </td>
            <td colSpan={2} className="p-4 text-right text-2xl italic tracking-tighter">
              ₩{totalAmount.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="border-t pt-4 italic">
        {/* Footnotes removed as requested */}
      </div>

      <style jsx global>{`
        @media print {
          body { padding: 0; margin: 0; }
          .no-print { display: none; }
          @page { size: auto; margin: 15mm; }
        }
      `}</style>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Preparing print...</div>}>
      <PrintContent />
    </Suspense>
  );
}
