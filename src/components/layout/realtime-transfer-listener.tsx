"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient, cloudFrom } from "@/utils/supabase/client";
import { ADAPTIVE_POLL_MS, isRealtimeSubscribed } from "@/lib/adaptive-polling";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { isElectronClient } from "@/lib/electron-env";
import { wakeUpElectronWindow } from "@/lib/electron-desktop-api";
import { 
  Building2, 
  Printer, 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { enqueuePrintJob } from "@/lib/print-service";
import { Order } from "@/types/order";
import { useCurrency } from "@/hooks/use-currency";

interface TransferNotifyData {
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
  status: string;
  notes: string;
}

export function RealtimeTransferListener() {
    const { symbol: currencySymbol } = useCurrency();
  const supabase = createClient();
  const { tenantId } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState<TransferNotifyData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const seenTransferIdsRef = useRef<Set<string>>(new Set());
  const popupOpenRef = useRef(false);

  const playAlertSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      playTone(523.25, now, 0.15);
      playTone(659.25, now + 0.1, 0.15);
      playTone(783.99, now + 0.2, 0.3);
    } catch (e) {
      console.warn("오디오 재생 실패 (브라우저 정책 제한 등):", e);
    }
  }, []);

  const notifyIncomingTransfer = useCallback((newRecord: TransferNotifyData) => {
    if (!newRecord?.id || newRecord.status !== "pending") return;
    if (seenTransferIdsRef.current.has(newRecord.id)) return;
    seenTransferIdsRef.current.add(newRecord.id);
    if (seenTransferIdsRef.current.size > 100) {
      const first = seenTransferIdsRef.current.values().next().value;
      if (first) seenTransferIdsRef.current.delete(first);
    }
    if (popupOpenRef.current) return;

    popupOpenRef.current = true;
    playAlertSound();
    setActiveTransfer(newRecord);
    setIsOpen(true);

    if (isElectronClient()) {
      void wakeUpElectronWindow();
    }

    toast.info(`[지점 이관] ${newRecord.order_branch_name} 지점으로부터 이관 요청이 도착했습니다.`, {
      duration: 8000,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refreshTransfersList"));
    }
  }, [playAlertSound]);

  useEffect(() => {
    if (!tenantId) return;

    let isPolling = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let realtimeOk = false;

    const pollPendingTransfers = async () => {
      if (!tenantId || popupOpenRef.current || isPolling) return;
      isPolling = true;
      try {
        const { data, error } = await cloudFrom("order_transfers")
          .select("*")
          .eq("process_branch_id", tenantId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(3);
        if (error) throw error;
        for (const row of (data || []) as TransferNotifyData[]) {
          notifyIncomingTransfer(row);
          if (popupOpenRef.current) break;
        }
      } catch (err) {
        console.warn("[RealtimeTransferListener] 백업 폴링 실패:", err);
      } finally {
        isPolling = false;
      }
    };

    const schedulePoll = () => {
      if (pollTimer) clearTimeout(pollTimer);
      if (realtimeOk) {
        console.log("[RealtimeTransferListener] Realtime 정상 — 백업 폴링 중단");
        return;
      }
      pollTimer = setTimeout(async () => {
        await pollPendingTransfers();
        schedulePoll();
      }, ADAPTIVE_POLL_MS.transfer.fallback);
    };

    // 로그인·재접속 시 오프라인 중 누락분 1회 보완 (지속 폴링 아님)
    void pollPendingTransfers();

    const channel = supabase
      .channel(`realtime-order-transfers-notify-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_transfers",
          filter: `process_branch_id=eq.${tenantId}`,
        },
        (payload) => {
          notifyIncomingTransfer(payload.new as TransferNotifyData);
        }
      )
      .subscribe((status) => {
        const wasOk = realtimeOk;
        realtimeOk = isRealtimeSubscribed(status);
        if (wasOk !== realtimeOk) schedulePoll();
      });

    schedulePoll();

    const handleOnline = () => {
      console.log("[RealtimeTransferListener] 네트워크 복구 — 미처리 이관 확인");
      realtimeOk = false;
      void pollPendingTransfers();
      schedulePoll();
    };
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
      if (pollTimer) clearTimeout(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, [tenantId, supabase, notifyIncomingTransfer]);

  // 수락 및 자동 프린트 실행
  const handleAccept = async () => {
    if (!activeTransfer || !tenantId) return;
    setIsSubmitting(true);
    
    try {
      // 1. order_transfers 테이블의 상태를 'accepted'로 업데이트
      const { error: tErr } = await supabase
        .from("order_transfers")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", activeTransfer.id);
      
      if (tErr) throw tErr;

      // 2. 원본 주문 정보(orders)를 먼저 DB에서 상세 SELECT 해옴 (인쇄에 모든 컬럼 데이터 필요)
      const { data: originalOrder, error: oGetErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", activeTransfer.original_order_id)
        .maybeSingle();

      if (oGetErr) throw oGetErr;
      if (!originalOrder) throw new Error("원본 주문 데이터를 찾을 수 없습니다.");

      // 3. 원본 주문(orders)의 transfer_info 내 status 필드 동기화 업데이트
      const { error: oErr } = await supabase
        .from("orders")
        .update({
          transfer_info: {
            isTransferred: true,
            transferId: activeTransfer.id,
            status: "accepted",
            processBranchId: tenantId,
            process_branch_id: tenantId,
            processBranchName: activeTransfer.process_branch_name,
            process_branch_name: activeTransfer.process_branch_name,
          }
        })
        .eq("id", activeTransfer.original_order_id);

      if (oErr) throw oErr;

      // 4. PP브릿지 실시간 자동 인쇄 큐 전송
      const ord = originalOrder as Order;
      let orderType: "store" | "pickup" | "delivery" = "store";
      if (ord.receipt_type === 'delivery_reservation' || (ord.receipt_type as string) === 'delivery') {
        orderType = "delivery";
      } else if (ord.receipt_type === 'pickup_reservation') {
        orderType = "pickup";
      }

      try {
        // both = 주문서와 인수증 둘 다 자동 출력
        await enqueuePrintJob(supabase, tenantId, ord.id, orderType, ord, true, "both");
        toast.success("이관 수락 완료! 프린터(PP브릿지)로 주문서와 인수증 출력을 보냈습니다.");
      } catch (pErr) {
        console.error("수락 자동 인쇄 큐 전송 실패:", pErr);
        toast.warning("이관은 수락되었으나 자동 인쇄 큐 전송에 실패했습니다. (수발주 내역에서 재출력 가능)");
      }

      setIsOpen(false);
      popupOpenRef.current = false;
      // 이관 내역 페이지가 활성화되어 있으면 화면 새로고침 지원
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshTransfersList"));
      }
    } catch (err) {
      console.error("이관 알림 수락 오류:", err);
      toast.error("이관 요청을 수락하는 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 반려 처리
  const handleReject = async () => {
    if (!activeTransfer || !tenantId) return;
    setIsSubmitting(true);
    
    try {
      // 1. order_transfers 테이블의 상태를 'rejected'로 업데이트
      const { error: tErr } = await supabase
        .from("order_transfers")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", activeTransfer.id);
      
      if (tErr) throw tErr;

      // 2. 원본 주문(orders)의 transfer_info 내 status 필드 동기화 업데이트
      const { error: oErr } = await supabase
        .from("orders")
        .update({
          transfer_info: {
            isTransferred: true,
            transferId: activeTransfer.id,
            status: "rejected",
            processBranchId: tenantId,
            processBranchName: activeTransfer.process_branch_name,
          }
        })
        .eq("id", activeTransfer.original_order_id);

      if (oErr) throw oErr;

      toast.success("이관 요청을 반려 처리했습니다.");
      setIsOpen(false);
      popupOpenRef.current = false;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshTransfersList"));
      }
    } catch (err) {
      console.error("이관 알림 반려 오류:", err);
      toast.error("이관 요청을 반려하는 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeTransfer) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) popupOpenRef.current = false;
      }}
    >
      <DialogContent className="sm:max-w-[420px] rounded-3xl border-none shadow-2xl p-6 bg-slate-900 text-white overflow-hidden">
        {/* 장식 배경 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full -mr-10 -mt-10 pointer-events-none" />
        
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-indigo-400">
            <Building2 className="h-5 w-5 text-indigo-400 animate-bounce" />
            지점 이관 수주 요청!
          </DialogTitle>
          <div className="text-xs text-slate-300 font-light leading-relaxed">
            다른 지점으로부터 주문 제작 대행 요청이 들어왔습니다.<br />
            수락 시 해당 지점의 주문서와 인수증이 프린터로 자동 출력됩니다.
          </div>
        </DialogHeader>

        {/* 상세 내역 카드 */}
        <div className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl space-y-2.5 my-4 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">발주 지점:</span>
            <span className="font-semibold text-white">{activeTransfer.order_branch_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">주문 금액:</span>
            <span className="font-bold text-indigo-300">{currencySymbol}{activeTransfer.original_order_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">정산 비율 (발주 : 수주):</span>
            <span className="font-mono text-white font-semibold">
              {activeTransfer.amount_split.orderBranch}% : {activeTransfer.amount_split.processBranch}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">이관 사유:</span>
            <span className="font-medium text-amber-300 truncate max-w-[200px]" title={activeTransfer.transfer_reason}>
              {activeTransfer.transfer_reason}
            </span>
          </div>
          {activeTransfer.notes && (
            <div className="border-t border-slate-700/60 pt-2.5 mt-2.5 text-slate-300">
              <span className="text-slate-400 block mb-1">본사 전달사항:</span>
              <p className="bg-slate-900/50 p-2 rounded-lg leading-relaxed text-[11px]">
                {activeTransfer.notes}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="grid grid-cols-3 gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleReject}
            disabled={isSubmitting}
            className="border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl h-10 text-xs"
          >
            반려
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              popupOpenRef.current = false;
            }}
            disabled={isSubmitting}
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl h-10 text-xs"
          >
            나중에
          </Button>
          <Button
            type="button"
            onClick={handleAccept}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl h-10 text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
          >
            <Printer className="h-3.5 w-3.5" />
            수락 & 인쇄
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
