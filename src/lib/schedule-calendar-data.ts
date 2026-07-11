import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  lastDayOfMonth,
} from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OrderService } from "@/services/order-service";
import type { Order } from "@/types/order";
import type { FixedCostItem } from "@/types/simple-expense";
import type { ScheduleCalendarEvent, StaffShift, ScheduleNote } from "@/types/schedule-calendar";
import type { StaffLeaveRequest } from "@/types/staff-salary";
import { STAFF_LEAVE_SELECT } from "@/types/staff-salary";
import { expandLeaveToDayMarkers } from "@/lib/staff-leave-calendar";
import { getScheduleDate } from "@/lib/reminder-schedule-orders";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/category-defaults";

const fixedCostCategories = new Set(DEFAULT_EXPENSE_CATEGORIES.mid["고정비"] || []);

const ORDER_SELECT = `
  id, tenant_id, order_number, status, receipt_type,
  orderer, items, pickup_info, delivery_info
`;

function mapOrders(rows: unknown[]): Order[] {
  return rows.map((row) => OrderService.mapRowToOrder(row as Record<string, unknown>));
}

function mergeOrders(lists: Order[][]): Order[] {
  const map = new Map<string, Order>();
  for (const list of lists) {
    for (const o of list) map.set(o.id, o);
  }
  return Array.from(map.values());
}

/** 월간 픽업/배송 — schedule date 기준 */
export async function fetchScheduleOrdersForMonth(
  supabase: SupabaseClient,
  tenantId: string,
  month: Date,
): Promise<Order[]> {
  const startStr = format(startOfMonth(month), "yyyy-MM-dd");
  const endStr = format(endOfMonth(month), "yyyy-MM-dd");

  const [pickupRes, deliveryRes] = await Promise.all([
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("tenant_id", tenantId)
      .not("status", "in", '("completed","canceled")')
      .gte("pickup_info->>date", startStr)
      .lte("pickup_info->>date", endStr)
      .limit(300),
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("tenant_id", tenantId)
      .not("status", "in", '("completed","canceled")')
      .gte("delivery_info->>date", startStr)
      .lte("delivery_info->>date", endStr)
      .limit(300),
  ]);

  if (pickupRes.error) throw pickupRes.error;
  if (deliveryRes.error) throw deliveryRes.error;

  return mergeOrders([mapOrders(pickupRes.data || []), mapOrders(deliveryRes.data || [])]);
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST205" || (error.message?.includes("Could not find the table") ?? false);
}

export async function fetchFixedCostTemplateItems(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<FixedCostItem[]> {
  try {
    const { data, error } = await supabase
      .from("fixed_cost_templates")
      .select("items")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) {
      if (!isMissingTableError(error)) {
        console.warn("[schedule] fixed_cost_templates fetch failed", error);
      }
      return [];
    }
    return Array.isArray(data?.items) ? (data.items as FixedCostItem[]) : [];
  } catch (e) {
    console.warn("[schedule] fixed_cost_templates fetch failed", e);
    return [];
  }
}

