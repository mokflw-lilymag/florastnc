"use client";

import { useEffect, useState } from "react";
import { getMessages } from "@/i18n/getMessages";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
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
  /** 툴팁 라벨 (예: 일자, 주간, 월, 연도). 생략 시 다국어 기본(조회 기간) */
  xLabel?: string;
  /** 대시보드 다열 배치용 높이(px) */
  chartHeight?: number;
};

export function HqRevenueStackedChart({
  chartRows,
  branchKeys,
  xLabel,
  chartHeight = 360,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const resolvedXLabel = xLabel ?? tf.f01858;
  const axisMoneyTick = (v: number) =>
    baseLocale === "ko"
      ? `${(v / 10000).toFixed(0)}${tf.f02653}`
      : `${Math.round(v / 1000)}k`;

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
        {tf.f02119}
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
            tickFormatter={axisMoneyTick}
          />
          <Tooltip
            formatter={(value, name) => [
              `${Number(value ?? 0).toLocaleString()}${tf.f00487}`,
              String(name),
            ]}
            labelFormatter={(label) => `${resolvedXLabel}: ${label}`}
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
