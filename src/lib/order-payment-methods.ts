import type { OrderData, PaymentStatus } from "@/types/order";

export type OrderPaymentMethod = OrderData["payment"]["method"];

/** 새 주문 접수 UI에 노출하는 결제 수단 (카카오·애플페이는 epay로 통합) */
export const NEW_ORDER_PAYMENT_METHODS: OrderPaymentMethod[] = [
  "card",
  "cash",
  "transfer",
  "mainpay",
  "shopping_mall",
  "epay",
  "unknown",
];

export function getNewOrderPaymentMethodLabel(
  method: OrderPaymentMethod,
  tf: Record<string, string>
): string {
  switch (method) {
    case "card":
      return tf.f00704;
    case "cash":
      return tf.f00769;
    case "transfer":
      return tf.f00057;
    case "mainpay":
      return tf.f00211;
    case "shopping_mall":
      return tf.f00368;
    case "epay":
    case "kakao":
    case "apple":
      return tf.f02604;
    case "unknown":
      return "모름";
    default:
      return method;
  }
}

/** 결제 수단 선택 — 「모름」이면 미수(외상)(pending), 그 외는 결제완료(paid) 자동 설정 */
export function selectOrderPaymentMethod(
  method: OrderPaymentMethod,
  setPaymentMethod: (method: OrderPaymentMethod) => void,
  setPaymentStatus: (status: PaymentStatus) => void,
  onAfterSelect?: () => void
) {
  setPaymentMethod(method);
  if (method === "unknown") {
    setPaymentStatus("pending");
  } else {
    setPaymentStatus("paid");
  }
  onAfterSelect?.();
}

/** 카드 승인 실패 후 다른 수단으로 빠르게 전환 */
export function quickSwitchPaymentAfterFailure(
  method: OrderPaymentMethod,
  setPaymentMethod: (method: OrderPaymentMethod) => void,
  setPaymentStatus: (status: PaymentStatus) => void,
  clearCardApprovalError?: () => void
) {
  selectOrderPaymentMethod(method, setPaymentMethod, setPaymentStatus, clearCardApprovalError);
}

export function getCardLikePaymentMethodLabel(method: OrderPaymentMethod): boolean {
  return method === "card" || method === "epay" || method === "mainpay";
}
