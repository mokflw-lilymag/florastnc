import { format, isSameDay, isToday, addDays } from "date-fns";
import type { Order } from "@/types/order";

export type PickupListItem = {
  id: string;
  orderNumber: string;
  ordererName: string;
  contact: string;
  itemsLabel: string;
  rawItems: Order["items"];
  memo?: string;
  total: number;
  status: Order["status"];
  receiptType: Order["receipt_type"];
  pickupDate?: string;
  pickupTime?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryAddress?: string;
  scheduledTime?: Date;
  paymentStatus?: string;
  paymentMethod?: string;
  productionCompleted?: boolean;
  completedAt?: string;
  orderDate?: string;
  actualDeliveryCost?: number;
  actualDeliveryCostCash?: number;
  originalOrder: Order;
};

export function mapOrderToPickupItem(o: Order): PickupListItem {
  const pickup = o.pickup_info;
  const delivery = o.delivery_info;
  const itemsLabel =
    (o.items || []).slice(0, 2).map((i) => i.name || "상품").join(", ") +
    ((o.items || []).length > 2 ? ` 외 ${(o.items || []).length - 2}건` : "");

  let scheduledTime: Date | undefined;
  const dateStr = pickup?.date || delivery?.date;
  const timeStr = pickup?.time || delivery?.time || "00:00";
  if (dateStr) {
    try {
      const t = timeStr.includes(":") ? (timeStr.length === 5 ? timeStr : timeStr.substring(0, 5)) : "00:00";
      scheduledTime = new Date(`${dateStr}T${t}`);
    } catch {
      scheduledTime = undefined;
    }
  }

  return {
    id: o.id,
    orderNumber: o.order_number,
    ordererName: o.orderer?.name || "고객",
    contact: o.orderer?.contact || "",
    itemsLabel,
    rawItems: o.items || [],
    memo: o.memo,
    total: o.summary?.total || 0,
    status: o.status,
    receiptType: o.receipt_type,
    pickupDate: pickup?.date,
    pickupTime: pickup?.time,
    deliveryDate: delivery?.date,
    deliveryTime: delivery?.time,
    deliveryAddress: delivery?.address,
    scheduledTime,
    paymentStatus: o.payment?.status,
    paymentMethod: o.payment?.method,
    productionCompleted: !!o.extra_data?.production_completed,
    completedAt: o.completed_at,
    orderDate: o.order_date,
    actualDeliveryCost: o.actual_delivery_cost,
    actualDeliveryCostCash: o.actual_delivery_cost_cash,
    originalOrder: o,
  };
}

export function getUrgencyColor(scheduledTime?: Date): string {
  if (!scheduledTime) return "border-gray-200";
  const diffMin = (scheduledTime.getTime() - Date.now()) / 60000;
  if (diffMin < 0) return "border-red-400 bg-red-50";
  if (diffMin <= 60) return "border-yellow-400 bg-yellow-50";
  return "border-emerald-200 bg-white";
}

export function formatOrderDateShort(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "MM/dd HH:mm");
  } catch {
    return "";
  }
}

export type DateFilterType = "오늘" | "내일" | "전체";
export type PickupTabType = "전체" | "픽업" | "배송";

export function matchesDateFilter(
  item: PickupListItem,
  dateFilter: DateFilterType
): boolean {
  if (dateFilter === "전체") return true;

  const scheduleDate = item.scheduledTime;
  const orderDate = item.orderDate ? new Date(item.orderDate) : null;

  if (dateFilter === "오늘") {
    if (scheduleDate && isToday(scheduleDate)) return true;
    if (!scheduleDate && orderDate && isToday(orderDate)) return true;
    if (item.receiptType === "store_pickup" && orderDate && isToday(orderDate)) return true;
    return false;
  }

  const tomorrow = addDays(new Date(), 1);
  if (scheduleDate && isSameDay(scheduleDate, tomorrow)) return true;
  return false;
}
