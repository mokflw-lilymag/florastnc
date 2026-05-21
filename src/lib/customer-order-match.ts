import type { Customer } from "@/types/customer";

const PLACEHOLDER_CONTACTS = new Set([
  "",
  "-",
  "000-0000-0000",
  "00000000000",
  "010-0000-0000",
  "01000000000",
]);

export function parseOrderer(orderer: unknown): Record<string, unknown> | null {
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

export function normalizeContact(contact?: string | null): string {
  return (contact || "").replace(/-/g, "").trim();
}

export function isPlaceholderContact(contact?: string | null): boolean {
  const raw = (contact || "").trim();
  if (!raw || raw === "-") return true;
  if (PLACEHOLDER_CONTACTS.has(raw)) return true;
  if (PLACEHOLDER_CONTACTS.has(normalizeContact(raw))) return true;
  return /^0+$/.test(normalizeContact(raw));
}

/**
 * 고객 ID가 있으면 ID만, 없으면(레거시) 유효한 연락처로만 매칭.
 * 임시/공용 번호는 ID 없는 주문과 연결하지 않음 → 동명이인·공용번호 혼선 방지.
 */
export function orderBelongsToCustomerStrict(
  order: { orderer?: unknown; status?: string },
  customer: { id: string; contact?: string | null }
): boolean {
  if (order.status === "canceled") return false;

  const orderer = parseOrderer(order.orderer);
  if (!orderer) return false;

  const ordererId = orderer.id != null ? String(orderer.id) : "";
  if (ordererId) {
    return ordererId === String(customer.id);
  }

  if (isPlaceholderContact(customer.contact)) return false;

  const ordererContact = normalizeContact(
    typeof orderer.contact === "string" ? orderer.contact : ""
  );
  const customerContact = normalizeContact(customer.contact);
  return Boolean(customerContact && ordererContact && ordererContact === customerContact);
}

export function filterOrdersForCustomer<T extends { orderer?: unknown; status?: string }>(
  orders: T[],
  customer: { id: string; contact?: string | null }
): T[] {
  return orders.filter((order) => orderBelongsToCustomerStrict(order, customer));
}

export function computeCustomerOrderStats(
  orders: Array<{ summary?: { total?: number }; order_date?: string }>
) {
  const total = orders.reduce(
    (sum, order) => sum + (Number(order.summary?.total) || 0),
    0
  );
  const sorted = [...orders].sort(
    (a, b) =>
      new Date(b.order_date || 0).getTime() - new Date(a.order_date || 0).getTime()
  );

  return {
    total_spent: total,
    order_count: orders.length,
    last_order_date: sorted[0]?.order_date ?? null,
  };
}

/** 동명이인은 등록 순으로 이름1, 이름2 … 표시 */
export function buildDuplicateCustomerDisplayNames(
  customers: Array<Pick<Customer, "id" | "name" | "created_at">>
): Map<string, string> {
  const groups = new Map<string, Array<Pick<Customer, "id" | "name" | "created_at">>>();

  for (const customer of customers) {
    const key = customer.name.trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(customer);
  }

  const labels = new Map<string, string>();

  for (const [, group] of groups) {
    if (group.length === 1) {
      labels.set(group[0].id, group[0].name.trim());
      continue;
    }

    const sorted = [...group].sort((a, b) => {
      const dateDiff =
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.id.localeCompare(b.id);
    });

    sorted.forEach((customer, index) => {
      labels.set(customer.id, `${customer.name.trim()}${index + 1}`);
    });
  }

  return labels;
}

export function getCustomerDisplayName(
  customer: Pick<Customer, "id" | "name">,
  displayNames: Map<string, string>
): string {
  return displayNames.get(customer.id) ?? customer.name;
}
