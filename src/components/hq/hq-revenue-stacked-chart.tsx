"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#84cc16"];

type BranchKey = { id: string; name: string };

type Props = {
  chartRows: Record<string, string | number>[];
  branchKeys: BranchKey[];
  /** 툴팁 라벨 (예: 일자, 주간, 월, 연도) */
  xLabel?: string;
  /** 대시보드 다열 배치용 높이(px) */
  chartHeight?: number;
};

export function HqRevenueStackedChart({
  chartRows,
  branchKeys,
  xLabel = "기간",
  chartHeight = 360,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) {
    return <Skeleton className="w-full rounded-2xl" style={{ height: chartHeight }} />;
  }

  if (!chartRows.length || !branchKeys.length) {
    const emptyH = Math.min(chartHeight, 280);
    return (
      <div
        className="w-full flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-muted-foreground px-2 text-center"
        style={{ height: emptyH }}
      >
        차트로 표시할 기간 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
          />
          <Tooltip
            formatter={(value, name) => [`${Number(value ?? 0).toLocaleString()}원`, String(name)]}
            labelFormatter={(label) => `${xLabel}: ${label}`}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {branchKeys.map((b, i) => (
            <Bar
              key={b.id}
              dataKey={b.id}
              name={b.name}
              stackId="rev"
              fill={COLORS[i % COLORS.length]}
              radius={i === branchKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
