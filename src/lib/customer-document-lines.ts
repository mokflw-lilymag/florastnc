import { format } from "date-fns";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { orderBelongsToCustomerStrict } from "@/lib/customer-order-match";

export type CustomerDocumentType = "statement" | "receipt" | "estimate";

export interface CustomerDocumentLineItem {
  lineKey: string;
  date: string;
  name: string;
  quantity: number;
  price: number;
  amount: number;
  order_number?: string;
}

export interface CustomerDocumentLabels {
  deliveryFee: string;
  discount: string;
}

export function orderBelongsToCustomer(
  order: { orderer?: unknown; status?: string },
  customer: { id: string; contact?: string | null }
): boolean {
  return orderBelongsToCustomerStrict(order, customer);
}

export function isExcludedOrderForDocument(order: { status?: string }): boolean {
  return order.status === "canceled";
}

export function buildDocumentLineItems(
  order: {
    id?: string;
    order_date: string;
    order_number?: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
    summary?: {
      total?: number;
      deliveryFee?: number;
      discountAmount?: number;
    };
  },
  type: CustomerDocumentType,
  labels: CustomerDocumentLabels
): CustomerDocumentLineItem[] {
  const orderKey = order.id || order.order_number || "order";

  const products: CustomerDocumentLineItem[] = (order.items || []).map((item, idx) => ({
    lineKey: `${orderKey}-item-${idx}`,
    date: order.order_date,
    name: item.name,
    quantity: item.quantity ?? 1,
    price: item.price,
    amount: item.price * (item.quantity ?? 1),
    order_number: order.order_number,
  }));

  if (type === "receipt") {
    return products;
  }

  const lines: CustomerDocumentLineItem[] = [...products];

  if ((order.summary?.deliveryFee ?? 0) > 0) {
    lines.push({
      lineKey: `${orderKey}-delivery`,
      date: order.order_date,
      name: labels.deliveryFee,
      quantity: 1,
      price: order.summary!.deliveryFee!,
      amount: order.summary!.deliveryFee!,
      order_number: order.order_number,
    });
  }

  if ((order.summary?.discountAmount ?? 0) > 0) {
    lines.push({
      lineKey: `${orderKey}-discount`,
      date: order.order_date,
      name: labels.discount,
      quantity: 1,
      price: -order.summary!.discountAmount!,
      amount: -order.summary!.discountAmount!,
      order_number: order.order_number,
    });
  }

  return lines;
}

export function buildDocumentLineItemsFromOrders(
  orders: Parameters<typeof buildDocumentLineItems>[0][],
  type: CustomerDocumentType,
  labels: CustomerDocumentLabels
): CustomerDocumentLineItem[] {
  return orders.flatMap((order) => buildDocumentLineItems(order, type, labels));
}

export function computeDocumentTotal(
  orders: Array<{ summary?: { total?: number } }>,
  type: CustomerDocumentType,
  lineItems: CustomerDocumentLineItem[]
): number {
  if (type === "receipt") {
    return orders.reduce((sum, order) => sum + (order.summary?.total ?? 0), 0);
  }

  return lineItems.reduce((sum, item) => sum + item.amount, 0);
}

export function formatDocumentDateParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDocumentDateParam(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function applyLineDateOverrides(
  items: CustomerDocumentLineItem[],
  overrides: Record<string, string>
): CustomerDocumentLineItem[] {
  if (Object.keys(overrides).length === 0) return items;

  return items.map((item) => ({
    ...item,
    date: overrides[item.lineKey] ?? item.date,
  }));
}

export function buildLineDateOverrideMap(
  items: CustomerDocumentLineItem[]
): Record<string, string> {
  return Object.fromEntries(items.map((item) => [item.lineKey, item.date]));
}

export function encodeLineDateOverrides(overrides: Record<string, string>): string {
  return btoa(encodeURIComponent(JSON.stringify(overrides)));
}

export function decodeLineDateOverrides(encoded: string | null | undefined): Record<string, string> {
  if (!encoded) return {};
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as Record<string, string>;
  } catch {
    return {};
  }
}

export function formatCustomerDocumentDate(
  date: Date | string,
  baseLocale: string
): string {
  const parsed = typeof date === "string" ? new Date(date) : date;
  const locale = dateFnsLocaleForBase(baseLocale);

  if (baseLocale === "ko") {
    return format(parsed, "yyyy. M. d.", { locale });
  }

  return format(parsed, "yyyy-MM-dd", { locale });
}
