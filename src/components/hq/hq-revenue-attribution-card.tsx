"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

interface BranchRevenue {
  tenant_id: string;
  tenant_name: string | null;
  total_attributed: number;
  attribution_count: number;
}

function formatKrw(n: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);
}

export function HqRevenueAttributionCard() {
  const locale = usePreferredLocale();
  const tr = (ko: string, en: string) => pickUiText(toBaseLocale(locale), ko, en);
  const [branches, setBranches] = useState<BranchRevenue[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/hq/revenue?days=30&uiLocale=${encodeURIComponent(locale)}`, { credentials: "include" })
      .then(async (r) => {
        if (r.status === 403) {
          setError(true);
          return null;
        }
        return r.json();
      })
      .then((json) => {
        if (!json) return;
        setBranches(json.branches ?? []);
        setTotal(json.total_attributed ?? 0);
      })
      .catch(() => setError(true));
  }, [locale]);

  if (error) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          {tr("Floxync가 번 돈 (지점별)", "Floxync attributed (by branch)")}
        </CardTitle>
        <CardDescription>
          {tr("최근 30일 UTM 귀속 매출", "Last 30 days UTM-attributed revenue")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-emerald-700 mb-4">{formatKrw(total)}</p>
        {branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr("귀속 데이터 없음", "No attributions yet")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("지점", "Branch")}</TableHead>
                <TableHead className="text-right">{tr("귀속", "Attributed")}</TableHead>
                <TableHead className="text-right">{tr("건수", "Count")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((b) => (
                <TableRow key={b.tenant_id}>
                  <TableCell>{b.tenant_name ?? b.tenant_id.slice(0, 8)}</TableCell>
                  <TableCell className="text-right">{formatKrw(b.total_attributed)}</TableCell>
                  <TableCell className="text-right">{b.attribution_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
