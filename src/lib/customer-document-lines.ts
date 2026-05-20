import { format } from "date-fns";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

export type CustomerDocumentType = "statement" | "receipt" | "estimate";

export interface CustomerDocumentLineItem {
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

function parseOrderer(orderer: unknown): Record<string, unknown> | null {
  if (!orderer) return null;
  if (typeof orderer === "string") {
    try {
      return JSON.parse(orderer) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof orderer === "object") return orderer as Record<string, unknown>;
  return null;
}

export function orderBelongsToCustomer(
  order: { orderer?: unknown },
  customer: { id: string; contact?: string | null }
): boolean {
  const orderer = parseOrderer(order.orderer);
  if (!orderer) return false;

  const ordererId = orderer.id != null ? String(orderer.id) : "";
  if (ordererId && ordererId === String(customer.id)) return true;

  const ordererContact = typeof orderer.contact === "string" ? orderer.contact : "";
  if (customer.contact && ordererContact && ordererContact === customer.contact) {
    return true;
  }

  return false;
}

export function isExcludedOrderForDocument(order: { status?: string }): boolean {
  return order.status === "canceled";
}

export function buildDocumentLineItems(
  order: {
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
  if (type === "receipt") {
    const itemNames = (order.items || [])
      .map((item) => item.name)
      .filter(Boolean)
      .join(", ");
    const total = order.summary?.total ?? 0;

    return [
      {
        date: order.order_date,
        name: itemNames || "-",
        quantity: 1,
        price: total,
        amount: total,
        order_number: order.order_number,
      },
    ];
  }

  const products: CustomerDocumentLineItem[] = (order.items || []).map((item) => ({
    date: order.order_date,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    amount: item.price * item.quantity,
    order_number: order.order_number,
  }));

  if ((order.summary?.deliveryFee ?? 0) > 0) {
    products.push({
      date: order.order_date,
      name: labels.deliveryFee,
      quantity: 1,
      price: order.summary!.deliveryFee!,
      amount: order.summary!.deliveryFee!,
      order_number: order.order_number,
    });
  }

  if ((order.summary?.discountAmount ?? 0) > 0) {
    products.push({
      date: order.order_date,
      name: labels.discount,
      quantity: 1,
      price: -order.summary!.discountAmount!,
      amount: -order.summary!.discountAmount!,
      order_number: order.order_number,
    });
  }

  return products;
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
