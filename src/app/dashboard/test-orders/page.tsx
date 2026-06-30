'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/hooks/use-auth';

export default function TestOrdersPage() {
  const { tenantId, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!tenantId) {
      setError("로그인 세션에 tenantId가 없습니다.");
      setLoading(false);
      return;
    }

    const fetchTest = async () => {
      const supabase = createClient();
      try {
        console.log("시작: tenantId =", tenantId);
        
        // 1. orders 테이블의 전체 건수 및 이관 주문 포함 조회 시도
        const { data: orders, error: fetchErr } = await supabase
          .from('orders')
          .select(`
            id, 
            order_number, 
            tenant_id, 
            tenant_name, 
            status, 
            order_date, 
            transfer_info
          `)
          .or(`tenant_id.eq.${tenantId},and(transfer_info->>processBranchId.eq.${tenantId},transfer_info->>status.in.(accepted,completed)),and(transfer_info->>process_branch_id.eq.${tenantId},transfer_info->>status.in.(accepted,completed))`)
          .order('order_date', { ascending: false });

        if (fetchErr) {
          setError(fetchErr);
        } else {
          setData(orders);
        }
      } catch (err: any) {
        setError(err.message || err);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [tenantId, authLoading]);

  if (authLoading || loading) {
    return <div className="p-8 text-center text-lg">주문 데이터를 실시간 조회 중입니다...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">🛠️ 이관 주문 조회 실시간 진단 도구</h1>
      
      <div className="bg-slate-100 p-4 rounded-lg space-y-2 text-sm text-slate-700">
        <div>• <strong>현재 로그인 테넌트 ID:</strong> <code className="bg-white px-2 py-0.5 rounded border">{tenantId}</code></div>
        <div>• <strong>테넌트 이름:</strong> 릴리맥여의도점 또는 접속 지점</div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <h2 className="font-bold">❌ 쿼리 에러 발생:</h2>
          <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg text-emerald-700">✅ 조회 성공 (총 {data.length}건 반환됨)</h2>
          
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">주문번호</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">소속 지점 ID (tenant_id)</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">주문 상태</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">주문 날짜</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">이관 메타 (transfer_info)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((order: any) => {
                  const isTransferred = !!order.transfer_info;
                  return (
                    <tr key={order.id} className={isTransferred ? "bg-emerald-50/50" : ""}>
                      <td className="px-4 py-2 font-medium">{order.order_number}</td>
                      <td className="px-4 py-2 text-gray-500 font-mono text-xs">{order.tenant_id}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 font-semibold">{order.status}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{order.order_date}</td>
                      <td className="px-4 py-2">
                        {isTransferred ? (
                          <pre className="text-[10px] bg-white p-2 border rounded max-h-36 overflow-y-auto font-mono">
                            {JSON.stringify(order.transfer_info, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-gray-400">없음</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
