"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { isElectronClient } from "@/lib/electron-env";
import {
  notifyExternalOrderDesktop,
  wakeUpElectronWindow,
} from "@/lib/electron-desktop-api";
import { playExternalOrderNotificationSound } from "@/lib/notification-sound";

/**
 * 테넌트 간 수주(external_orders) Realtime 알림.
 * 사운드 + Electron 트레이 배지 + OS 알림.
 */
export function ExternalOrdersAlertProvider() {
  const { tenantId } = useAuth();
  const { settings } = useSettings();
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tenantId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`external-orders-alert-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "external_orders",
          filter: `receiver_tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            status?: string;
            total_amount?: number;
            order_data?: { recipientName?: string; storeName?: string };
          };
          if (!row?.id || seenIdsRef.current.has(row.id)) return;
          seenIdsRef.current.add(row.id);
          if (seenIdsRef.current.size > 200) {
            const first = seenIdsRef.current.values().next().value;
            if (first) seenIdsRef.current.delete(first);
          }

          if (row.status && row.status !== "pending") return;

          const label =
            row.order_data?.recipientName ||
            row.order_data?.storeName ||
            "새 수주";
          const amount =
            row.total_amount != null
              ? ` · ₩${Math.round(Number(row.total_amount)).toLocaleString()}`
              : "";
          const description = `${label}${amount}`;

          if (settings.orderNotificationSound !== false) {
            playExternalOrderNotificationSound();
          }

          if (isElectronClient()) {
            void notifyExternalOrderDesktop({
              title: "🌸 새 네트워크 수주",
              body: description,
            });
            void wakeUpElectronWindow();
          }

          toast("🌸 새 네트워크 수주", {
            description,
            duration: 12000,
            action: {
              label: "확인",
              onClick: () => {
                window.location.href = "/dashboard/external-orders/received";
              },
            },
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, settings.orderNotificationSound]);

  return null;
}
