"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/utils/supabase/client";

function PrintContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [recipient, setRecipient] = useState("");
  const [type, setType] = useState<string | null>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = searchParams.get("ids")?.split(",") || [];
    const recipientParam = searchParams.get("recipient") || "";
    const typeParam = searchParams.get("type");
    
    setRecipient(recipientParam);
    setType(typeParam);

    if (ids.length > 0) {
      fetchOrders(ids);
    }
  }, [searchParams]);

  const fetchOrders = async (ids: string[]) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("id", ids)
        .order("order_date", { ascending: true });

      if (error) throw error;
      setOrders(data || []);
      
      // Auto-trigger print after a short delay to ensure rendering
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (err) {
      console.error("Error fetching print data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center">인쇄 대기 중...</div>;

  const totalAmount = orders.reduce((sum, o) => sum + (o.summary?.total || 0), 0);

  return (
    <div className="p-8 max-w-[800px] mx-auto bg-white text-slate-900 font-sans">
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tighter mb-1">
            {type === 'statement' ? '거 래 명 세 서' : '간 이 영 수 증'}
          </h1>
          <p className="text-sm font-bold text-slate-500 italic">FloraSync Integrated ERP System</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">발행일자</p>
          <p className="text-lg font-black">{format(new Date(), 'yyyy년 MM월 dd일')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-10">
        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">귀하 (수신)</span>
            <div className="text-xl font-black border-b-2 border-slate-200 pb-2 flex items-baseline gap-2">
              {recipient} <span className="text-xs font-medium text-slate-500">님 귀하</span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            아래와 같이 거래 내역을 명세하오니 확인하여 주시기 바랍니다.<br />
            항상 저희를 믿고 거래해 주셔서 깊은 감사를 드립니다.
          </p>
        </div>
        
        <div className="border-2 border-slate-900 p-4 rounded-sm relative overflow-hidden">
           {/* Mock Stamp */}
           <div className="absolute top-2 right-2 w-12 h-12 border-4 border-red-500/30 rounded-full flex items-center justify-center text-red-500/30 font-black text-[10px] rotate-12 -z-0">
             (인)
           </div>
           
           <div className="space-y-2 relative z-10">
              <span className="text-[10px] font-black uppercase text-slate-400 block">공급자 (발행)</span>
              <p className="text-sm font-black">FloraSync Florist Group</p>
              <p className="text-[10px] text-slate-600">대표이사: 김미화</p>
              <p className="text-[10px] text-slate-600">사업장: 서울특별시 서초구 꽃시장길 12</p>
              <p className="text-[10px] text-slate-600">연락처: 02-1234-5678</p>
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
          {orders.map((order) => (
            <tr key={order.id} className="text-xs font-medium">
              <td className="p-3 text-slate-500">{format(new Date(order.order_date), 'MM-dd')}</td>
              <td className="p-3">
                <div className="font-bold text-slate-900">
                   {order.items?.map((i: any) => i.name).join(', ')}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">#{order.order_number}</div>
              </td>
              <td className="p-3 text-center">{order.items?.reduce((s: number, i: any) => s + (i.quantity || 1), 0)}</td>
              <td className="p-3 text-right">₩{((order.summary?.total || 0) / (order.items?.reduce((s: number, i: any) => s + (i.quantity || 1), 0) || 1)).toLocaleString()}</td>
              <td className="p-3 text-right font-bold">₩{(order.summary?.total || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-black border-t-2 border-slate-900">
            <td colSpan={3} className="p-4 text-center text-lg">합 계 금 액</td>
            <td colSpan={2} className="p-4 text-right text-2xl italic tracking-tighter">
              ₩{totalAmount.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="grid grid-cols-2 gap-8 text-[10px] text-slate-400 border-t pt-4 italic">
        <p>* 본 명세서는 시스템에서 자동 발행되었으며, 실물 영수증과 동일한 효력을 가집니다.</p>
        <p className="text-right">Powered by FloraSync ERP v1.0</p>
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
    <Suspense fallback={<div className="p-10 text-center">인쇄 대기 중...</div>}>
      <PrintContent />
    </Suspense>
  );
}
