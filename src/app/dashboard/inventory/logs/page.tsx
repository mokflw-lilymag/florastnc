"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMaterials } from "@/hooks/use-materials";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Package, ArrowDownRight, ArrowUpRight, ArrowRightLeft } from "lucide-react";

export default function InventoryLogsPage() {
  const { tenantId } = useAuth();
  const { materials } = useMaterials();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchLogs = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("material_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(100); // 최근 100건만 먼저 로드

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [tenantId]);

  const getMaterialName = (id: string) => {
    const material = materials.find((m) => m.id === id);
    return material ? material.name : id;
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case "IN":
        return <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
      case "OUT":
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      default:
        return <ArrowRightLeft className="h-4 w-4 text-slate-500" />;
    }
  };

  const getLogBadge = (type: string) => {
    switch (type) {
      case "IN":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">입고</Badge>;
      case "OUT":
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">출고</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">조정</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="자재 입출고 내역" 
        description="자재의 입고, 출고 및 재고 조정 이력을 확인합니다."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            최근 입출고 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>일시</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>자재명</TableHead>
                  <TableHead className="text-right">변동 수량</TableHead>
                  <TableHead className="text-right">잔여 재고</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead>작업자</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                      기록을 불러오는 중입니다...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                      입출고 기록이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), "yyyy-MM-dd HH:mm", { locale: ko })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getLogIcon(log.type)}
                          {getLogBadge(log.type)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">
                        {getMaterialName(log.material_id)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={log.type === "IN" ? "text-emerald-600" : log.type === "OUT" ? "text-red-600" : "text-slate-600"}>
                          {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-900">
                        {log.after_stock}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {log.memo || "-"}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {log.worker || "시스템"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
