export const SUPPORT_TICKET_CATEGORIES = [
  { id: "getting-started", labelKo: "시작하기·계정", labelEn: "Getting started", icon: "🚀", order: 1 },
  { id: "orders", labelKo: "주문·접수·고객", labelEn: "Orders & customers", icon: "📋", order: 2 },
  { id: "delivery", labelKo: "배송·픽업", labelEn: "Delivery & pickup", icon: "🚚", order: 3 },
  { id: "expenses", labelKo: "지출·정산·세무", labelEn: "Expenses & tax", icon: "💰", order: 4 },
  { id: "printing", labelKo: "인쇄·ppBridge·영수증", labelEn: "Print & receipts", icon: "🖨️", order: 5 },
  { id: "ribbon", labelKo: "리본·라벨 프린트", labelEn: "Ribbon & labels", icon: "🎀", order: 6 },
  { id: "billing", labelKo: "구독·결제·요금제", labelEn: "Billing & plans", icon: "💳", order: 7 },
  { id: "multi-store", labelKo: "다매장·본사·수발주", labelEn: "Multi-store & HQ", icon: "🏪", order: 8 },
  { id: "integrations", labelKo: "연동·알림·메신저", labelEn: "Integrations", icon: "🔗", order: 9 },
  { id: "remote-settings", labelKo: "환경설정 대리", labelEn: "Remote settings assist", icon: "🛠️", order: 10 },
  { id: "login-help", labelKo: "로그인·비밀번호", labelEn: "Login & password", icon: "🔐", order: 11 },
  { id: "subscription-help", labelKo: "구독·결제", labelEn: "Subscription & billing", icon: "💳", order: 12 },
] as const;

export type SupportTicketCategoryId = (typeof SUPPORT_TICKET_CATEGORIES)[number]["id"];

const BY_ID = Object.fromEntries(SUPPORT_TICKET_CATEGORIES.map((c) => [c.id, c])) as Record<
  SupportTicketCategoryId,
  (typeof SUPPORT_TICKET_CATEGORIES)[number]
>;

export function supportCategoryLabel(id: string, locale: string = "ko"): string {
  const row = BY_ID[id as SupportTicketCategoryId];
  if (!row) return id;
  return locale.startsWith("en") ? row.labelEn : row.labelKo;
}

export function isValidSupportCategory(id: string): id is SupportTicketCategoryId {
  return id in BY_ID;
}

/** FAQ DB category 문자열 ↔ 티켓 category id 매핑 (기존 FAQ 호환) */
export const FAQ_CATEGORY_TO_TICKET: Record<string, SupportTicketCategoryId> = {
  "프린터/리본 출력": "ribbon",
  "프린터 연동": "printing",
  "주문/출고": "orders",
  "고객/정산": "expenses",
};
