import type { OrderData } from "@/types/order";
import {
  NEW_ORDER_PAYMENT_METHODS,
  getNewOrderPaymentMethodLabel,
  type OrderPaymentMethod,
} from "@/lib/order-payment-methods";

/** PC 새 주문 접수와 동일한 결제 수단 목록 */
export type MobilePaymentMethod = Extract<
  OrderData["payment"]["method"],
  (typeof NEW_ORDER_PAYMENT_METHODS)[number]
>;

export { NEW_ORDER_PAYMENT_METHODS, getNewOrderPaymentMethodLabel };

const MOBILE_PAYMENT_METHOD_COLORS: Partial<Record<OrderPaymentMethod, string>> = {
  card: "bg-blue-500 hover:bg-blue-600 text-white",
  cash: "bg-emerald-500 hover:bg-emerald-600 text-white",
  transfer: "bg-orange-500 hover:bg-orange-600 text-white",
  mainpay: "bg-rose-500 hover:bg-rose-600 text-white",
  shopping_mall: "bg-cyan-500 hover:bg-cyan-600 text-white",
  epay: "bg-violet-500 hover:bg-violet-600 text-white",
  unknown: "bg-slate-500 hover:bg-slate-600 text-white",
};

export function buildMobilePaymentMethods(tf: Record<string, string>) {
  return NEW_ORDER_PAYMENT_METHODS.map((key) => ({
    key,
    label: getNewOrderPaymentMethodLabel(key, tf),
    color: MOBILE_PAYMENT_METHOD_COLORS[key] ?? "bg-gray-500 text-white",
  }));
}

/** @deprecated buildMobilePaymentMethods(tf) 사용 — 빠른판매 등 레거시 호환 */
export const MOBILE_PAYMENT_METHODS = buildMobilePaymentMethods({
  f00704: "카드",
  f00769: "현금",
  f00057: "계좌이체",
  f00211: "메인",
  f00368: "쇼핑몰",
  f02604: "이페이",
});
