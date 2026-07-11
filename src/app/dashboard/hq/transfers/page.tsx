"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, RefreshCw, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { useCurrency } from "@/hooks/use-currency";

interface TransferRecord {
  id: string;
  original_order_id: string;
  order_branch_id: string;
  order_branch_name: string;
  process_branch_id: string;
  process_branch_name: string;
  transfer_reason: string;
  amount_split: {
    orderBranch: number;
    processBranch: number;
  };
  original_order_amount: number;
  status: "pending" | "accepted" | "rejected" | "completed";
  created_at: string;
}

export default function HqOrderTransfersPage() {
    const { symbol: currencySymbol } = useCurrency();
  const supabase = createClient();
  const { profile } = useAuth();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);

  const L = (ko: string, en: string) => (baseLocale === "ko" ? ko : en);

  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  // 본사 조직 ID 획득
  useEffect(() => {
    async function loadOrgContext() {
      if (!profile?.id) return;
      try {
        const { data: member } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", profile.id)
          .maybeSingle();
        if (member?.organization_id) {
          setOrgId(member.organization_id);
        }
      } catch (e) {
        console.error("본사 조직 조회 오류:", e);
      }
    }
    loadOrgContext();
  }, [profile?.id, supabase]);

  // 전체 지점의 이관/수발주 내역 조회
  const loadAllTransfers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      // 본사 조직 하위 지점들의 id 획득
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("organization_id", orgId);
      
      const branchIds = tenants?.map(t => t.id) || [];
      if (branchIds.length === 0) {
        setTransfers([]);
        return;
      }

      const { data: transferData, error } = await supabase
        .from("order_transfers")
        .select("*")
        .or(`order_branch_id.in.(${branchIds.join(",")}),process_branch_id.in.(${branchIds.join(",")})`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransfers(transferData || []);
    } catch (err) {
      console.error("전체 이관 내역 조회 실패:", err);
      toast.error("이관 내역 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [orgId, supabase]);

  useEffect(() => {
    if (orgId) {
      loadAllTransfers();
    }
  }, [orgId, loadAllTransfers]);

  return (
    <div className="max-w-none p-6 space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={L("다매장 수발주 정산", "HQ Inter-Branch Transfers")}
        description={L("본사 관할 모든 지점들의 수발주(이관) 거래 내역과 정산 분배 금액을 한곳에서 모니터링합니다.", "Monitor all split settlements and real-time statuses.")}
        icon={ArrowRightLeft}
      />

      {/* 통계 요약 카드 배치 */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 border border-slate-100/50">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">{L("총 이관 주문", "Total Transfers")}</span>
          <span className="text-2xl font-light text-slate-800">{transfers.length}{L("건", " Cases")}</span>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 border border-slate-100/50">
          <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider block mb-1">{L("승인 대기중", "Pending")}</span>
          <span className="text-2xl font-semibold text-amber-600">{transfers.filter(t => t.status === "pending").length}{L("건", " Cases")}</span>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 border border-slate-100/50">
          <span className="text-[10px] text-indigo-500 font-extrabold uppercase tracking-wider block mb-1">{L("수락 (진행중)", "Accepted")}</span>
          <span className="text-2xl font-semibold text-indigo-600">{transfers.filter(t => t.status === "accepted").length}{L("건", " Cases")}</span>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 border border-slate-100/50">
          <span className="text-[10px] text-emerald-500 font-extrabold uppercase tracking-wider block mb-1">{L("배송 및 정산완료", "Completed")}</span>
          <span className="text-2xl font-semibold text-emerald-600">{transfers.filter(t => t.status === "completed").length}{L("건", " Cases")}</span>
        </Card>
      </div>

      {/* 이관 리스트 테이블 */}
      <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden border border-slate-100/50">
        <CardHeader className="bg-slate-50/50 border-b pb-4 px-6 flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <ArrowRightLeft className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
              {L("다매장 수발주(이관) 거래 통합 대장", "HQ Inter-Branch Transfer Master Ledger")}
            </CardTitle>
            <CardDescription className="text-[10px] font-light mt-0.5">
              {L("각 지점에서 이관 신청 및 수행한 모든 수발주 상세 정산과 실시간 상태를 감시합니다.", "Monitor all split statuses.")}
            </CardDescription>
          </div>
          <Button size="sm" onClick={loadAllTransfers} variant="outline" className="rounded-xl border-slate-200 font-bold text-[11px] h-8 bg-white">
            <RefreshCw className={loading ? "mr-1.5 h-3.5 w-3.5 animate-spin" : "mr-1.5 h-3.5 w-3.5"} />
            {L("새로고침", "Refresh")}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <span className="text-xs font-light">{L("이관 내역 조회 중...", "Loading transfers...")}</span>
            </div>
          ) : transfers.length === 0 ? (
            <div className="py-24 text-center text-slate-400 font-light text-xs">
              {L("등록된 수발주(이관) 내역이 없습니다.", "No transfers registered.")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-b border-slate-100">
                  <TableHead className="font-medium text-[11px] text-slate-600 px-6">{L("요청 일시", "Requested At")}</TableHead>
                  <TableHead className="font-medium text-[11px] text-slate-600">{L("발주 지점 (접수)", "Order Branch")}</TableHead>
                  <TableHead className="font-medium text-[11px] text-slate-600">{L("수주 지점 (수행)", "Process Branch")}</TableHead>
                  <TableHead className="font-medium text-[11px] text-slate-600 text-right">{L("원본 주문액", "Order Amt")}</TableHead>
                  <TableHead className="font-medium text-[11px] text-slate-600 text-center">{L("분배 비율", "Split Ratio")}</TableHead>
                  <TableHead className="font-medium text-[11px] text-indigo-600 text-right">{L("발주 지점 정산금", "Order Branch Share")}</TableHead>
                  <TableHead className="font-medium text-[11px] text-emerald-600 text-right">{L("수주 지점 정산금", "Process Branch Share")}</TableHead>
                  <TableHead className="font-medium text-[11px] text-slate-600 text-center">{L("상태", "Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => {
                  const originalAmount = t.original_order_amount || 0;
                  const orderBranchSharePct = t.amount_split?.orderBranch ?? 30;
                  const processBranchSharePct = t.amount_split?.processBranch ?? 70;
                  const orderShare = (originalAmount * orderBranchSharePct) / 100;
                  const processShare = (originalAmount * processBranchSharePct) / 100;

                  return (
                    <TableRow key={t.id} className="hover:bg-slate-50/30 border-b border-slate-50">
                      <TableCell className="text-[11px] text-slate-500 font-medium px-6">
                        {format(new Date(t.created_at), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                      <TableCell className="font-bold text-xs text-slate-800">
                        {t.order_branch_name?.replace("릴리맥", "") || "—"}
                      </TableCell>
                      <TableCell className="font-bold text-xs text-slate-800">
                        {t.process_branch_name?.replace("릴리맥", "") || "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-500 font-semibold tabular-nums">
                        {currencySymbol}{originalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-[10px] text-slate-400 font-bold">
                        {orderBranchSharePct} : {processBranchSharePct}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-indigo-600 tabular-nums">
                        {currencySymbol}{orderShare.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-emerald-600 tabular-nums">
                        {currencySymbol}{processShare.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {t.status === "pending" && (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-100 text-[9px] font-bold rounded-full px-2">대기중</Badge>
                        )}
                        {t.status === "accepted" && (
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[9px] font-bold rounded-full px-2">수락됨</Badge>
                        )}
                        {t.status === "rejected" && (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-100 text-[9px] font-bold rounded-full px-2">반려됨</Badge>
                        )}
                        {t.status === "completed" && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] font-bold rounded-full px-2">완료됨</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
