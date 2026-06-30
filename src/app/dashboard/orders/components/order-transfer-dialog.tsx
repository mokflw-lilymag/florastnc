"use client";
import { getMessages } from "@/i18n/getMessages";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { toast } from "sonner";
import { Order } from "@/types/order";
import { createClient } from "@/utils/supabase/client";
import { Building2, Info, Loader2 } from "lucide-react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";

interface OrderTransferDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSuccess?: () => void;
}

export function OrderTransferDialog({
  isOpen,
  onOpenChange,
  order,
  onSuccess,
}: OrderTransferDialogProps) {
  const supabase = createClient();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;

  const [availableBranches, setAvailableBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [processBranchId, setProcessBranchId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [orderBranchPercent, setOrderBranchPercent] = useState<number>(100);
  const [processBranchPercent, setProcessBranchPercent] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentBranchName, setCurrentBranchName] = useState("");

  // 현재 지점의 정확한 지점명 조회 (DB에 tenant_name이 누락된 과거 테스트 주문 대응)
  useEffect(() => {
    async function loadCurrentBranchName() {
      if (!isOpen || !order) return;
      if (order.tenant_name) {
        setCurrentBranchName(order.tenant_name);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", order.tenant_id)
          .maybeSingle();
        if (!error && data) {
          setCurrentBranchName(data.name);
        } else {
          setCurrentBranchName("본점");
        }
      } catch (err) {
        setCurrentBranchName("본점");
      }
    }
    loadCurrentBranchName();
  }, [isOpen, order, supabase]);

  // 이관 가능한 지점 목록 조회 (현재 지점과 동일한 조직에 묶인 지점 중 자기 자신 제외)
  useEffect(() => {
    async function loadAvailableBranches() {
      if (!isOpen || !order?.tenant_id) return;
      setLoadingBranches(true);
      try {
        // 1. 현재 지점의 organization_id 조회
        const { data: currentTenant, error: tErr } = await supabase
          .from("tenants")
          .select("organization_id")
          .eq("id", order.tenant_id)
          .maybeSingle();

        if (tErr) throw tErr;
        
        const orgId = currentTenant?.organization_id;
        if (!orgId) {
          // 조직에 속하지 않은 단독 매장인 경우 지점 이관 불가
          setAvailableBranches([]);
          return;
        }

        // 2. 동일 조직 내 다른 지점들 조회
        const { data: siblingTenants, error: sErr } = await supabase
          .from("tenants")
          .select("id, name")
          .eq("organization_id", orgId)
          .neq("id", order.tenant_id);

        if (sErr) throw sErr;
        setAvailableBranches(siblingTenants ?? []);
      } catch (err) {
        console.error("이관 가능 지점 조회 실패:", err);
        toast.error("소속 조직의 지점 목록을 불러오지 못했습니다.");
      } finally {
        setLoadingBranches(false);
      }
    }

    loadAvailableBranches();
  }, [isOpen, order?.tenant_id, supabase]);

  // 다이얼로그 열릴 때 폼 초기화
  useEffect(() => {
    if (isOpen && order) {
      setProcessBranchId("");
      setTransferReason("");
      setOrderBranchPercent(100);
      setProcessBranchPercent(0);
      setNotes("");
    }
  }, [isOpen, order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!order || !processBranchId || !transferReason.trim()) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }

    const selectedBranch = availableBranches.find((b) => b.id === processBranchId);
    if (!selectedBranch) return;

    try {
      setIsSubmitting(true);

      const transferId = crypto.randomUUID();
      const orderTotal = order.summary?.total || 0;

      // 1. order_transfers 테이블에 이관 기록 생성
      const { error: insErr } = await supabase.from("order_transfers").insert([
        {
          id: transferId,
          original_order_id: order.id,
          order_branch_id: order.tenant_id,
          order_branch_name: currentBranchName,
          process_branch_id: selectedBranch.id,
          process_branch_name: selectedBranch.name,
          transfer_reason: transferReason.trim(),
          amount_split: {
            orderBranch: orderBranchPercent,
            processBranch: processBranchPercent,
          },
          original_order_amount: orderTotal,
          status: "pending",
          notes: notes.trim(),
        },
      ]);

      if (insErr) throw insErr;

      // 2. 원본 주문(orders)의 transfer_info 업데이트 및 상태 변경
      const { error: updErr } = await supabase
        .from("orders")
        .update({
          status: "processing",
          transfer_info: {
            isTransferred: true,
            transferId: transferId,
            originalBranchName: currentBranchName,
            processBranchId: selectedBranch.id,
            processBranchName: selectedBranch.name,
            status: "pending",
          },
        })
        .eq("id", order.id);

      if (updErr) throw updErr;

      toast.success("지점 이관 요청이 성공적으로 전송되었습니다.");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("이관 요청 오류:", error);
      toast.error("이관 요청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Building2 className="h-5 w-5 text-indigo-600" />
            주문 지점 이관 요청
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            소속 본사 브랜드 내 다른 지점으로 주문을 이관(수발주)합니다.
          </DialogDescription>
        </DialogHeader>

        {loadingBranches ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : availableBranches.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            이관 가능한 다른 소속 지점이 존재하지 않거나, 단독 매장 상태입니다.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              (다매장(조직) 관리에서 먼저 지점들을 묶어주세요)
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* 주문 정보 카드 */}
            <div className="bg-slate-50 p-4 rounded-lg space-y-2 border">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">주문자:</span>
                <span className="font-medium text-slate-900">{order.orderer?.name || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">주문 금액:</span>
                <span className="font-bold text-indigo-600">₩{(order.summary?.total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">현재 지점:</span>
                <span className="font-medium text-slate-900">{currentBranchName || "로딩 중..."}</span>
              </div>
            </div>

            {/* 수주 지점 선택 */}
            <div className="space-y-2">
              <Label htmlFor="processBranch" className="text-slate-700">이관할 지점 (수주처) *</Label>
              <select
                id="processBranch"
                value={processBranchId}
                onChange={(e) => setProcessBranchId(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-10 cursor-pointer"
              >
                <option value="" disabled>주문을 처리할 지점을 선택하세요</option>
                {availableBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 이관 사유 */}
            <div className="space-y-2">
              <Label htmlFor="transferReason" className="text-slate-700">이관 사유 *</Label>
              <Input
                id="transferReason"
                placeholder="예: 재고 부족, 배송 거리 한계 등"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* 금액 분배 비율 설정 */}
            <div className="space-y-2">
              <Label className="text-slate-700">정산 금액 분배 설정 (%)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="orderPercent" className="text-xs text-slate-500">
                    발주지점 ({currentBranchName || "로딩 중..."})
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="orderPercent"
                      type="number"
                      min="0"
                      max="100"
                      value={orderBranchPercent}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setOrderBranchPercent(val);
                        setProcessBranchPercent(100 - val);
                      }}
                      className="w-20 bg-white"
                    />
                    <span className="text-sm font-medium text-slate-600">%</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      (₩{Math.round((order.summary?.total || 0) * (orderBranchPercent / 100)).toLocaleString()})
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="processPercent" className="text-xs text-slate-500">
                    수주지점 (이관 대상 지점)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="processPercent"
                      type="number"
                      min="0"
                      max="100"
                      value={processBranchPercent}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setProcessBranchPercent(val);
                        setOrderBranchPercent(100 - val);
                      }}
                      className="w-20 bg-white"
                    />
                    <span className="text-sm font-medium text-slate-600">%</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      (₩{Math.round((order.summary?.total || 0) * (processBranchPercent / 100)).toLocaleString()})
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 font-light pt-1">
                <Info className="h-3 w-3" />
                지점 간 정산 비율의 합산은 100%여야 합니다. (기본값: 발주점 100% / 수주점 0%)
              </p>
            </div>

            {/* 비고 */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-slate-700">비고 (수주 지점 전달사항)</Label>
              <Textarea
                id="notes"
                placeholder="수령 주의사항이나 꽃다발 제작 형태 등 세부 요청사항을 적어주세요."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="bg-white text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !processBranchId || !transferReason.trim()}
              >
                {isSubmitting ? "이관 중..." : "이관 요청"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
