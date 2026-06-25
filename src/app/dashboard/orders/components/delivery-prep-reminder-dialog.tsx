"use client";

import { useEffect, useState } from "react";
import { format, addDays } from "date-fns";
import { BellRing, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchUpcomingScheduleOrders, getScheduleDate } from "@/lib/reminder-schedule-orders";
import { playFixedCostReminderSound } from "@/lib/notification-sound";
import type { Order } from "@/types/order";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  storeName: string;
  onConfirmed: (dateYmd: string) => void;
  onSnoozed: () => void;
};

function getScheduleTime(order: Order, isDelivery: boolean): string {
  if (isDelivery) return order.delivery_info?.time || "";
  return order.pickup_info?.time || "";
}

/** 웹 전용 — 열릴 때만 경량 schedule 쿼리 (메인 레이아웃과 분리) */
export function DeliveryPrepReminderDialog({
  open,
  onOpenChange,
  tenantId,
  storeName,
  onConfirmed,
  onSnoozed,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!open || !tenantId) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const supabase = createClient();
        const rows = await fetchUpcomingScheduleOrders(supabase, tenantId);
        if (cancelled) return;
        setOrders(rows);
        if (rows.length > 0) playFixedCostReminderSound();
      } catch (err) {
        console.warn("[DeliveryPrepReminderDialog] load failed", err);
        if (!cancelled) toast.error("예약 일정을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, tenantId]);

  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const tomorrowCount = orders.filter((o) => getScheduleDate(o) === tomorrowStr).length;

  const handleConfirm = async () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("delivery_prep_reminders").upsert({
        branch_name: tenantId,
        last_checked_date: todayStr,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      onConfirmed(todayStr);
      onOpenChange(false);
      toast.success("배송/픽업 준비 확인이 완료되었습니다.");
    } catch (err) {
      console.warn("[DeliveryPrepReminderDialog] confirm failed", err);
      toast.error("저장 중 문제가 발생했습니다.");
    }
  };

  const handleSnooze = () => {
    const snoozeTime = Date.now() + 4 * 60 * 60 * 1000;
    localStorage.setItem(`reminderSnoozedUntil_${tenantId}`, snoozeTime.toString());
    localStorage.setItem(`lastReminderPopupTime_${tenantId}`, Date.now().toString());
    onSnoozed();
    onOpenChange(false);
    toast.info("4시간 뒤에 다시 알려드릴게요.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BellRing className="h-5 w-5 text-orange-500" />
            픽업/배송 준비 확인
          </DialogTitle>
          <DialogDescription>
            {storeName} · 예약 일정을 확인하고 준비 여부를 체크해 주세요
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2">
          <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50/80 p-3">
            <CalendarClock className="h-8 w-8 shrink-0 text-orange-600" />
            <div className="text-sm">
              {loading ? (
                <span className="text-muted-foreground">일정 불러오는 중…</span>
              ) : (
                <>
                  <span className="font-semibold text-slate-900">
                    향후 예약 <span className="text-orange-600">{orders.length}건</span>
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    내일 {tomorrowCount}건
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[min(50vh,360px)] px-6">
          <div className="flex flex-col gap-2 pb-4">
            {!loading && orders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                예정된 픽업/배송이 없습니다.
              </p>
            ) : (
              orders.map((order) => {
                const isDelivery = order.receipt_type === "delivery_reservation";
                const date = getScheduleDate(order);
                const time = getScheduleTime(order, isDelivery);
                const itemName =
                  order.items && order.items.length > 0
                    ? order.items.length > 1
                      ? `${order.items[0].name} 외 ${order.items.length - 1}건`
                      : order.items[0].name
                    : "상품 정보 없음";
                const isTomorrow = date === tomorrowStr;

                return (
                  <Card key={order.id} className="p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className={`font-bold ${isTomorrow ? "text-orange-600" : ""}`}>
                        {date} {time || "시간 미지정"}
                        {isTomorrow ? " · 내일" : ""}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-bold ${
                          isDelivery ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {isDelivery ? "배송" : "픽업"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold">{itemName}</p>
                    <p className="text-xs text-muted-foreground">{order.orderer?.name || "주문자"}</p>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-between">
          <Button type="button" variant="ghost" onClick={handleSnooze}>
            아직 준비 안 됨 · 4시간 후
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={loading}>
            준비 완료
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
