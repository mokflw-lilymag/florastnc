import type { OrderData } from "@/types/order";

/** 모바일(주문접수·빠른판매) 공통 결제 수단 — PC 전체 목록의 실무용 6종 */
export type MobilePaymentMethod = Extract<
  OrderData["payment"]["method"],
  "card" | "cash" | "transfer" | "mainpay" | "epay" | "kakao"
>;

export const MOBILE_PAYMENT_METHODS: {
  key: MobilePaymentMethod;
  label: string;
  color: string;
}[] = [
  { key: "card", label: "카드", color: "bg-blue-500 hover:bg-blue-600 text-white" },
  { key: "cash", label: "현금", color: "bg-emerald-500 hover:bg-emerald-600 text-white" },
  { key: "transfer", label: "계좌이체", color: "bg-orange-500 hover:bg-orange-600 text-white" },
  { key: "mainpay", label: "메인", color: "bg-rose-500 hover:bg-rose-600 text-white" },
  { key: "epay", label: "e-Pay", color: "bg-violet-500 hover:bg-violet-600 text-white" },
  { key: "kakao", label: "카카오", color: "bg-yellow-400 hover:bg-yellow-500 text-gray-900" },
];