export async function fetchMonthExpenses(
  supabase: SupabaseClient,
  tenantId: string,
  month: Date,
): Promise<ScheduleCalendarEvent[]> {
  const startIso = startOfMonth(month).toISOString();
  const endIso = endOfMonth(month).toISOString();
  const events: ScheduleCalendarEvent[] = [];

  const [simpleRes, ocrRes] = await Promise.all([
    supabase
      .from("simple_expenses")
      .select("id, amount, description, expense_date, supplier, category")
      .eq("tenant_id", tenantId)
      .gte("expense_date", startIso)
      .lte("expense_date", endIso)
      .limit(500),
    supabase
      .from("expenses")
      .select("id, amount, description, expense_date, sub_category, category")
      .eq("tenant_id", tenantId)
      .gte("expense_date", startIso)
      .lte("expense_date", endIso)
      .limit(500),
  ]);

  if (simpleRes.error && !isMissingTableError(simpleRes.error)) {
    console.warn("[schedule] simple_expenses fetch failed", simpleRes.error);
  }
  if (ocrRes.error && !isMissingTableError(ocrRes.error)) {
    console.warn("[schedule] expenses fetch failed", ocrRes.error);
  }

  for (const row of simpleRes.error ? [] : simpleRes.data || []) {
    const ymd = format(new Date(row.expense_date), "yyyy-MM-dd");
    const isFixedCost = 
      row.category === "고정비" || 
      fixedCostCategories.has(row.category) || 
      fixedCostCategories.has(row.description) ||
      fixedCostCategories.has(row.supplier);
    
    events.push({
      id: `simple-${row.id}`,
      kind: isFixedCost ? "fixed_cost" : "expense",
      dateYmd: ymd,
      title: row.description || row.supplier || "지출",
      subtitle: row.supplier || undefined,
      amount: Number(row.amount) || 0,
      href: "/dashboard/expenses",
    });
  }

  for (const row of ocrRes.error ? [] : ocrRes.data || []) {
    const ymd = format(new Date(row.expense_date), "yyyy-MM-dd");
    const isFixedCost = 
      row.category === "고정비" || 
      fixedCostCategories.has(row.category) ||
      fixedCostCategories.has(row.sub_category) ||
      fixedCostCategories.has(row.description);

    events.push({
      id: `exp-${row.id}`,
      kind: isFixedCost ? "fixed_cost" : "expense",
      dateYmd: ymd,
      title: row.description || "지출",
      subtitle: row.sub_category || row.category,
      amount: Number(row.amount) || 0,
      href: "/dashboard/expenses",
    });
  }

  return events;
}

const STAFF_SETTINGS_PREFIX = "calendar_staff_";

export function staffSettingsId(tenantId: string) {
  return `${STAFF_SETTINGS_PREFIX}${tenantId}`;
}

export async function fetchStaffShifts(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<StaffShift[]> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("data")
      .eq("id", staffSettingsId(tenantId))
      .maybeSingle();
    if (error) {
      console.warn("[schedule] staff shifts fetch failed", error);
      return [];
    }
    const shifts = (data?.data as { shifts?: StaffShift[] } | null)?.shifts;
    return Array.isArray(shifts) ? shifts : [];
  } catch (e) {
    console.warn("[schedule] staff shifts fetch failed", e);
    return [];
  }
}

