import { format, isSameDay, isToday, addDays } from "date-fns";
import type { Locale } from "date-fns";
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

export type PickupItemLabels = {
  productFallback: string;
  customerFallback: string;
  itemsMore: string;
};

export function formatPickupItemsLabel(
  items: Order["items"],
  labels: PickupItemLabels,
): string {
  const list = items || [];
  const head = list
    .slice(0, 2)
    .map((i) => i.name || labels.productFallback)
    .join(", ");
  if (list.length <= 2) return head;
  return `${head}${labels.itemsMore.replace("{{count}}", String(list.length - 2))}`;
}

export function mapOrderToPickupItem(
  o: Order,
  labels?: PickupItemLabels,
): PickupListItem {
  const pickup = o.pickup_info;
  const delivery = o.delivery_info;
  const fallback: PickupItemLabels = labels ?? {
    productFallback: "Item",
    customerFallback: "Customer",
    itemsMore: " +{{count}} more",
  };
  const itemsLabel = formatPickupItemsLabel(o.items, fallback);

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
    ordererName: o.orderer?.name || fallback.customerFallback,
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

export function formatOrderDateShort(dateStr?: string, dateLocale?: Locale): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "MM/dd HH:mm", dateLocale ? { locale: dateLocale } : undefined);
  } catch {
    return "";
  }
}

export type DateFilterType = "today" | "tomorrow" | "all";
export type PickupTabType = "all" | "pickup" | "delivery";

export function matchesDateFilter(
  item: PickupListItem,
  dateFilter: DateFilterType,
): boolean {
  if (dateFilter === "all") return true;

  const scheduleDate = item.scheduledTime;
  const orderDate = item.orderDate ? new Date(item.orderDate) : null;

  if (dateFilter === "today") {
    if (scheduleDate && isToday(scheduleDate)) return true;
    if (!scheduleDate && orderDate && isToday(orderDate)) return true;
    if (item.receiptType === "store_pickup" && orderDate && isToday(orderDate)) return true;
    return false;
  }

  const tomorrow = addDays(new Date(), 1);
  if (scheduleDate && isSameDay(scheduleDate, tomorrow)) return true;
  return false;
}

export const PICKUP_TABS: PickupTabType[] = ["all", "pickup", "delivery"];
export const PICKUP_DATE_FILTERS: DateFilterType[] = ["today", "tomorrow", "all"];
