"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { useSettings } from "@/hooks/use-settings";
import { usePartnerTouchUi } from "@/hooks/use-partner-touch-ui";
import { getWeatherEmoji, getWeatherInfo } from "@/lib/weather-service";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/order";

const TICKER_NAME_CAP = 8;

type TickerItem = {
  text: string;
  /** 본사 공지 — 전광판에서 색·깜빡임 강조 */
  emphasis?: "hq";
};

function formatDeliveryTicker(o: Order): string {
  const t = o.delivery_info?.time?.trim() || "시간미정";
  const name = o.delivery_info?.recipientName?.trim() || o.orderer?.name?.trim() || "미입력";
  return `${t} 수령 ${name}`;
}

function formatPickupTicker(o: Order): string {
  const t = o.pickup_info?.time?.trim() || "시간미정";
  const name = o.pickup_info?.pickerName?.trim() || o.orderer?.name?.trim() || "미입력";
  return `${t} 픽업 ${name}`;
}

function sortByScheduleTime(a: Order, b: Order, kind: "delivery" | "pickup"): number {
  const ta = kind === "delivery" ? a.delivery_info?.time ?? "" : a.pickup_info?.time ?? "";
  const tb = kind === "delivery" ? b.delivery_info?.time ?? "" : b.pickup_info?.time ?? "";
  return ta.localeCompare(tb, "ko", { numeric: true });
}

function listWithCap(orders: Order[], fmt: (o: Order) => string, cap: number): string {
  if (orders.length === 0) return "없음";
  const head = orders.slice(0, cap).map(fmt).join(" · ");
  const more = orders.length > cap ? ` · 외 ${orders.length - cap}건` : "";
  return head + more;
}

