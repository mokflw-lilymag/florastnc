import type { Customer } from "@/types/customer";

/** 연락처 비교용 (하이픈·공백 무시) */
export function normalizeContact(contact: string): string {
  return contact.replace(/\D/g, "");
}

/** 같은 매장 고객 목록에서 연락처로 기존 고객 찾기 */
export function findCustomerByContact(
  customers: Customer[],
  contact: string,
): Customer | undefined {
  const needle = normalizeContact(contact);
  if (!needle) return undefined;
  return customers.find((c) => normalizeContact(c.contact || "") === needle);
}

/** 기존 고객 선택 시 주문 폼 체크박스 — 전부 해제(이번 주문에서만 필요 시 수동 ON) */
export function orderFormChecksForExistingCustomer(): {
  registerCustomer: false;
  marketingConsent: false;
  registerAnniversaryFromOrder: false;
} {
  return {
    registerCustomer: false,
    marketingConsent: false,
    registerAnniversaryFromOrder: false,
  };
}
