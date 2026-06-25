"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { isElectronClient } from "@/lib/electron-env";
import { fetchElectronYearlyStats } from "@/lib/electron-desktop-api";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";

export function ElectronLocalStatsHint() {
  const { tenantId } = useAuth();
  const [stats, setStats] = useState<{ count: number; revenue: number } | null>(null);

  useEffect(() => {
    if (!isElectronClient() || !tenantId) return;
    void fetchElectronYearlyStats(tenantId).then((s) => {
      if (s) setStats(s);
    });
  }, [tenantId]);

  if (!isElectronClient() || !stats) return null;

  return (
    <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
      <Database className="h-3 w-3" />
      로컬 DB 올해 {stats.count}건 · ₩{stats.revenue.toLocaleString()}
    </Badge>
  );
}
