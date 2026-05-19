import type { Order } from "@/types/order";
import { format, subDays } from "date-fns";

const TRIAL_PREFIX = "trial-";

function d(daysAgo: number) {
  return format(subDays(new Date(), daysAgo), "yyyy-MM-dd");
}

/** 무료 ERP 체험용 샘플 주문 (DB 저장 없음) */
export function getErpTrialOrders(tenantId: string): Order[] {
  const base = {
    tenant_id: tenantId,
    source: "manual" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return [
    {
      ...base,
      id: `${TRIAL_PREFIX}001`,
      order_number: "체험-240519-001",
      status: "processing",
      receipt_type: "delivery_reservation",
      order_date: d(0),
      orderer: { name: "김민수", contact: "010-1234-5678", company: "㈜테크솔루션" },
      summary: { subtotal: 85000, discountAmount: 0, discountRate: 0, deliveryFee: 5000, total: 90000 },
      payment: { method: "card", status: "paid" },
      items: [
        { id: "i1", name: "축하 화환 (대)", quantity: 1, price: 85000 },
      ],
      pickup_info: null,
      delivery_info: {
        date: d(0),
        time: "14:00",
        recipientName: "이대표",
        recipientContact: "010-9876-5432",
        address: "서울 강남구 테헤란로 123",
        district: "강남",
      },
      message: { type: "ribbon", content: "개업을 축하드립니다", sender: "김민수" },
      memo: "14시 전 배송 부탁드립니다",
    },
    {
      ...base,
      id: `${TRIAL_PREFIX}002`,
      order_number: "체험-240518-002",
      status: "processing",
      receipt_type: "pickup_reservation",
      order_date: d(1),
      orderer: { name: "박서연", contact: "010-2222-3333" },
      summary: { subtotal: 45000, discountAmount: 5000, discountRate: 0, deliveryFee: 0, total: 40000 },
      payment: { method: "transfer", status: "pending" },
      items: [{ id: "i2", name: "장미 50송이 꽃다발", quantity: 1, price: 45000 }],
      pickup_info: {
        date: d(0),
        time: "11:00",
        pickerName: "박서연",
        pickerContact: "010-2222-3333",
      },
      delivery_info: null,
      message: { type: "card", content: "생일 축하해!", sender: "친구들" },
    },
    {
      ...base,
      id: `${TRIAL_PREFIX}003`,
      order_number: "체험-240517-003",
      status: "completed",
      receipt_type: "store_pickup",
      order_date: d(2),
      orderer: { name: "최영희", contact: "010-5555-6666" },
      summary: { subtotal: 32000, discountAmount: 0, discountRate: 0, deliveryFee: 0, total: 32000 },
      payment: { method: "cash", status: "completed", completedAt: d(2) },
      items: [{ id: "i3", name: "프리저브드 박스", quantity: 1, price: 32000 }],
      pickup_info: {
        date: d(2),
        time: "16:30",
        pickerName: "최영희",
        pickerContact: "010-5555-6666",
      },
      delivery_info: null,
      message: { type: "none" },
    },
    {
      ...base,
      id: `${TRIAL_PREFIX}004`,
      order_number: "체험-240515-004",
      status: "completed",
      receipt_type: "delivery_reservation",
      order_date: d(4),
      orderer: { name: "정우진", contact: "010-7777-8888" },
      summary: { subtotal: 120000, discountAmount: 10000, discountRate: 0, deliveryFee: 8000, total: 118000 },
      payment: { method: "card", status: "paid" },
      items: [
        { id: "i4", name: "근조 화환 (특)", quantity: 1, price: 120000 },
      ],
      pickup_info: null,
      delivery_info: {
        date: d(4),
        time: "10:00",
        recipientName: "장례식장",
        recipientContact: "02-123-4567",
        address: "경기 성남시 분당구 정자동",
        district: "분당",
      },
      message: { type: "ribbon", content: "삼가 고인의 명복을 빕니다", sender: "정우진 일동" },
    },
    {
      ...base,
      id: `${TRIAL_PREFIX}005`,
      order_number: "체험-240512-005",
      status: "canceled",
      receipt_type: "delivery_reservation",
      order_date: d(7),
      orderer: { name: "한지민", contact: "010-9999-0000" },
      summary: { subtotal: 55000, discountAmount: 0, discountRate: 0, deliveryFee: 4000, total: 59000 },
      payment: { method: "card", status: "pending" },
      items: [{ id: "i5", name: "필러 꽃다발 (M)", quantity: 1, price: 55000 }],
      pickup_info: null,
      delivery_info: {
        date: d(7),
        time: "15:00",
        recipientName: "수취인",
        recipientContact: "010-0000-1111",
        address: "서울 마포구 합정동",
        district: "마포",
      },
      message: { type: "ribbon", content: "사랑합니다", sender: "한지민" },
      memo: "고객 요청으로 취소",
    },
  ];
}

export function isErpTrialOrderId(id: string): boolean {
  return id.startsWith(TRIAL_PREFIX);
}
