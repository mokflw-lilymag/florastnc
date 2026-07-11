"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2, TrendingUp, Users } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { useCurrency } from "@/hooks/use-currency";

export function SaasRevenueDashboard({ stats }: { stats: any }) {
    const { symbol: currencySymbol } = useCurrency();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeTenantsCount, setActiveTenantsCount] = useState(0);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const { data: tenants } = await supabase.from("tenants").select("id").eq("is_active", true);
      setActiveTenantsCount(tenants?.length || 0);

      // Fetch last 6 months transactions
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5)).toISOString();
      const { data: txs } = await supabase
        .from("wallet_transactions")
        .select("amount, created_at, metadata")
        .eq("status", "completed")
        .gte("created_at", sixMonthsAgo);

      const monthlyData: Record<string, { toss: number; stripe: number }> = {};
      
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const monthStr = format(d, "yyyy-MM");
        monthlyData[monthStr] = { toss: 0, stripe: 0 };
      }

      txs?.forEach(tx => {
        const monthStr = format(new Date(tx.created_at), "yyyy-MM");
        if (monthlyData[monthStr]) {
          if (tx.metadata?.provider === "stripe") {
            monthlyData[monthStr].stripe += tx.amount;
          } else {
            monthlyData[monthStr].toss += tx.amount;
          }
        }
      });

      const formattedChartData = Object.keys(monthlyData).map(key => ({
        name: key,
        Toss: monthlyData[key].toss,
        Stripe: monthlyData[key].stripe,
      }));

      setChartData(formattedChartData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  const currentMonthData = chartData[chartData.length - 1] || { Toss: 0, Stripe: 0 };
  const mrr = currentMonthData.Toss + currentMonthData.Stripe;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> 예상 월 반복 매출 (MRR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{currencySymbol}{mrr.toLocaleString()}</div>
            <p className="text-[10px] text-blue-500/80 mt-1">이번 달(당월) 결제 기준 합계</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-indigo-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-indigo-600 uppercase tracking-wider">국내 누적 매출 (Toss)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-indigo-900">{currencySymbol}{stats.domesticSales.toLocaleString()}</div>
            <p className="text-[10px] text-indigo-500/80 mt-1">10% 부가세 과세 대상 매출액</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-purple-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-purple-600 uppercase tracking-wider">해외 누적 매출 (Stripe)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-900">{currencySymbol}{stats.overseasSales.toLocaleString()}</div>
            <p className="text-[10px] text-purple-500/80 mt-1">0% 영세율 면세 대상 매출액</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">월별 구독료 매출 추이 (최근 6개월)</CardTitle>
          <CardDescription>국내(Toss) 및 해외(Stripe) 결제망을 통한 월별 구독료 발생 현황입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `${currencySymbol}${(value / 10000).toLocaleString()}만`} />
                <Tooltip 
                  formatter={(value: any) => `${currencySymbol}${Number(value).toLocaleString()}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Toss" stackId="a" fill="#4f46e5" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Stripe" stackId="a" fill="#9333ea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