/** 메인 대시보드(`/dashboard`)에만 마운트합니다. */
export function DashboardTicker() {
  const { tenantId, isSuperAdmin } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const { orders } = useOrders();
  const touchUi = usePartnerTouchUi();
  const [weatherLine, setWeatherLine] = useState("🌤️ 날씨 불러오는 중…");

  useEffect(() => {
    const run = (lat?: number, lon?: number) => {
      getWeatherInfo(lat, lon).then((w) => {
        if (w) {
          const emoji = getWeatherEmoji(w.icon);
          setWeatherLine(
            `${emoji} ${w.description}, 최저 ${w.minTemperature}° / 최고 ${w.maxTemperature}°`
          );
        } else {
          setWeatherLine("날씨 정보를 가져올 수 없습니다");
        }
      });
    };
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => run(p.coords.latitude, p.coords.longitude),
        () => run()
      );
    } else {
      run();
    }
  }, []);

  const segments = useMemo((): TickerItem[] => {
    const dateLine = format(new Date(), "M월 d일 EEEE", { locale: ko });
    const base: TickerItem[] = [{ text: dateLine }, { text: weatherLine }];

    const todayDel = orders
      .filter(
        (o) =>
          o.status !== "canceled" &&
          o.receipt_type === "delivery_reservation" &&
          o.delivery_info?.date &&
          isToday(new Date(o.delivery_info.date))
      )
      .sort((a, b) => sortByScheduleTime(a, b, "delivery"));
    const tomorrowDel = orders
      .filter(
        (o) =>
          o.status !== "canceled" &&
          o.receipt_type === "delivery_reservation" &&
          o.delivery_info?.date &&
          isTomorrow(new Date(o.delivery_info.date))
      )
      .sort((a, b) => sortByScheduleTime(a, b, "delivery"));
    const td = todayDel.length;
    const tm = tomorrowDel.length;

    const todayPu = orders
      .filter(
        (o) =>
          o.status !== "canceled" &&
          (o.receipt_type === "pickup_reservation" || o.receipt_type === "store_pickup") &&
          o.pickup_info?.date &&
          isToday(new Date(o.pickup_info.date))
      )
      .sort((a, b) => sortByScheduleTime(a, b, "pickup"));
    const tomorrowPu = orders
      .filter(
        (o) =>
          o.status !== "canceled" &&
          (o.receipt_type === "pickup_reservation" || o.receipt_type === "store_pickup") &&
          o.pickup_info?.date &&
          isTomorrow(new Date(o.pickup_info.date))
      )
      .sort((a, b) => sortByScheduleTime(a, b, "pickup"));
    const pd = todayPu.length;
    const pm = tomorrowPu.length;

    base.push({
      text: `배송 예약 오늘/내일 ${td}건/${tm}건 — 오늘: ${listWithCap(todayDel, formatDeliveryTicker, TICKER_NAME_CAP)} | 내일: ${listWithCap(tomorrowDel, formatDeliveryTicker, TICKER_NAME_CAP)}`,
    });
    base.push({
      text: `픽업·매장 오늘/내일 ${pd}건/${pm}건 — 오늘: ${listWithCap(todayPu, formatPickupTicker, TICKER_NAME_CAP)} | 내일: ${listWithCap(tomorrowPu, formatPickupTicker, TICKER_NAME_CAP)}`,
    });

    return base.filter((x) => x.text);
  }, [orders, weatherLine]);

  const [hqItems, setHqItems] = useState<TickerItem[]>([]);

  const tickerEnabled = settings.hideDashboardTicker !== true;

  useEffect(() => {
    if (!tenantId || !tickerEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const q = isSuperAdmin ? "" : "?branchOnly=1";
        const res = await fetch(`/api/hq/announcements${q}`, { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        const anns = (json.announcements ?? []) as { title: string; priority?: string }[];
        const items: TickerItem[] = anns.slice(0, 4).map((a) => {
          const urgent = a.priority === "high" ? " · 중요" : "";
          const label = isSuperAdmin ? "본사 게시" : "새 공지";
          return {
            text: `【${label}】 ${a.title}${urgent}`,
            emphasis: "hq",
          };
        });
        if (!cancelled) setHqItems(items);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, tickerEnabled, isSuperAdmin]);

  /** 본사 공지를 앞쪽에 두어 전광판에서 먼저 지나가게 함 */
  const boardData = useMemo(() => [...hqItems, ...segments], [segments, hqItems]);

  if (!tenantId || settingsLoading || !tickerEnabled) {
    return null;
  }

  const durationSec = Math.max(40, boardData.length * 10);

  const segment = (keyPrefix: string) =>
    boardData.map((item, i) => (
      <span key={`${keyPrefix}-${i}`} className="flex flex-row items-center shrink-0">
        <span
          className={cn(
            "whitespace-nowrap px-5 font-bold drop-shadow-sm",
            touchUi ? "text-sm" : "text-base md:text-lg",
            item.emphasis === "hq"
              ? "text-[#fffbeb] font-extrabold tracking-tight animate-hq-ticker-blink md:text-xl"
              : "text-white"
          )}
        >
          {item.text}
        </span>
        <span className="text-white/35 select-none px-1" aria-hidden>
          ·
        </span>
      </span>
    ));

  return (
    <div
      className={cn(
        "mb-4 w-full overflow-hidden rounded-xl shadow-md relative",
        "bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700",
        touchUi ? "h-14" : "h-16"
      )}
      aria-label="대시보드 전광판"
    >
      <div className="absolute inset-0 bg-black/15 pointer-events-none z-[1]" />
      <div className="absolute inset-0 flex items-center overflow-hidden z-0">
        <div
          className="flex flex-row flex-nowrap items-center w-max min-h-full animate-dashboard-ticker will-change-transform"
          style={{ animationDuration: `${durationSec}s` }}
        >
          <div className="flex flex-row flex-nowrap items-center shrink-0">{segment("a")}</div>
          <div className="flex flex-row flex-nowrap items-center shrink-0" aria-hidden>
            {segment("b")}
          </div>
        </div>
      </div>
    </div>
  );
}
