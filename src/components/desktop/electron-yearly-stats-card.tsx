"use client";

import { useEffect, useState } from "react";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { isElectronClient } from "@/lib/electron-env";
import { fetchElectronYearlyStats } from "@/lib/electron-desktop-api";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";

type Props = {
  className?: string;
  compact?: boolean;
};

/** 로컬 SQLite 기준 올해 누적 (Windows 앱 전용) */
export function ElectronYearlyStatsCard({ className, compact }: Props) {
    const { symbol: currencySymbol } = useCurrency();
  const { tenantId } = useAuth();
  const [stats, setStats] = useState<{ count: number; revenue: number } | null>(null);

  useEffect(() => {
    if (!isElectronClient() || !tenantId) return;
    void fetchElectronYearlyStats(tenantId).then((s) => {
      if (s) setStats(s);
    });
  }, [tenantId]);

  if (!isElectronClient() || !stats) return null;

  if (compact) {
    return (
      <Card
        className={cn(
          "border-purple-300 shadow-sm bg-purple-50/30 rounded-3xl border-none shadow-xl overflow-hidden",
          className,
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-purple-800">올해 누적 (로컬 DB)</CardTitle>
          <DollarSign className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-900">{stats.count.toLocaleString()}건</div>
          <p className="text-xs text-purple-700 font-medium mt-1">
            누적 매출: {currencySymbol}{stats.revenue.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-purple-200 bg-purple-50/40", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-bold text-purple-800">올해 누적 (로컬 DB)</CardTitle>
        <DollarSign className="h-4 w-4 text-purple-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-purple-900">{stats.count.toLocaleString()}건</div>
        <p className="text-xs text-purple-700 font-medium mt-1">
          {currencySymbol}{stats.revenue.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
