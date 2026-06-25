"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { toast } from "sonner";
import { isElectronClient } from "@/lib/electron-env";
import { hasUpcomingScheduleOrders } from "@/lib/reminder-schedule-orders";
import { DeliveryPrepReminderDialog } from "./delivery-prep-reminder-dialog";

/**
 * 로그인 → 대시보드 진입 시 픽업/배송 **준비 확인** 리마인드.
 *
 * - 「준비 완료」→ delivery_prep_reminders.last_checked_date = 오늘 → 당일 재표시 없음
 * - 「4시간 후」/ 미확인 → snooze 4시간 → 만료 후 다시 팝업 (1분마다 경량 재검사)
 * - 메인 창: last_checked + count(head)만 — 주문 전체 로드 없음
 */
export function DeliveryPrepReminder() {
  const { user, tenantId, isSuperAdmin } = useAuth();
  const { settings } = useSettings();
  const [lastCheckedDate, setLastCheckedDate] = useState<string | null>(null);
  const [lastCheckedReady, setLastCheckedReady] = useState(false);
  const [webDialogOpen, setWebDialogOpen] = useState(false);
  const popupOpenRef = useRef(false);

  const storeName = settings.siteName || "매장";
  const reminderKey = tenantId || "";

  const isSnoozed = useCallback(() => {
    const snoozedUntil = localStorage.getItem(`reminderSnoozedUntil_${reminderKey}`);
    return !!(snoozedUntil && Date.now() < parseInt(snoozedUntil, 10));
  }, [reminderKey]);

  const openReminder = useCallback(() => {
    if (popupOpenRef.current) return;
    popupOpenRef.current = true;
    localStorage.setItem(`lastReminderPopupTime_${reminderKey}`, Date.now().toString());

    if (isElectronClient()) {
      const api = (window as Window & {
        electronAPI?: { openReminderWindow?: (payload: unknown) => void };
      }).electronAPI;
      api?.openReminderWindow?.({
        user: {
          tenantId,
          storeName,
          email: user?.email,
        },
      });
    } else {
      setWebDialogOpen(true);
    }
  }, [reminderKey, storeName, tenantId, user?.email]);

  const tryShowReminder = useCallback(async () => {
    if (!tenantId || isSuperAdmin || popupOpenRef.current || webDialogOpen) return;

    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (lastCheckedDate === todayStr) return;
    if (isSnoozed()) return;

    try {
      const supabase = createClient();
      const hasUpcoming = await hasUpcomingScheduleOrders(supabase, tenantId);
      if (!hasUpcoming) return;
      openReminder();
    } catch (err) {
      console.warn("[DeliveryPrepReminder] check failed", err);
    }
  }, [tenantId, isSuperAdmin, lastCheckedDate, isSnoozed, openReminder, webDialogOpen]);

  useEffect(() => {
    if (!isElectronClient()) return;

    const api = (window as Window & {
      electronAPI?: {
        onReminderAction?: (cb: (data: {
          action: string;
          date?: string;
          tenantId?: string;
        }) => void) => () => void;
      };
    }).electronAPI;

    if (!api?.onReminderAction) return;

    const cleanup = api.onReminderAction((data) => {
      if (data.tenantId && data.tenantId !== tenantId) return;
      if (data.action === "confirm") {
        if (data.date) setLastCheckedDate(data.date);
        localStorage.removeItem(`reminderSnoozedUntil_${reminderKey}`);
        popupOpenRef.current = false;
        toast.success("배송/픽업 준비 확인이 완료되었습니다.");
      } else if (data.action === "snooze") {
        popupOpenRef.current = false;
        toast.info("4시간 뒤에 다시 알려드릴게요.");
      }
    });

    return cleanup;
  }, [tenantId, reminderKey]);

  useEffect(() => {
    if (!tenantId || isSuperAdmin) return;

    let cancelled = false;

    void createClient()
      .from("delivery_prep_reminders")
      .select("last_checked_date")
      .eq("branch_name", tenantId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.last_checked_date) setLastCheckedDate(data.last_checked_date);
        setLastCheckedReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    if (!tenantId || isSuperAdmin || !lastCheckedReady) return;

    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const run = () => void tryShowReminder();

    const delay = isElectronClient() ? 1500 : undefined;
    if (delay != null) {
      timeoutId = window.setTimeout(run, delay);
    } else if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(run, { timeout: 6000 });
    } else {
      timeoutId = window.setTimeout(run, 3000);
    }

    // 스누즈 4시간 만료 후 같은 세션에서 다시 띄우기 (레퍼런스 1분 재검사 — fetch는 조건 통과 시만)
    const intervalId = window.setInterval(run, 60 * 1000);

    return () => {
      if (idleId != null) window.cancelIdleCallback(idleId);
      if (timeoutId != null) window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [tenantId, isSuperAdmin, lastCheckedReady, tryShowReminder]);

  if (!tenantId || isSuperAdmin) return null;

  return (
    <>
      {!isElectronClient() ? (
        <DeliveryPrepReminderDialog
          open={webDialogOpen}
          onOpenChange={(open) => {
            setWebDialogOpen(open);
            if (!open) popupOpenRef.current = false;
          }}
          tenantId={tenantId}
          storeName={storeName}
          onConfirmed={(dateYmd) => {
            setLastCheckedDate(dateYmd);
            localStorage.removeItem(`reminderSnoozedUntil_${reminderKey}`);
            popupOpenRef.current = false;
          }}
          onSnoozed={() => {
            popupOpenRef.current = false;
          }}
        />
      ) : null}
    </>
  );
}
