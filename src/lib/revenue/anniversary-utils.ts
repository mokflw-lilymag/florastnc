/** KST 기준 YYYY-MM-DD */
export function toKstYmd(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

export function monthDayFromYmd(ymd: string): { month: number; day: number } {
  const parts = ymd.slice(0, 10).split("-").map(Number);
  return { month: parts[1], day: parts[2] };
}

/** D-7: runAt(알림일) + 7일 = 기념일 month-day 와 매칭 */
export function anniversaryMatchesD7(
  anniversaryDate: string,
  runAt: Date,
  recurringYearly = true
): boolean {
  const runYmd = toKstYmd(runAt);
  const eventYmd = addDaysToYmd(runYmd, 7);

  if (!recurringYearly) {
    return anniversaryDate.slice(0, 10) === eventYmd;
  }

  const target = monthDayFromYmd(eventYmd);
  const ann = monthDayFromYmd(anniversaryDate);
  return target.month === ann.month && target.day === ann.day;
}

export const DEFAULT_ANNIVERSARY_EXPECTED_KRW = 80_000;

export function buildAnniversaryOrderLink(
  appUrl: string,
  customerId: string,
  campaignCode: string
): string {
  const base = appUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    customerId,
    utm_source: "floxync",
    utm_medium: "anniversary_d7",
    utm_campaign: campaignCode,
  });
  return `${base}/dashboard/orders/new?${params.toString()}`;
}

export function renderAnniversaryMessage(params: {
  customerName: string;
  label: string;
  eventDateYmd: string;
  shopName?: string;
  orderLink?: string;
}): string {
  const shop = params.shopName ?? "꽃집";
  const link = params.orderLink ? `\n\n▶ 1클릭 주문: ${params.orderLink}` : "";
  return (
    `[${shop}] 기념일 안내 🌸\n` +
    `${params.customerName}님, ${params.label}(${params.eventDateYmd})이 7일 앞으로 다가왔어요.\n` +
    `특별한 날, 마음을 전해보세요.${link}\n\n` +
    `수신거부: 매장에 문의`
  );
}
