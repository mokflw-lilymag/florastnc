"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { useSettings } from "@/hooks/use-settings";
import { usePartnerTouchUi } from "@/hooks/use-partner-touch-ui";
import { getWeatherEmoji, getWeatherInfo } from "@/lib/weather-service";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/order";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

const TICKER_NAME_CAP = 8;

type TickerItem = {
  text: string;
  /** 본사 공지 — 전광판에서 색·깜빡임 강조 */
  emphasis?: "hq";
};

type TickerL = (ko: string, en: string, vi?: string) => string;

function formatDeliveryTicker(o: Order, L: TickerL): string {
  const t = o.delivery_info?.time?.trim() || L("시간미정", "Time TBD", "Chưa rõ giờ");
  const name = o.delivery_info?.recipientName?.trim() || o.orderer?.name?.trim() || L("미입력", "Not set", "Chưa nhập");
  return L(`${t} 수령 ${name}`, `${t} · To ${name}`, `${t} · Nhận ${name}`);
}

function formatPickupTicker(o: Order, L: TickerL): string {
  const t = o.pickup_info?.time?.trim() || L("시간미정", "Time TBD", "Chưa rõ giờ");
  const name = o.pickup_info?.pickerName?.trim() || o.orderer?.name?.trim() || L("미입력", "Not set", "Chưa nhập");
  return L(`${t} 픽업 ${name}`, `${t} · Pickup ${name}`, `${t} · Lấy hàng ${name}`);
}

function sortByScheduleTime(
  a: Order,
  b: Order,
  kind: "delivery" | "pickup",
  collationLocale: string
): number {
  const ta = kind === "delivery" ? a.delivery_info?.time ?? "" : a.pickup_info?.time ?? "";
  const tb = kind === "delivery" ? b.delivery_info?.time ?? "" : b.pickup_info?.time ?? "";
  return ta.localeCompare(tb, collationLocale, { numeric: true });
}

function listWithCap(orders: Order[], fmt: (o: Order) => string, cap: number, L: TickerL): string {
  if (orders.length === 0) return L("없음", "None", "Không có");
  const head = orders.slice(0, cap).map(fmt).join(" · ");
  const n = orders.length - cap;
  const more =
    orders.length > cap
      ? L(` · 외 ${n}건`, ` · +${n} more`, ` · +${n}`)
      : "";
  return head + more;
}

