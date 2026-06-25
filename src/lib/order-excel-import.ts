import { saveAs } from "file-saver";
import { pickExcelString, pickExcelCell, parseExcel } from "@/utils/excel";
import type { OrderData } from "@/types/order";

export type OrderExcelImportRow = {
  orderDate: string;
  orderItems: string;
  itemPrice: number;
  deliveryFee: number;
  paymentMethod: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  ordererName: string;
  ordererContact: string;
  ordererEmail: string;
  deliveryMethod: string;
  fulfillmentDate: string;
  recipientName: string;
  recipientContact: string;
  deliveryAddress: string;
  messageType: string;
  messageContent: string;
  memo: string;
};

const PAYMENT_METHOD_MAP: Record<string, OrderData["payment"]["method"]> = {
  카드: "card",
  card: "card",
  현금: "cash",
  cash: "cash",
  계좌이체: "transfer",
  이체: "transfer",
  transfer: "transfer",
  메인페이: "mainpay",
  mainpay: "mainpay",
  쇼핑몰: "shopping_mall",
  shopping_mall: "shopping_mall",
  이페이: "epay",
  epay: "epay",
};

const ORDER_STATUS_MAP: Record<string, OrderData["status"]> = {
  processing: "processing",
  completed: "completed",
  canceled: "canceled",
  처리중: "processing",
  완료: "completed",
  취소: "canceled",
};

const PAYMENT_STATUS_MAP: Record<string, OrderData["payment"]["status"]> = {
  pending: "pending",
  paid: "paid",
  completed: "paid",
  미결: "pending",
  완결: "paid",
};

export function orderImportHeaderAliases() {
  const X = (keys: string[]) => keys;
  return {
    orderDate: X(["주문일시", "주문일", "Order time", "Order date"]),
    orderItems: X(["주문상품", "상품명", "Product", "상품"]),
    itemPrice: X(["상품금액", "단가", "Line amount", "Amount"]),
    deliveryFee: X(["배송비", "Delivery fee"]),
    paymentMethod: X(["결제수단", "Payment method"]),
    totalAmount: X(["총금액", "Total"]),
    orderStatus: X(["주문상태", "Order status", "상태"]),
    paymentStatus: X(["결제상태", "Payment status"]),
    ordererName: X(["주문자명", "Customer name", "주문자"]),
    ordererContact: X(["주문자연락처", "연락처", "Contact"]),
    ordererEmail: X(["주문자이메일", "Email", "이메일"]),
    deliveryMethod: X(["수령방법", "Fulfillment", "수령방식"]),
    fulfillmentDate: X(["픽업/배송일시", "수령예정일", "Scheduled date", "배송일"]),
    recipientName: X(["수령인명", "Recipient name", "수령자"]),
    recipientContact: X(["수령인연락처", "Recipient contact"]),
    deliveryAddress: X(["배송주소", "배송지", "Address"]),
    messageType: X(["메세지타입", "메시지타입", "Message type"]),
    messageContent: X(["메세지내용", "메시지내용", "Message"]),
    memo: X(["요청사항", "메모", "Notes"]),
  };
}

export function parseOrderExcelRow(row: Record<string, unknown>): OrderExcelImportRow | null {
  const H = orderImportHeaderAliases();
  const orderItems = pickExcelString(row, H.orderItems);
  if (!orderItems) return null;

  return {
    orderDate: pickExcelString(row, H.orderDate),
    orderItems,
    itemPrice: Number(pickExcelCell(row, H.itemPrice)) || 0,
    deliveryFee: Number(pickExcelCell(row, H.deliveryFee)) || 0,
    paymentMethod: pickExcelString(row, H.paymentMethod),
    totalAmount: Number(pickExcelCell(row, H.totalAmount)) || 0,
    orderStatus: pickExcelString(row, H.orderStatus) || "processing",
    paymentStatus: pickExcelString(row, H.paymentStatus) || "pending",
    ordererName: pickExcelString(row, H.ordererName),
    ordererContact: pickExcelString(row, H.ordererContact),
    ordererEmail: pickExcelString(row, H.ordererEmail),
    deliveryMethod: pickExcelString(row, H.deliveryMethod) || "pickup",
    fulfillmentDate: pickExcelString(row, H.fulfillmentDate),
    recipientName: pickExcelString(row, H.recipientName),
    recipientContact: pickExcelString(row, H.recipientContact),
    deliveryAddress: pickExcelString(row, H.deliveryAddress),
    messageType: pickExcelString(row, H.messageType) || "none",
    messageContent: pickExcelString(row, H.messageContent),
    memo: pickExcelString(row, H.memo),
  };
}

