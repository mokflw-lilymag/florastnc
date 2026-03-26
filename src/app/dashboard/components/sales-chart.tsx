"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { cn } from "@/lib/utils";

interface SalesChartProps {
  chartData: Array<{ name: string; 매출: number }>;
}

export default function SalesChart({ chartData }: SalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: '#94a3b8' }} 
          dy={10}
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
  );
}