/** 메인 대시보드(`/dashboard`)에만 마운트합니다. */
export function DashboardTicker() {
  const { tenantId, isSuperAdmin } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const { orders } = useOrders();
  const touchUi = usePartnerTouchUi();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const [weatherLine, setWeatherLine] = useState(() =>
    pickUiText(baseLocale, "🌤️ 날씨 불러오는 중…", "🌤️ Loading weather…", "🌤️ Đang tải thời tiết…")
  );

  useEffect(() => {
    const b = toBaseLocale(locale);
    const loc = (ko: string, en: string, vi?: string) => pickUiText(b, ko, en, vi);
    setWeatherLine(loc("🌤️ 날씨 불러오는 중…", "🌤️ Loading weather…", "🌤️ Đang tải thời tiết…"));
    const run = (lat?: number, lon?: number) => {
      getWeatherInfo(lat, lon).then((w) => {
        if (w) {
          const emoji = getWeatherEmoji(w.icon);
          setWeatherLine(
            loc(
              `${emoji} ${w.description}, 최저 ${w.minTemperature}° / 최고 ${w.maxTemperature}°`,
              `${emoji} ${w.description}, low ${w.minTemperature}° / high ${w.maxTemperature}°`,
              `${emoji} ${w.description}, thấp ${w.minTemperature}° / cao ${w.maxTemperature}°`
            )
          );
        } else {
          setWeatherLine(loc("날씨 정보를 가져올 수 없습니다", "Couldn’t load weather.", "Không tải được thời tiết."));
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
  }, [locale]);

  const segments = useMemo((): TickerItem[] => {
    const L = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);
    const dateLine = format(new Date(), "PPPP", { locale: dfLoc });
    const base: TickerItem[] = [{ text: dateLine }, { text: weatherLine }];

    const todayDel = orders
      .filter(
        (o) =>
          o.status !== "canceled" &&
          o.receipt_type === "delivery_reservation" &&
          o.delivery_info?.date &&
          isToday(new Date(o.delivery_info.date))
      )
      .sort((a, b) => sortByScheduleTime(a, b, "delivery", baseLocale));
    const tomorrowDel = orders
      .filter(
        (o) =>
          o.status !== "canceled" &&
          o.receipt_type === "delivery_reservation" &&
          o.delivery_info?.date &&
          isTomorrow(new Date(o.delivery_info.date))
      )
      .sort((a, b) => sortByScheduleTime(a, b, "delivery", baseLocale));
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
      .sort((a, b) => sortByScheduleTime(a, b, "pickup", baseLocale));
    const tomorrowPu = orders
      .filter(
        (o) =>
          o.status !== "canceled" &&
          (o.receipt_type === "pickup_reservation" || o.receipt_type === "store_pickup") &&
          o.pickup_info?.date &&
          isTomorrow(new Date(o.pickup_info.date))
      )
      .sort((a, b) => sortByScheduleTime(a, b, "pickup", baseLocale));
    const pd = todayPu.length;
    const pm = tomorrowPu.length;

    const todayDelStr = listWithCap(
      todayDel,
      (o) => formatDeliveryTicker(o, L),
      TICKER_NAME_CAP,
      L
    );
    const tomorrowDelStr = listWithCap(
      tomorrowDel,
      (o) => formatDeliveryTicker(o, L),
      TICKER_NAME_CAP,
      L
    );
    base.push({
      text: L(
        `배송 예약 오늘/내일 ${td}건/${tm}건 — 오늘: ${todayDelStr} | 내일: ${tomorrowDelStr}`,
        `Delivery (today/tomorrow) ${td}/${tm} — Today: ${todayDelStr} | Tomorrow: ${tomorrowDelStr}`,
        `Giao (hôm nay/mai) ${td}/${tm} — Hôm nay: ${todayDelStr} | Mai: ${tomorrowDelStr}`
      ),
    });

    const todayPuStr = listWithCap(
      todayPu,
      (o) => formatPickupTicker(o, L),
      TICKER_NAME_CAP,
      L
    );
    const tomorrowPuStr = listWithCap(
      tomorrowPu,
      (o) => formatPickupTicker(o, L),
      TICKER_NAME_CAP,
      L
    );
    base.push({
      text: L(
        `픽업·매장 오늘/내일 ${pd}건/${pm}건 — 오늘: ${todayPuStr} | 내일: ${tomorrowPuStr}`,
        `Pickup / in-store (today/tomorrow) ${pd}/${pm} — Today: ${todayPuStr} | Tomorrow: ${tomorrowPuStr}`,
        `Lấy tại cửa (hôm nay/mai) ${pd}/${pm} — Hôm nay: ${todayPuStr} | Mai: ${tomorrowPuStr}`
      ),
    });

    return base.filter((x) => x.text);
  }, [orders, weatherLine, baseLocale, dfLoc]);

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
        const b = toBaseLocale(locale);
        const L = (ko: string, en: string, vi?: string) => pickUiText(b, ko, en, vi);
        const items: TickerItem[] = anns.slice(0, 4).map((a) => {
          const urgent =
            a.priority === "high" ? L(" · 중요", " · Important", " · Quan trọng") : "";
          const prefix = isSuperAdmin
            ? L("【본사 게시】", "[HQ post]", "[Bài HQ]")
            : L("【새 공지】", "[New notice]", "[Thông báo mới]");
          return {
            text: `${prefix} ${a.title}${urgent}`,
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
      aria-label={pickUiText(baseLocale, "대시보드 전광판", "Dashboard ticker")}
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
