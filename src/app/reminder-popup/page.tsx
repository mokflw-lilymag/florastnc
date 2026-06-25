"use client";

import React, { useEffect, useState } from "react";
import { format, addDays } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { BellRing, CalendarClock, MessageSquare, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { launchKakaotalkMessage } from "@/lib/kakaotalk-helper";
import {
  loadTenantMessageTemplates,
  renderAnniversaryMessageWithTemplate,
  type MessageTemplates,
} from "@/lib/revenue/template-service";
import type { Order } from "@/types/order";
import { toast } from "sonner";
import { fetchUpcomingScheduleOrders, getScheduleDate } from "@/lib/reminder-schedule-orders";

type ReminderUser = {
  tenantId: string;
  storeName?: string;
  email?: string;
};

type MarketingItem = {
  customer: { id: string; name: string; contact: string };
  timing: string;
  timingLabel: string;
  anniversaryName: string;
};

const playReminderSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gainNode.gain.setValueAtTime(0.12, start);
      gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = audioCtx.currentTime;
    playTone(523.25, now, 0.35);
    playTone(659.25, now + 0.12, 0.45);
  } catch (err) {
    console.warn("Failed to play notification sound", err);
  }
};

function getShortAddress(fullAddress: string) {
  if (!fullAddress) return "";
  const parts = fullAddress.split(/\s+/);
  let mainIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (
      part.endsWith("로") ||
      part.endsWith("길") ||
      part.endsWith("동") ||
      part.endsWith("읍") ||
      part.endsWith("면")
    ) {
      mainIndex = i;
      break;
    }
  }
  if (mainIndex !== -1) {
    return parts.slice(mainIndex, mainIndex + 3).join(" ");
  }
  return fullAddress.length > 20 ? `${fullAddress.substring(0, 20)}...` : fullAddress;
}

function getScheduleTime(order: Order, isDelivery: boolean): string {
  if (isDelivery) return order.delivery_info?.time || "";
  return order.pickup_info?.time || "";
}