export async function saveStaffShifts(
  supabase: SupabaseClient,
  tenantId: string,
  shifts: StaffShift[],
): Promise<void> {
  const { error } = await supabase.from("system_settings").upsert(
    {
      id: staffSettingsId(tenantId),
      tenant_id: tenantId,
      data: { shifts },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

const NOTE_SETTINGS_PREFIX = "calendar_notes_";

export function noteSettingsId(tenantId: string) {
  return `${NOTE_SETTINGS_PREFIX}${tenantId}`;
}

export async function fetchScheduleNotes(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<ScheduleNote[]> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("data")
      .eq("id", noteSettingsId(tenantId))
      .maybeSingle();
    if (error) {
      console.warn("[schedule] notes fetch failed", error);
      return [];
    }
    const notes = (data?.data as { notes?: ScheduleNote[] } | null)?.notes;
    return Array.isArray(notes) ? notes : [];
  } catch (e) {
    console.warn("[schedule] notes fetch failed", e);
    return [];
  }
}

export async function saveScheduleNotes(
  supabase: SupabaseClient,
  tenantId: string,
  notes: ScheduleNote[],
): Promise<void> {
  const { error } = await supabase.from("system_settings").upsert(
    {
      id: noteSettingsId(tenantId),
      tenant_id: tenantId,
      data: { notes },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

function effectiveDueDay(dueDay: number, year: number, monthIndex: number): number | null {
  const last = lastDayOfMonth(new Date(year, monthIndex, 1)).getDate();
  const d = Math.min(Math.max(1, dueDay), last);
  return d;
}

export function buildFixedCostEventsForMonth(
  items: FixedCostItem[],
  month: Date,
): ScheduleCalendarEvent[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const events: ScheduleCalendarEvent[] = [];

  for (const item of items) {
    if (item.isActive === false || !item.dueDay) continue;
    const due = effectiveDueDay(item.dueDay, year, monthIndex);
    if (!due) continue;

    const dateYmd = format(new Date(year, monthIndex, due), "yyyy-MM-dd");
    if (!days.some((d) => format(d, "yyyy-MM-dd") === dateYmd)) continue;

    events.push({
      id: `fixed-${item.id}-${dateYmd}`,
      kind: "fixed_cost",
      dateYmd,
      title: item.name,
      subtitle: item.supplier || item.subCategory,
      amount: item.amount,
      href: "/dashboard/expenses",
    });
  }

  return events;
}

/** 고정비 암호 잠금 시 캘린더·일정 시트에 노출할 최소 정보만 남김 */
export function maskFixedCostScheduleEvents(
  events: ScheduleCalendarEvent[],
  masked: boolean,
): ScheduleCalendarEvent[] {
  if (!masked) return events;
  return events.map((ev) =>
    ev.kind === "fixed_cost"
      ? {
          ...ev,
          title: "고정비",
          subtitle: "암호 입력 후 확인",
          amount: undefined,
          href: undefined,
        }
      : ev,
  );
}

export function ordersToScheduleEvents(orders: Order[]): ScheduleCalendarEvent[] {
  const events: ScheduleCalendarEvent[] = [];

  for (const order of orders) {
    const isPickup = order.receipt_type === "pickup_reservation";
    const isDelivery = order.receipt_type === "delivery_reservation";
    if (!isPickup && !isDelivery) continue;

    const dateYmd = getScheduleDate(order);
    if (!dateYmd) continue;

    const itemName =
      order.items && order.items.length > 0
        ? order.items.length > 1
          ? `${order.items[0].name} 외 ${order.items.length - 1}`
          : order.items[0].name
        : "주문";

    if (isPickup) {
      events.push({
        id: `pickup-${order.id}`,
        kind: "pickup",
        dateYmd,
        title: itemName,
        subtitle: order.orderer?.name,
        time: order.pickup_info?.time,
        href: `/dashboard/orders/${order.id}`,
      });
    }
    if (isDelivery) {
      events.push({
        id: `delivery-${order.id}`,
        kind: "delivery",
        dateYmd,
        title: itemName,
        subtitle: order.delivery_info?.recipientName || order.orderer?.name,
        time: order.delivery_info?.time,
        href: `/dashboard/orders/${order.id}`,
      });
    }
  }

  return events;
}

export function staffShiftsToEvents(shifts: StaffShift[]): ScheduleCalendarEvent[] {
  return shifts.map((s) => ({
    id: `staff-${s.id}`,
    kind: "staff" as const,
    dateYmd: s.dateYmd,
    title: s.staffName,
    subtitle: s.memo,
    time: s.startTime && s.endTime ? `${s.startTime}–${s.endTime}` : s.startTime,
  }));
}

export function scheduleNotesToEvents(notes: ScheduleNote[]): ScheduleCalendarEvent[] {
  return notes.map((n) => ({
    id: `note-${n.id}`,
    kind: "note" as const,
    dateYmd: n.dateYmd,
    title: n.content,
  }));
}

export async function fetchStaffLeaveForMonth(
  supabase: SupabaseClient,
  tenantId: string,
  month: Date,
): Promise<StaffLeaveRequest[]> {
  const startStr = format(startOfMonth(month), "yyyy-MM-dd");
  const endStr = format(endOfMonth(month), "yyyy-MM-dd");

  try {
    const { data, error } = await supabase
      .from("staff_leave_requests")
      .select(STAFF_LEAVE_SELECT)
      .eq("tenant_id", tenantId)
      .neq("status", "rejected")
      .lte("start_date", endStr)
      .gte("end_date", startStr)
      .order("start_date", { ascending: true });

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn("[schedule] staff_leave_requests fetch failed", error);
      }
      return [];
    }
    return (data ?? []).map((row) => {
      const staffRaw = row.tenant_staff;
      const staff = Array.isArray(staffRaw) ? staffRaw[0] : staffRaw;
      return { ...row, tenant_staff: staff } as StaffLeaveRequest;
    });
  } catch (e) {
    console.warn("[schedule] staff_leave_requests fetch failed", e);
    return [];
  }
}

export function leaveRequestsToEvents(requests: StaffLeaveRequest[]): ScheduleCalendarEvent[] {
  return expandLeaveToDayMarkers(requests).map((m) => ({
    id: `leave-${m.leaveId}-${m.dateYmd}`,
    kind: "leave" as const,
    dateYmd: m.dateYmd,
    title: `${m.staffName} · ${m.leaveType}`,
    subtitle: m.status === "pending" ? "승인대기" : undefined,
    href: "/dashboard/staff/leave",
  }));
}

export async function loadScheduleMonthEvents(
  supabase: SupabaseClient,
  tenantId: string,
  month: Date,
): Promise<ScheduleCalendarEvent[]> {
  const [ordersResult, fixedResult, expensesResult, staffResult, notesResult, leaveResult] =
    await Promise.allSettled([
      fetchScheduleOrdersForMonth(supabase, tenantId, month),
      fetchFixedCostTemplateItems(supabase, tenantId),
      fetchMonthExpenses(supabase, tenantId, month),
      fetchStaffShifts(supabase, tenantId),
      fetchScheduleNotes(supabase, tenantId),
      fetchStaffLeaveForMonth(supabase, tenantId, month),
    ]);

  const orders = ordersResult.status === "fulfilled" ? ordersResult.value : [];
  const fixedItems = fixedResult.status === "fulfilled" ? fixedResult.value : [];
  const expenses = expensesResult.status === "fulfilled" ? expensesResult.value : [];
  const staff = staffResult.status === "fulfilled" ? staffResult.value : [];
  const notes = notesResult.status === "fulfilled" ? notesResult.value : [];
  const leaves = leaveResult.status === "fulfilled" ? leaveResult.value : [];

  if (ordersResult.status === "rejected") {
    console.warn("[schedule] orders fetch failed", ordersResult.reason);
  }
  if (fixedResult.status === "rejected") {
    console.warn("[schedule] fixed costs fetch failed", fixedResult.reason);
  }
  if (expensesResult.status === "rejected") {
    console.warn("[schedule] expenses fetch failed", expensesResult.reason);
  }
  if (staffResult.status === "rejected") {
    console.warn("[schedule] staff fetch failed", staffResult.reason);
  }
  if (notesResult.status === "rejected") {
    console.warn("[schedule] notes fetch failed", notesResult.reason);
  }
  if (leaveResult.status === "rejected") {
    console.warn("[schedule] leave fetch failed", leaveResult.reason);
  }

  const staffInMonth = staff.filter((s) => {
    const d = new Date(s.dateYmd);
    return d >= startOfMonth(month) && d <= endOfMonth(month);
  });
  
  const notesInMonth = notes.filter((n) => {
    const d = new Date(n.dateYmd);
    return d >= startOfMonth(month) && d <= endOfMonth(month);
  });

  return [
    ...ordersToScheduleEvents(orders),
    ...buildFixedCostEventsForMonth(fixedItems, month),
    ...expenses,
    ...staffShiftsToEvents(staffInMonth),
    ...scheduleNotesToEvents(notesInMonth),
    ...leaveRequestsToEvents(leaves),
  ];
}
