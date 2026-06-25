import { format, addDays, subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OrderService } from "@/services/order-service";
import type { Order } from "@/types/order";

/** 리마인드 팝업 전용 — 전체 주문 컬럼 대신 최소 필드만 */
const REMINDER_SELECT = `
  id, tenant_id, order_number, status, receipt_type,
  orderer, items, pickup_info, delivery_info
`;

function mapRows(rows: unknown[]): Order[] {
  return rows.map((row) => OrderService.mapRowToOrder(row as Record<string, unknown>));
}

function mergeUniqueOrders(lists: Order[][]): Order[] {
  const map = new Map<string, Order>();
  for (const list of lists) {
    for (const o of list) map.set(o.id, o);
  }
  return Array.from(map.values());
}

export function getScheduleDate(order: Order): string | null {
  return order.pickup_info?.date || order.delivery_info?.date || null;
}

/** 오늘 이후 예약(픽업/배송일) 주문만 — 레퍼런스 fetchCalendarOrders 패턴 경량화 */
export async function fetchUpcomingScheduleOrders(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { daysAhead?: number; limit?: number },
): Promise<Order[]> {
  const daysAhead = options?.daysAhead ?? 35;
  const limit = options?.limit ?? 150;
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const endStr = format(addDays(new Date(), daysAhead), "yyyy-MM-dd");

  const [pickupRes, deliveryRes] = await Promise.all([
    supabase
      .from("orders")
      .select(REMINDER_SELECT)
      .eq("tenant_id", tenantId)
      .not("status", "in", '("completed","canceled")')
      .gte("pickup_info->>date", todayStr)
      .lte("pickup_info->>date", endStr)
      .order("pickup_info->>date", { ascending: true })
      .limit(limit),
    supabase
      .from("orders")
      .select(REMINDER_SELECT)
      .eq("tenant_id", tenantId)
      .not("status", "in", '("completed","canceled")')
      .gte("delivery_info->>date", todayStr)
      .lte("delivery_info->>date", endStr)
      .order("delivery_info->>date", { ascending: true })
      .limit(limit),
  ]);

  if (pickupRes.error) throw pickupRes.error;
  if (deliveryRes.error) throw deliveryRes.error;

  const merged = mergeUniqueOrders([
    mapRows(pickupRes.data || []),
    mapRows(deliveryRes.data || []),
  ]);

  return merged
    .filter((order) => {
      const d = getScheduleDate(order);
      return d != null && d >= todayStr && d <= endStr;
    })
    .sort((a, b) => (getScheduleDate(a) || "").localeCompare(getScheduleDate(b) || ""));
}

/** 로그인 직후 팝업 여부만 판단 — head count 2회 (메인 창 부하 최소) */
export async function hasUpcomingScheduleOrders(
  supabase: SupabaseClient,
  tenantId: string,
  daysAhead = 35,
): Promise<boolean> {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const endStr = format(addDays(new Date(), daysAhead), "yyyy-MM-dd");

  const [pickupRes, deliveryRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .not("status", "in", '("completed","canceled")')
      .gte("pickup_info->>date", todayStr)
      .lte("pickup_info->>date", endStr),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .not("status", "in", '("completed","canceled")')
      .gte("delivery_info->>date", todayStr)
      .lte("delivery_info->>date", endStr),
  ]);

  if (pickupRes.error) throw pickupRes.error;
  if (deliveryRes.error) throw deliveryRes.error;

  return (pickupRes.count ?? 0) + (deliveryRes.count ?? 0) > 0;
}

/** Electron 로컬 DB용 — Supabase 대신 queryDb (선택) */
export function scheduleDateInRange(ymd: string | null | undefined, todayStr: string, endStr: string): boolean {
  if (!ymd) return false;
  return ymd >= todayStr && ymd <= endStr;
}

export function reminderDateWindow() {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const endStr = format(addDays(new Date(), 35), "yyyy-MM-dd");
  const startStr = format(subDays(new Date(), 0), "yyyy-MM-dd");
  return { todayStr, endStr, startStr };
}
