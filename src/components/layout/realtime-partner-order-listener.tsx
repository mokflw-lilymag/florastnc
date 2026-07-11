"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { ADAPTIVE_POLL_MS, isRealtimeSubscribed } from "@/lib/adaptive-polling";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { isElectronClient } from "@/lib/electron-env";
import {
  notifyExternalOrderDesktop,
  wakeUpElectronWindow,
} from "@/lib/electron-desktop-api";
import { playExternalOrderNotificationSound } from "@/lib/notification-sound";
import { useSettings } from "@/hooks/use-settings";
import { Globe, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  acceptPartnerExternalOrder,
  rejectPartnerExternalOrder,
  type ExternalOrderRecord,
} from "@/lib/partner-order-service";
import { useCurrency } from "@/hooks/use-currency";

export function RealtimePartnerOrderListener() {
    const { symbol: currencySymbol } = useCurrency();
  const supabase = createClient();
  const { tenantId } = useAuth();
  const { settings } = useSettings();

  const [isOpen, setIsOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ExternalOrderRecord | null>(null);
  const [senderName, setSenderName] = useState("");
  const [senderContact, setSenderContact] = useState("");
  const [senderLogoUrl, setSenderLogoUrl] = useState<string | null>(null);
  const [canReceiveOrders, setCanReceiveOrders] = useState(false);
  const [receiverShopName, setReceiverShopName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const popupOpenRef = useRef(false);

  useEffect(() => {
    if (!tenantId) return;
    void supabase
      .from("tenants")
      .select("can_receive_orders, name")
      .eq("id", tenantId)
      .maybeSingle()
      .then(({ data }) => {
        setCanReceiveOrders(!!data?.can_receive_orders);
        setReceiverShopName(data?.name || "");
      });
  }, [tenantId, supabase]);

  const loadSenderMeta = useCallback(
    async (row: ExternalOrderRecord) => {
      const branding = row.order_data?.sender_branding;
      if (branding?.name) {
        const meta = {
          name: branding.name,
          contact: branding.contact || "",
          logoUrl: branding.logo_url || null,
        };
        setSenderName(meta.name);
        setSenderContact(meta.contact);
        setSenderLogoUrl(meta.logoUrl);
        return meta;
      }
      const { data } = await supabase
        .from("tenants")
        .select("name, contact_phone, logo_url")
        .eq("id", row.sender_tenant_id)
        .maybeSingle();
      const meta = {
        name: data?.name || "발주 매장",
        contact: data?.contact_phone || "",
        logoUrl: data?.logo_url || null,
      };
      setSenderName(meta.name);
      setSenderContact(meta.contact);
      setSenderLogoUrl(meta.logoUrl);
      return meta;
    },
    [supabase],
  );

  const notifyIncoming = useCallback(
    async (row: ExternalOrderRecord) => {
      if (!row?.id || row.status !== "pending") return;
      if (seenIdsRef.current.has(row.id)) return;
      seenIdsRef.current.add(row.id);
      if (seenIdsRef.current.size > 100) {
        const first = seenIdsRef.current.values().next().value;
        if (first) seenIdsRef.current.delete(first);
      }
      if (popupOpenRef.current) return;

      popupOpenRef.current = true;
      const senderMeta = await loadSenderMeta(row);
      setActiveOrder(row);
      setIsOpen(true);

      if (settings.orderNotificationSound !== false) {
        playExternalOrderNotificationSound();
      }

      if (isElectronClient()) {
        const label =
          row.order_data?.delivery_info?.recipientName ||
          row.order_data?.items?.[0]?.name ||
          "새 수주";
        const amount =
          row.fulfillment_amount != null
            ? ` · ${currencySymbol}${Math.round(Number(row.fulfillment_amount)).toLocaleString()}`
            : "";
        void notifyExternalOrderDesktop({
          title: "🌸 회원사 수주 요청",
          body: `${label}${amount}`,
        });
        void wakeUpElectronWindow();
      }

      toast.info(`[회원사 수발주] ${senderMeta.name}으로부터 수주 요청이 도착했습니다.`, {
        duration: 8000,
      });

      window.dispatchEvent(new CustomEvent("refreshPartnerOrdersList"));
    },
    [loadSenderMeta, settings.orderNotificationSound],
  );

  useEffect(() => {
    if (!tenantId) return;

    let isPolling = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let realtimeOk = false;

    const pollPending = async () => {
      if (!tenantId || popupOpenRef.current || isPolling) return;
      isPolling = true;
      try {
        const { data, error } = await supabase
          .from("external_orders")
          .select("*")
          .eq("receiver_tenant_id", tenantId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(3);
        if (error) throw error;
        for (const row of (data || []) as ExternalOrderRecord[]) {
          await notifyIncoming(row);
          if (popupOpenRef.current) break;
        }
      } catch (err) {
        console.warn("[RealtimePartnerOrderListener] 백업 폴링 실패:", err);
      } finally {
        isPolling = false;
      }
    };

    const schedulePoll = () => {
      if (pollTimer) clearTimeout(pollTimer);
      if (realtimeOk) return;
      pollTimer = setTimeout(async () => {
        await pollPending();
        schedulePoll();
      }, ADAPTIVE_POLL_MS.partner.fallback);
    };

    void pollPending();

    const channel = supabase
      .channel(`realtime-partner-orders-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "external_orders",
          filter: `receiver_tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          void notifyIncoming(payload.new as ExternalOrderRecord);
        },
      )
      .subscribe((status) => {
        const wasOk = realtimeOk;
        realtimeOk = isRealtimeSubscribed(status);
        if (wasOk !== realtimeOk) schedulePoll();
      });

    schedulePoll();

    const handleOnline = () => {
      realtimeOk = false;
      void pollPending();
      schedulePoll();
    };
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
      if (pollTimer) clearTimeout(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, [tenantId, supabase, notifyIncoming]);

  const handleAccept = async () => {
    if (!activeOrder || !tenantId) return;
    if (!canReceiveOrders) {
      toast.error("환경설정에서 수주점 등록 후 수주할 수 있습니다.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { printOk } = await acceptPartnerExternalOrder({
        supabase,
        tenantId,
        row: activeOrder,
        senderName: senderName || "발주 매장",
        senderContact,
        senderLogoUrl,
        receiverShopName,
        printOnAccept: true,
      });

      if (printOk) {
        toast.success("수주 수락 완료! 주문서와 인수증 출력을 보냈습니다.");
      } else {
        toast.warning("수주는 수락되었으나 자동 인쇄 전송에 실패했습니다. 수주함에서 재출력하세요.");
      }

      setIsOpen(false);
      popupOpenRef.current = false;
      setActiveOrder(null);
      window.dispatchEvent(new CustomEvent("refreshPartnerOrdersList"));
    } catch (err) {
      console.error("[RealtimePartnerOrderListener] accept", err);
      toast.error("수주 요청을 수락하는 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!activeOrder) return;
    setIsSubmitting(true);
    try {
      await rejectPartnerExternalOrder(supabase, activeOrder.id, activeOrder.origin_order_id);
      toast.success("회원사 수주 요청을 반려했습니다.");
      setIsOpen(false);
      popupOpenRef.current = false;
      setActiveOrder(null);
      window.dispatchEvent(new CustomEvent("refreshPartnerOrdersList"));
    } catch (err) {
      console.error("[RealtimePartnerOrderListener] reject", err);
      toast.error("반려 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeOrder) return null;

  const items = activeOrder.order_data?.items || [];
  const itemLabel =
    items.length > 0
      ? `${items[0].name || "상품"}${items.length > 1 ? ` 외 ${items.length - 1}` : ""}`
      : "—";
  const recipient = activeOrder.order_data?.delivery_info?.recipientName || "—";
  const deliveryWhen = [
    activeOrder.order_data?.delivery_info?.date,
    activeOrder.order_data?.delivery_info?.time,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          popupOpenRef.current = false;
          setActiveOrder(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-[420px] rounded-3xl border-none shadow-2xl p-6 bg-slate-900 text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full -mr-10 -mt-10 pointer-events-none" />

        <DialogHeader className="space-y-3">
          <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-blue-400">
            <Globe className="h-5 w-5 text-blue-400 animate-bounce" />
            회원사 수주 요청!
          </DialogTitle>
          <div className="text-xs text-slate-300 font-light leading-relaxed">
            다른 회원사 꽃집으로부터 제작·배송 위탁 요청이 들어왔습니다.
            <br />
            수락 시 주문서(발주점 정보)와 마스킹된 인수증이 자동 출력됩니다.
          </div>
        </DialogHeader>

        <div className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl space-y-2.5 my-4 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">발주 꽃집:</span>
            <span className="font-semibold text-white">{senderName || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">상품:</span>
            <span className="font-medium text-white truncate max-w-[200px]" title={itemLabel}>
              {itemLabel}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">수령인:</span>
            <span className="font-medium text-white">{recipient}</span>
          </div>
          {deliveryWhen ? (
            <div className="flex justify-between">
              <span className="text-slate-400">배송 희망:</span>
              <span className="font-medium text-white">{deliveryWhen}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-slate-400">수주 금액:</span>
            <span className="font-bold text-blue-300">
              {currencySymbol}{Math.round(Number(activeOrder.fulfillment_amount || 0)).toLocaleString()}
            </span>
          </div>
          {activeOrder.notes ? (
            <div className="border-t border-slate-700/60 pt-2.5 mt-2.5 text-slate-300">
              <span className="text-slate-400 block mb-1">전달사항:</span>
              <p className="bg-slate-900/50 p-2 rounded-lg leading-relaxed text-[11px]">
                {activeOrder.notes}
              </p>
            </div>
          ) : null}
        </div>

        {!canReceiveOrders ? (
          <p className="text-[11px] text-amber-300 mb-2">
            수주점 미등록 매장은 수락할 수 없습니다. 환경설정에서 수주점 등록을 완료하세요.
          </p>
        ) : null}

        <DialogFooter className="grid grid-cols-3 gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleReject()}
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
              setActiveOrder(null);
            }}
            disabled={isSubmitting}
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl h-10 text-xs"
          >
            나중에
          </Button>
          <Button
            type="button"
            onClick={() => void handleAccept()}
            disabled={isSubmitting || !canReceiveOrders}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl h-10 text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20"
          >
            <Printer className="h-3.5 w-3.5" />
            수락 & 인쇄
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