function parseOrderDate(raw: string): Date {
  if (!raw) return new Date();
  let d = new Date(raw);
  if (Number.isNaN(d.getTime()) && typeof raw === "string" && !raw.includes(":")) {
    d = new Date(`${raw}T09:00:00`);
  }
  if (Number.isNaN(d.getTime())) return new Date();
  if (raw && !String(raw).includes(":")) {
    d.setHours(9, 0, 0, 0);
  }
  return d;
}

export function convertOrderExcelRowToOrderData(row: OrderExcelImportRow): OrderData {
  const isDelivery =
    row.deliveryMethod === "delivery" ||
    row.deliveryMethod === "배송" ||
    row.deliveryMethod === "delivery_reservation";
  const receiptType = isDelivery ? "delivery_reservation" : "pickup_reservation";
  const orderDate = parseOrderDate(row.orderDate);
  const fulfillmentRaw = row.fulfillmentDate || row.orderDate;
  const fulfillmentDate = fulfillmentRaw
    ? parseOrderDate(fulfillmentRaw).toISOString().split("T")[0]
    : orderDate.toISOString().split("T")[0];

  const orderItems = row.orderItems.split(",").map((item, index) => ({
    id: `excel_${Date.now()}_${index}`,
    name: item.trim(),
    price: row.itemPrice,
    quantity: 1,
    source: "excel_upload" as const,
    originalData: item.trim(),
  }));

  const paymentStatus = PAYMENT_STATUS_MAP[row.paymentStatus] || "pending";
  const paid = paymentStatus === "paid" || paymentStatus === "completed";

  return {
    status: ORDER_STATUS_MAP[row.orderStatus] || "processing",
    receipt_type: receiptType,
    order_date: orderDate.toISOString(),
    orderer: {
      name: row.ordererName || "고객",
      contact: row.ordererContact || "",
      email: row.ordererEmail || "",
      company: "",
    },
    summary: {
      subtotal: row.itemPrice,
      discountAmount: 0,
      discountRate: 0,
      deliveryFee: row.deliveryFee,
      pointsUsed: 0,
      pointsEarned: Math.floor(row.itemPrice * 0.02),
      total: row.totalAmount || row.itemPrice + row.deliveryFee,
    },
    payment: {
      method: PAYMENT_METHOD_MAP[row.paymentMethod] || "card",
      status: paymentStatus,
      completedAt: paid ? orderDate.toISOString() : undefined,
    },
    items: orderItems,
    pickup_info: !isDelivery
      ? {
          date: fulfillmentDate,
          time: "09:00:00",
          pickerName: row.recipientName || row.ordererName || "고객",
          pickerContact: row.recipientContact || row.ordererContact || "",
        }
      : null,
    delivery_info: isDelivery
      ? {
          date: fulfillmentDate,
          time: "09:00:00",
          recipientName: row.recipientName || row.ordererName || "고객",
          recipientContact: row.recipientContact || row.ordererContact || "",
          address: row.deliveryAddress || "",
          district: "",
        }
      : null,
    message:
      row.messageType && row.messageType !== "none"
        ? {
            type: (row.messageType === "ribbon" ? "ribbon" : "card") as "card" | "ribbon",
            content: row.messageContent,
          }
        : { type: "card", content: "" },
    memo: row.memo || "",
    extra_data: { skipPrint: true, importSource: "excel_upload" },
  };
}

export async function parseOrderExcelFile(file: File): Promise<OrderExcelImportRow[]> {
  const data = await parseExcel(file);
  return data
    .map((row) => parseOrderExcelRow(row as Record<string, unknown>))
    .filter((r): r is OrderExcelImportRow => r !== null);
}

export async function downloadOrderImportTemplate() {
  const XLSX = await import("xlsx");
  const template = [
    [
      "주문일시",
      "주문상품",
      "상품금액",
      "배송비",
      "결제수단",
      "총금액",
      "주문상태",
      "결제상태",
      "주문자명",
      "주문자연락처",
      "주문자이메일",
      "수령방법",
      "픽업/배송일시",
      "수령인명",
      "수령인연락처",
      "배송주소",
      "메세지타입",
      "메세지내용",
      "요청사항",
    ],
    [
      "2024-01-15",
      "장미 10송이",
      50000,
      3000,
      "카드",
      53000,
      "processing",
      "pending",
      "김철수",
      "010-1234-5678",
      "kim@example.com",
      "pickup",
      "2024-01-16",
      "",
      "",
      "",
      "card",
      "생일 축하해요!",
      "",
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "주문템플릿");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    "주문_업로드_템플릿.xlsx",
  );
}
