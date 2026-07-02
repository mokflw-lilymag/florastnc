"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { 
  Building2, 
  ArrowRightLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  RefreshCw, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Order } from "@/types/order";
import { enqueuePrintJob } from "@/lib/print-service";

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
  notes: string;
  created_at: string;
  orders?: Order;
}

export default function OrderTransfersPage() {
  const supabase = createClient();
  const { tenantId, user } = useAuth();
  
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  
  // 통계 계산용 상태
  const [stats, setStats] = useState({
    totalCount: 0,
    sentCount: 0,
    receivedCount: 0,
    pendingCount: 0,
    completedCount: 0,
    totalVolume: 0,
    settlementVolume: 0, // 수주지점 정산 총액
  });

  // 1. 유저 역할 및 본사 조직 매핑 정보 조회
  useEffect(() => {
    async function loadUserContext() {
      if (!user?.id) return;
      try {
        // 프로필 정보 조회
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, tenant_id")
          .eq("id", user.id)
          .maybeSingle();
        
        setUserRole(profile?.role || "staff");

        // 소속 매장의 본사 조직 ID 조회
        const activeTenantId = tenantId || profile?.tenant_id;
        let organizationId = null;
        if (activeTenantId) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("organization_id")
            .eq("id", activeTenantId)
            .maybeSingle();
          if (tenant?.organization_id) {
            organizationId = tenant.organization_id;
          }
        }
        
        if (!organizationId && user?.id) {
          const { data: member } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .maybeSingle();
          if (member?.organization_id) {
            organizationId = member.organization_id;
          }
        }

        if (organizationId) {
          setOrgId(organizationId);
        }
      } catch (err) {
        console.error("유저 컨텍스트 로딩 실패:", err);
      }
    }
    loadUserContext();
  }, [user?.id, tenantId, supabase]);

  // 실시간 알림 팝업에서의 처리에 맞춰 리스트 즉시 갱신 리스너 바인딩
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleRefresh = () => {
        loadTransfers();
      };
      window.addEventListener("refreshTransfersList", handleRefresh);
      return () => {
        window.removeEventListener("refreshTransfersList", handleRefresh);
      };
    }
  }, []);

  // 2. 이관 목록 조회
  async function loadTransfers() {
    const isHqUser = userRole === "super_admin" || userRole === "hq";
    
    setLoading(true);
    try {
      let query = supabase
        .from("order_transfers")
        .select(`
          *,
          orders:original_order_id (
            *
          )
        `)
        .order("created_at", { ascending: false });

      if (tenantId && tenantId !== "all") {
        query = query.or(`order_branch_id.eq.${tenantId},process_branch_id.eq.${tenantId}`);
      } else {
        setTransfers([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;

      const records = (data || []) as unknown as TransferRecord[];
      setTransfers(records);
      calculateStats(records);
    } catch (err) {
      console.error("이관 내역 조회 실패:", err);
      toast.error("이관 내역을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userRole !== null && (tenantId || orgId || userRole === "super_admin")) {
      loadTransfers();
    }
  }, [tenantId, userRole, orgId]);

  // 통계 집계 함수
  function calculateStats(records: TransferRecord[]) {
    let sent = 0;
    let received = 0;
    let pending = 0;
    let completed = 0;
    let volume = 0;
    let settle = 0;

    records.forEach((r) => {
      volume += r.original_order_amount || 0;
      
      if (r.status === "pending") pending++;
      if (r.status === "completed") completed++;

      // 지점 분배 정산액 집계
      const processPercent = r.amount_split?.processBranch || 0;
      settle += (r.original_order_amount * processPercent) / 100;

      // 로그인 지점 기준 분류
      if (r.order_branch_id === tenantId) sent++;
      if (r.process_branch_id === tenantId) received++;
    });

    setStats({
      totalCount: records.length,
      sentCount: sent,
      receivedCount: received,
      pendingCount: pending,
      completedCount: completed,
      totalVolume: volume,
      settlementVolume: settle,
    });
  }

  // 3. 수발주 상태 업데이트 (수락/반려/완료)
  async function handleUpdateStatus(
    transferId: string, 
    orderId: string, 
    newStatus: "accepted" | "rejected" | "completed",
    processBranchName: string
  ) {
    try {
      // a. order_transfers 테이블의 상태 변경
      const { error: tErr } = await supabase
        .from("order_transfers")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", transferId);

      if (tErr) throw tErr;

      // b. 원본 주문(orders)의 transfer_info 내 status 필드 동기화
      // 완료 시에는 주문 자체의 status를 'completed'로 같이 전환할 수 있음
      const updatePayload: Record<string, any> = {
        transfer_info: {
          isTransferred: true,
          transferId: transferId,
          status: newStatus,
          processBranchId: tenantId,
          process_branch_id: tenantId,
          processBranchName: processBranchName,
          process_branch_name: processBranchName,
        }
      };

      if (newStatus === "completed") {
        updatePayload.status = "completed";
      }

      const { error: oErr } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", orderId);

      if (oErr) throw oErr;

      // c. 수락(accepted) 처리된 경우, 수주 지점의 프린터로 실시간 주문서+인수증 인쇄 큐에 즉시 삽입 (PP브릿지 연동 자동화)
      if (newStatus === "accepted" && tenantId) {
        const trRecord = transfers.find(t => t.id === transferId);
        if (trRecord?.orders) {
          const ord = trRecord.orders;
          
          let orderType: "store" | "pickup" | "delivery" = "store";
          if (ord.receipt_type === 'delivery_reservation' || (ord.receipt_type as string) === 'delivery') {
            orderType = "delivery";
          } else if (ord.receipt_type === 'pickup_reservation') {
            orderType = "pickup";
          }
          
          try {
            // 양식 타입 = 'both' (주문서와 인수증/예약증 둘 다 출력)
            await enqueuePrintJob(supabase, tenantId, ord.id, orderType, ord, true, 'both');
            toast.success("프린터(PP브릿지)로 주문서 및 인수증 출력을 즉시 전송했습니다.");
          } catch (pErr) {
            console.error("수락 자동 인쇄 실패:", pErr);
            toast.error("자동 인쇄 큐 전송에 실패했습니다. (수동 출력이 가능합니다)");
          }
        }
      }

      const statusKo = newStatus === "accepted" ? "수락" : newStatus === "rejected" ? "반려" : "정산 완료";
      toast.success(`이관 요청을 ${statusKo} 처리했습니다.`);
      loadTransfers();
    } catch (err) {
      console.error("이관 상태 변경 실패:", err);
      toast.error("상태를 변경하는 중 오류가 발생했습니다.");
    }
  }

  // 진행 상태 뱃지 스타일 매핑
  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">수락 대기</Badge>;
      case "accepted":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">제작/수락됨</Badge>;
      case "rejected":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50">반려됨</Badge>;
      case "completed":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">정산 완료</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">{status}</Badge>;
    }
  }

  const isHqView = userRole === "super_admin" || userRole === "hq";

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* 타이틀 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600" />
            {isHqView ? "다매장 지점 이관 정산" : "지점 주문이관"}
          </h1>
          <p className="text-sm text-slate-500">
            {isHqView 
              ? "본사 및 하위 브랜드 지점들 간 주문 이관·정산 내역입니다." 
              : "같은 조직(본사) 소속 지점 간 주문 이관입니다. 회원사 수발주와는 별도 기능입니다."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/orders"
            className={cn(buttonVariants({ variant: "outline" }), "h-9 rounded-xl font-bold inline-flex items-center")}
          >
            주문 현황
          </Link>
        <Button 
          variant="outline" 
          onClick={loadTransfers} 
          disabled={loading}
          className="h-9 gap-2 text-slate-600 hover:text-slate-900"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
        </div>
      </div>

      {/* 통계 요약 카드 (Stats Dashboard) */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* 카드 1 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 hover:scale-[1.01] transition-transform duration-200">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold tracking-wider uppercase">총 이관 주문액</span>
            <DollarSign className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="space-y-1 mt-2">
            <span className="text-2xl font-bold text-slate-900">
              ₩{stats.totalVolume.toLocaleString()}
            </span>
            <p className="text-[10px] text-slate-400">총 {stats.totalCount}건의 지점 이관 금액</p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50/20 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
        </div>

        {/* 카드 2 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 hover:scale-[1.01] transition-transform duration-200">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold tracking-wider uppercase">
              {isHqView ? "이관 수주 정산 예정액" : "수주(받은) 정산 금액"}
            </span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="space-y-1 mt-2">
            <span className="text-2xl font-bold text-emerald-600">
              ₩{stats.settlementVolume.toLocaleString()}
            </span>
            <p className="text-[10px] text-slate-400">수주 매장 분배율 기준 정산 합계</p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-50/20 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
        </div>

        {/* 카드 3 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 hover:scale-[1.01] transition-transform duration-200">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold tracking-wider uppercase">수락 대기중</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="space-y-1 mt-2">
            <span className="text-2xl font-bold text-amber-600">{stats.pendingCount} 건</span>
            <p className="text-[10px] text-slate-400">수주점의 확인 및 접수 대기 건</p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-50/20 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
        </div>

        {/* 카드 4 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 hover:scale-[1.01] transition-transform duration-200">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold tracking-wider uppercase">정산 완료</span>
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="space-y-1 mt-2">
            <span className="text-2xl font-bold text-slate-900">{stats.completedCount} 건</span>
            <p className="text-[10px] text-slate-400">배송 완료 및 매출 확정 건수</p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50/20 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
        </div>
      </div>

      {/* 이관 리스트 테이블 */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">이관 내역 리스트</h2>
          <span className="text-xs text-slate-400">총 {transfers.length}개의 수발주 이력</span>
        </div>

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <span className="text-sm text-slate-500 font-medium">이관 정보를 불러오는 중입니다...</span>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50/30">
            <AlertCircle className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium mt-1">조회할 수 있는 수발주(이관) 내역이 없습니다.</p>
            <p className="text-xs text-slate-400">주문서 상세 액션을 통해 다른 지점으로 주문을 이관해 보세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-500 font-bold whitespace-nowrap">
                  <th className="p-4 text-center">유형</th>
                  <th className="p-4">이관 일시</th>
                  <th className="p-4">주문 번호</th>
                  <th className="p-4 text-left leading-tight">
                    발주 지점<br />
                    <span className="text-[10px] text-slate-400 font-normal">(보낸 곳)</span>
                  </th>
                  <th className="p-4 text-left leading-tight">
                    수주 지점<br />
                    <span className="text-[10px] text-slate-400 font-normal">(받은 곳)</span>
                  </th>
                  <th className="p-4 text-right">주문 금액</th>
                  <th className="p-4 text-center leading-tight">
                    정산 비율<br />
                    <span className="text-[10px] text-slate-400 font-normal">(발주 : 수주)</span>
                  </th>
                  <th className="p-4 text-right leading-tight">
                    정산 대상액<br />
                    <span className="text-[10px] text-slate-400 font-normal">(수주처)</span>
                  </th>
                  <th className="p-4 text-left">이관 사유</th>
                  <th className="p-4 text-center">상태</th>
                  <th className="p-4 text-center w-40">이관 승인 처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((t) => {
                  const isSentByMe = t.order_branch_id === tenantId;
                  const isReceivedByMe = t.process_branch_id === tenantId;
                  const originalAmount = t.original_order_amount || 0;
                  const processBranchShare = t.amount_split?.processBranch || 0;
                  const processShareAmount = (originalAmount * processBranchShare) / 100;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* 유형 */}
                      <td className="p-4 text-center whitespace-nowrap">
                        {isSentByMe ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            발주 (보냄)
                          </span>
                        ) : isReceivedByMe ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            수주 (받음)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            지점 이동
                          </span>
                        )}
                      </td>

                      {/* 이관일시 */}
                      <td className="p-4 text-slate-500 font-mono whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>

                      {/* 주문번호 */}
                      <td className="p-4 font-semibold text-slate-700 font-mono whitespace-nowrap">
                        {t.orders?.order_number || (
                          <span className="text-[10px] text-slate-400 font-normal">수동 연동 주문</span>
                        )}
                      </td>

                      {/* 발주지점 */}
                      <td className="p-4 font-medium text-slate-900 whitespace-nowrap">{t.order_branch_name || "본점"}</td>

                      {/* 수주지점 */}
                      <td className="p-4 font-medium text-slate-900 whitespace-nowrap">{t.process_branch_name}</td>

                      {/* 주문금액 */}
                      <td className="p-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        ₩{originalAmount.toLocaleString()}
                      </td>

                      {/* 정산비율 */}
                      <td className="p-4 text-center font-semibold text-slate-600 font-mono whitespace-nowrap">
                        {t.amount_split?.orderBranch}% : {processBranchShare}%
                      </td>

                      {/* 정산 대상액 */}
                      <td className="p-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                        ₩{processShareAmount.toLocaleString()}
                      </td>

                      {/* 이관 사유 */}
                      <td className="p-4 text-slate-600 font-medium whitespace-nowrap">
                        {t.transfer_reason}
                      </td>

                      {/* 상태 */}
                      <td className="p-4 text-center whitespace-nowrap">{getStatusBadge(t.status)}</td>

                      {/* 이관 승인 처리 액션 */}
                      <td className="p-4 text-center">
                        {t.status === "pending" && isReceivedByMe && (
                          <div className="flex justify-center gap-1.5">
                            <Button
                              size="xs"
                              onClick={() => handleUpdateStatus(t.id, t.original_order_id, "accepted", t.process_branch_name)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-7 px-2.5 rounded text-[10px]"
                            >
                              수락
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleUpdateStatus(t.id, t.original_order_id, "rejected", t.process_branch_name)}
                              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold h-7 px-2.5 rounded text-[10px]"
                            >
                              반려
                            </Button>
                          </div>
                        )}

                        {t.status === "accepted" && isReceivedByMe && (
                          <Button
                            size="xs"
                            onClick={() => handleUpdateStatus(t.id, t.original_order_id, "completed", t.process_branch_name)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 px-3 rounded text-[10px] w-full"
                          >
                            정산 확정(완료)
                          </Button>
                        )}

                        {t.status === "pending" && isSentByMe && (
                          <span className="text-[10px] text-amber-500 font-medium flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3" />
                            상대점 승인 대기중
                          </span>
                        )}

                        {t.status === "accepted" && isSentByMe && (
                          <span className="text-[10px] text-blue-500 font-medium flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            상대점 처리 중
                          </span>
                        )}

                        {t.status === "completed" && (
                          <span className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            처리/정산 최종 완료
                          </span>
                        )}

                        {t.status === "rejected" && (
                          <span className="text-[10px] text-rose-400 font-medium flex items-center justify-center gap-1">
                            <XCircle className="h-3 w-3" />
                            이관 반려됨
                          </span>
                        )}

                        {!isReceivedByMe && !isSentByMe && isHqView && (
                          <span className="text-[10px] text-slate-400">지점 간 처리 완료 대기</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
