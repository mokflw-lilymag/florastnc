"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SalesChartProps {
  chartData: Array<{ name: string; 매출: number }>;
}

export default function SalesChart({ chartData }: SalesChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  const [dimensions, setDimensions] = useState({ width: 0, height: 350 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // 실제 컨테이너의 크기를 직접 감시하여 Recharts의 내부 경고 방지
  useEffect(() => {
    if (!isMounted) return;
    
    // ResizeObserver를 사용하여 실제 가시적인 크기가 있을 때만 렌더링하도록 유도
    const observer = new ResizeObserver((entries) => {
      if (entries[0]?.contentRect) {
        const { width } = entries[0].contentRect;
        if (width > 0) {
          setDimensions(prev => ({ ...prev, width }));
        }
      }
    });

    const el = document.getElementById("sales-chart-wrapper");
    if (el) observer.observe(el);
    
    return () => observer.disconnect();
  }, [isMounted]);

  if (!isMounted) {
    return <Skeleton className="w-full h-[350px] rounded-2xl" />;
  }

  // 데이터가 없을 때의 안전한 처리
  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full h-[350px] flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
        <p className="text-sm text-slate-400 font-medium">표시할 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div 
      id="sales-chart-wrapper" 
      className="w-full relative" 
      style={{ height: "350px", minHeight: "350px", display: "block" }}
    >
      {dimensions.width > 0 && (
        <ResponsiveContainer width={dimensions.width} height={350} debounce={0}>
          <BarChart 
            data={chartData} 
            margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#64748b' }} 
              dy={15}
              padding={{ left: 10, right: 10 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(v) => `₩${(v / 10000).toFixed(0)}만`}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-2xl p-4 border border-slate-100 min-w-[150px]">
                      <p className="text-xs font-bold text-slate-800 mb-2 border-b border-slate-50 pb-2">{label}</p>
                      {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-4 mt-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-[11px] text-slate-600 font-medium">{entry.name}</span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-900">₩{entry.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="매출" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
