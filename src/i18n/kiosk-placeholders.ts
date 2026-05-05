import { pickUiText } from "@/i18n/pick-ui-text";

/** 키오스크에서 익명 제출 시 주문·고객 레코드에 넣는 표시 이름 (매장 UI 언어에 맞춤). */
export function kioskAnonymousCustomerName(baseLocale: string): string {
  return pickUiText(
    baseLocale,
    "익명고객",
    "Anonymous",
    "Khách ẩn danh",
    "匿名のお客様",
    "匿名顾客",
    "Cliente anónimo",
    "Cliente anônimo",
    "Client anonyme",
    "Anonym",
    "Анонимный клиент",
  );
}