export default function ReminderPopupPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tomorrowCount, setTomorrowCount] = useState(0);
  const [user, setUser] = useState<ReminderUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"reminder" | "marketing">("reminder");
  const [marketingCustomers, setMarketingCustomers] = useState<MarketingItem[]>([]);
  const [loadingMarketing, setLoadingMarketing] = useState(false);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplates>({});

  const loadMarketingData = async (tenantId: string, shopName: string) => {
    setLoadingMarketing(true);
    const supabase = createClient();
    try {
      const templates = await loadTenantMessageTemplates(supabase, tenantId);
      setMessageTemplates(templates);

      const today = new Date();
      const todayMMDD = format(today, "MM-dd");
      const d7MMDD = format(addDays(today, 7), "MM-dd");
      const list: MarketingItem[] = [];

      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, contact, order_count, created_at, marketing_consent")
        .eq("tenant_id", tenantId)
        .eq("is_deleted", false);

      const { data: anniversaries } = await supabase
        .from("customer_anniversaries")
        .select("customer_id, label, anniversary_date, recurring_yearly")
        .eq("tenant_id", tenantId);

      const anniByCustomer = new Map<string, typeof anniversaries>();
      for (const row of anniversaries || []) {
        const arr = anniByCustomer.get(row.customer_id) || [];
        arr.push(row);
        anniByCustomer.set(row.customer_id, arr);
      }

      for (const c of customers || []) {
        const customerAnni = anniByCustomer.get(c.id) || [];
        for (const anni of customerAnni) {
          if (!anni.anniversary_date) continue;
          const parts = anni.anniversary_date.split("-");
          const mmdd =
            parts.length >= 3
              ? `${parts[1]}-${parts[2]}`
              : parts.length >= 2
                ? `${parts[parts.length - 2]}-${parts[parts.length - 1]}`
                : "";
          if (!mmdd) continue;

          if (mmdd === todayMMDD) {
            list.push({
              customer: c,
              timing: "day_of",
              timingLabel: "오늘 기념일",
              anniversaryName: anni.label || "기념일",
            });
          } else if (mmdd === d7MMDD) {
            list.push({
              customer: c,
              timing: "days_before_7",
              timingLabel: "D-7 리마인더",
              anniversaryName: anni.label || "기념일",
            });
          }
        }

        if (c.order_count === 1) {
          const createdAtDate = new Date(c.created_at);
          const diffDays = Math.ceil(
            Math.abs(today.getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (diffDays <= 3) {
            list.push({
              customer: c,
              timing: "first_purchase",
              timingLabel: "신규 첫 구매 감사",
              anniversaryName: "첫 구매",
            });
          }
        }
      }

      setMarketingCustomers(list);
      void shopName;
    } catch (err) {
      console.error("Failed to load marketing data", err);
    } finally {
      setLoadingMarketing(false);
    }
  };

  useEffect(() => {
    const loadReminderData = async () => {
      try {
        const electronAPI = (window as Window & {
          electronAPI?: { getReminderData?: () => Promise<{ orders?: Order[]; user?: ReminderUser }> };
        }).electronAPI;

        if (!electronAPI?.getReminderData) {
          setLoading(false);
          return;
        }

        const data = await electronAPI.getReminderData();
        const reminderUser = data?.user || null;
        setUser(reminderUser);

        let orderList = data?.orders || [];

        if (reminderUser?.tenantId && orderList.length === 0) {
          const supabase = createClient();
          orderList = await fetchUpcomingScheduleOrders(supabase, reminderUser.tenantId);
        }

        setOrders(orderList);

        const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
        const tomorrowOrdersCount = orderList.filter((o) => getScheduleDate(o) === tomorrowStr).length;
        setTomorrowCount(tomorrowOrdersCount);

        if (reminderUser?.tenantId) {
          await loadMarketingData(reminderUser.tenantId, reminderUser.storeName || "매장");
        }

        if (orderList.length > 0) playReminderSound();
      } catch (err) {
        console.error("Failed to load reminder data in sub-window", err);
      } finally {
        setLoading(false);
      }
    };

    void loadReminderData();
  }, []);

  useEffect(() => {
    if (loading || orders.length === 0) return;
    const intervalId = setInterval(() => playReminderSound(), 3500);
    return () => clearInterval(intervalId);
  }, [loading, orders.length]);

  const handleSendMarketing = async (item: MarketingItem) => {
    if (!user?.tenantId) return;

    let message = "";
    if (item.timing === "first_purchase") {
      message = `${item.customer.name} 고객님, 첫 주문 감사드립니다. ${user.storeName || "꽃집"} 드림`;
    } else {
      message = renderAnniversaryMessageWithTemplate(messageTemplates, {
        customerName: item.customer.name,
        label: item.anniversaryName,
        eventDateYmd: format(new Date(), "yyyy-MM-dd"),
        shopName: user.storeName || "꽃집",
      });
    }

    const res = await launchKakaotalkMessage(item.customer.contact, message, item.customer.name);
    if (res.success) {
      toast.success(`${item.customer.name} 고객님 — 클립보드에 복사되었습니다. 카카오톡에서 붙여넣기 하세요.`);
    } else {
      toast.error("카카오톡 실행에 실패했습니다.");
    }
  };

  const handleConfirm = async () => {
    if (!user?.tenantId) return;

    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const supabase = createClient();
      const { error } = await supabase.from("delivery_prep_reminders").upsert({
        branch_name: user.tenantId,
        last_checked_date: todayStr,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      localStorage.removeItem(`reminderSnoozedUntil_${user.tenantId}`);

      const electronAPI = (window as Window & {
        electronAPI?: {
          sendReminderAction?: (data: unknown) => void;
          closeReminderWindow?: () => void;
        };
      }).electronAPI;

      electronAPI?.sendReminderAction?.({
        action: "confirm",
        date: todayStr,
        tenantId: user.tenantId,
      });
      electronAPI?.closeReminderWindow?.();
    } catch (err) {
      console.error("Failed to update reminder status", err);
      toast.error("상태 저장 중 문제가 발생했습니다.");
    }
  };

  const handleSnooze = () => {
    if (!user?.tenantId) return;

    const snoozeTime = Date.now() + 4 * 60 * 60 * 1000;
    localStorage.setItem(`reminderSnoozedUntil_${user.tenantId}`, snoozeTime.toString());

    const electronAPI = (window as Window & {
      electronAPI?: {
        sendReminderAction?: (data: unknown) => void;
        closeReminderWindow?: () => void;
      };
    }).electronAPI;

    electronAPI?.sendReminderAction?.({
      action: "snooze",
      until: snoozeTime,
      tenantId: user.tenantId,
    });
    electronAPI?.closeReminderWindow?.();
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <span className="text-sm font-medium text-slate-400">데이터를 로드하는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 p-6 text-slate-100 select-none">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500">
            <BellRing className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">배송/픽업 준비 · 스마트 마케팅</h1>
            <p className="text-xs text-slate-400">{user?.storeName || "매장"}</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-800/80 my-3">
        <button
          type="button"
          onClick={() => setActiveTab("reminder")}
          className={`flex-1 pb-2.5 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "reminder"
              ? "border-orange-500 text-orange-500"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <CalendarClock className="h-4 w-4" />
          배송/픽업 준비 ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("marketing")}
          className={`flex-1 pb-2.5 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "marketing"
              ? "border-orange-500 text-orange-500"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          고객 마케팅 ({loadingMarketing ? "…" : marketingCustomers.length})
        </button>
      </div>

      {activeTab === "reminder" ? (
        <>
          <div className="mb-3 flex items-center gap-4 bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
            <CalendarClock className="h-10 w-10 text-orange-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-200">
                향후 예정된 예약이{" "}
                <span className="text-orange-500 text-base font-bold">{orders.length}건</span> 있습니다.
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                내일 예정: <span className="font-bold text-orange-400">{tomorrowCount}건</span>
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-slate-900/40 border border-slate-800 rounded-xl p-3 overflow-y-auto flex flex-col gap-2.5">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <p className="text-sm">현재 예정된 배송/픽업 주문이 없습니다.</p>
              </div>
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

                const phoneRaw = order.orderer?.contact || "";
                const phoneDigits = phoneRaw.replace(/[^0-9]/g, "");
                const last4Digits = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : "";
                const ordererDisplay = order.orderer?.name
                  ? `${order.orderer.name}${last4Digits ? ` (${last4Digits})` : ""}`
                  : "주문자명 없음";

                const recipientName = isDelivery
                  ? order.delivery_info?.recipientName
                  : order.pickup_info?.pickerName || order.orderer?.name || "";
                const fullAddress = isDelivery ? order.delivery_info?.address || "" : "";
                const shortAddress = fullAddress ? getShortAddress(fullAddress) : "";

                const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
                const isTomorrow = date === tomorrowStr;

                let formattedDate = date || "";
                try {
                  if (date) formattedDate = format(new Date(date), "MM.dd");
                } catch {
                  /* keep raw */
                }

                return (
                  <Card
                    key={order.id}
                    className="bg-slate-900 border-slate-800/80 p-3.5 flex flex-col gap-2 rounded-lg hover:border-slate-700 transition"
                  >
                    <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold ${isTomorrow ? "text-orange-400" : "text-slate-300"}`}
                        >
                          {formattedDate} {time || "시간 미지정"}
                        </span>
                        {isTomorrow ? (
                          <span className="text-[10px] bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full font-bold">
                            내일
                          </span>
                        ) : null}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isDelivery
                            ? "bg-blue-500/15 text-blue-400"
                            : "bg-emerald-500/15 text-emerald-400"
                        }`}
                      >
                        {isDelivery ? "배송" : "픽업"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-extrabold text-white text-[16px] leading-tight shrink-0">
                          {itemName}
                        </span>
                        <span className="text-slate-400 text-xs font-medium">{ordererDisplay}</span>
                      </div>
                      {recipientName ? (
                        <div className="flex items-baseline gap-1 flex-wrap">
                          <span className="text-[11px] text-slate-500 shrink-0">수령</span>
                          <span className="font-bold text-white text-[13px]">{recipientName}</span>
                          {isDelivery && shortAddress ? (
                            <span className="text-slate-400 font-medium text-[12px] truncate ml-0.5">
                              ({shortAddress})
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
            <Sparkles className="h-10 w-10 text-yellow-500 shrink-0 animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-slate-200">
                오늘 마케팅 대상{" "}
                <span className="text-yellow-500 text-base font-bold">{marketingCustomers.length}명</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                클릭 시 클립보드 복사 및 PC 카카오톡 친구추가로 이동합니다.
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-slate-900/40 border border-slate-800 rounded-xl p-3 overflow-y-auto flex flex-col gap-2.5">
            {marketingCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <p className="text-sm">오늘 마케팅 권유 대상 고객이 없습니다.</p>
              </div>
            ) : (
              marketingCustomers.map((item, idx) => {
                const badgeColors =
                  item.timing === "day_of"
                    ? "bg-rose-500/15 text-rose-400"
                    : item.timing === "days_before_7"
                      ? "bg-blue-500/15 text-blue-400"
                      : "bg-emerald-500/15 text-emerald-400";

                return (
                  <Card
                    key={`${item.customer.id}-${idx}`}
                    className="bg-slate-900 border-slate-800/80 p-3.5 flex justify-between items-center rounded-lg hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-[15px]">{item.customer.name}</span>
                        <span className="text-slate-400 text-xs font-medium">{item.customer.contact}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColors}`}>
                          {item.timingLabel}
                        </span>
                        <span className="text-xs text-slate-400">구분: {item.anniversaryName}</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => void handleSendMarketing(item)}
                      className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold text-xs h-9 px-3 gap-1 rounded-lg flex items-center transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      카톡 전송
                    </Button>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}

      <div className="pt-4 border-t border-slate-800 mt-4 flex flex-col gap-2">
        <p className="text-xs text-slate-400 text-center leading-relaxed mb-1">
          예약 일정을 확인한 뒤, 준비가 끝났으면 완료 · 아직이면 4시간 후 다시 알려드립니다.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSnooze}
            className="flex-1 bg-slate-900 hover:bg-slate-800 border-slate-800 hover:text-white font-medium text-slate-300 h-11"
          >
            아직 준비 안 됨 · 4시간 후
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold h-11 transition"
          >
            준비 완료
          </Button>
        </div>
      </div>
    </div>
  );
}
