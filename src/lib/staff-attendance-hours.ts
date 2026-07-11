export const LUNCH_BREAK_MINUTES = 60;
export const DINNER_BREAK_MINUTES = 60;

export interface AttendanceLogLike {
  staff_id: string;
  type: "clock_in" | "clock_out";
  recorded_at: string;
}

export interface AttendanceLogDetail extends AttendanceLogLike {
  id: string;
  tenant_staff?: { name: string } | null;
}

export interface DayBreakFlags {
  tookLunch: boolean;
  tookDinner: boolean;
}

/** key: `${staffId}:${YYYY-MM-DD}` */
export type AttendanceDayBreaks = Record<string, DayBreakFlags>;

export interface DailyAttendanceRow {
  key: string;
  staffId: string;
  staffName: string;
  dateKey: string;
  clockIn: Date | null;
  clockOut: Date | null;
  rawMinutes: number;
  tookLunch: boolean;
  tookDinner: boolean;
  lunchMinutes: number;
  dinnerMinutes: number;
  paidMinutes: number;
  openShift: boolean;
  logIds: string[];
}

export interface StaffWorkHoursSummary {
  staffId: string;
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  clockIns: number;
  clockOuts: number;
  openShift: boolean;
}

export interface WorkHoursOptions {
  dayBreaks?: AttendanceDayBreaks;
  now?: Date;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeekMonday(date: Date): Date {
  const d = startOfDay(date);
  const weekday = d.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  d.setDate(d.getDate() - daysFromMonday);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dayBreakKey(staffId: string, dateKey: string): string {
  return `${staffId}:${dateKey}`;
}

export function getDayBreakFlags(
  dayBreaks: AttendanceDayBreaks | undefined,
  staffId: string,
  dateKey: string,
): DayBreakFlags {
  return dayBreaks?.[dayBreakKey(staffId, dateKey)] ?? {
    tookLunch: false,
    tookDinner: false,
  };
}

export function calculatePaidMinutesWithBreaks(
  rawMinutes: number,
  breaks: DayBreakFlags,
): { lunchMinutes: number; dinnerMinutes: number; paidMinutes: number } {
  const lunchMinutes = breaks.tookLunch ? LUNCH_BREAK_MINUTES : 0;
  const dinnerMinutes = breaks.tookDinner ? DINNER_BREAK_MINUTES : 0;
  const paidMinutes = Math.max(0, rawMinutes - lunchMinutes - dinnerMinutes);
  return { lunchMinutes, dinnerMinutes, paidMinutes };
}

function pairShifts(logs: AttendanceLogLike[]): { start: Date; end: Date | null }[] {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );

  const shifts: { start: Date; end: Date | null }[] = [];
  let openIn: Date | null = null;

  for (const log of sorted) {
    const at = new Date(log.recorded_at);
    if (log.type === "clock_in") {
      openIn = at;
    } else if (log.type === "clock_out" && openIn) {
      shifts.push({ start: openIn, end: at });
      openIn = null;
    }
  }

  if (openIn) {
    shifts.push({ start: openIn, end: null });
  }

  return shifts;
}

function shiftMinutes(start: Date, end: Date | null, now: Date): number {
  const effectiveEnd = end ?? now;
  if (effectiveEnd.getTime() <= start.getTime()) return 0;
  return Math.round((effectiveEnd.getTime() - start.getTime()) / 60_000);
}

export function buildDailyAttendanceRows(
  logs: AttendanceLogDetail[],
  options: WorkHoursOptions = {},
): DailyAttendanceRow[] {
  const dayBreaks = options.dayBreaks ?? {};
  const now = options.now ?? new Date();
  const grouped = new Map<string, AttendanceLogDetail[]>();

  for (const log of logs) {
    const dateKey = localDateKey(new Date(log.recorded_at));
    const key = dayBreakKey(log.staff_id, dateKey);
    const bucket = grouped.get(key);
    if (bucket) bucket.push(log);
    else grouped.set(key, [log]);
  }

  const rows: DailyAttendanceRow[] = [];

  for (const [key, dayLogs] of grouped) {
    const [staffId, dateKey] = key.split(":");
    const staffName = dayLogs[0]?.tenant_staff?.name || "알 수 없음";
    const breaks = getDayBreakFlags(dayBreaks, staffId, dateKey);
    const shifts = pairShifts(dayLogs);
    let rawMinutes = 0;
    let clockIn: Date | null = null;
    let clockOut: Date | null = null;
    let openShift = false;
    const logIds = dayLogs.map((log) => log.id);

    for (const shift of shifts) {
      rawMinutes += shiftMinutes(shift.start, shift.end, now);
      if (!clockIn || shift.start < clockIn) clockIn = shift.start;
      if (shift.end) {
        if (!clockOut || shift.end > clockOut) clockOut = shift.end;
      } else {
        openShift = true;
      }
    }

    const { lunchMinutes, dinnerMinutes, paidMinutes } = calculatePaidMinutesWithBreaks(
      rawMinutes,
      breaks,
    );

    rows.push({
      key,
      staffId,
      staffName,
      dateKey,
      clockIn,
      clockOut,
      rawMinutes,
      tookLunch: breaks.tookLunch,
      tookDinner: breaks.tookDinner,
      lunchMinutes,
      dinnerMinutes,
      paidMinutes,
      openShift,
      logIds,
    });
  }

  return rows.sort((a, b) => {
    const dateCompare = b.dateKey.localeCompare(a.dateKey);
    if (dateCompare !== 0) return dateCompare;
    return a.staffName.localeCompare(b.staffName, "ko");
  });
}

export function summarizeStaffWorkHours(
  dailyRows: DailyAttendanceRow[],
  logs: AttendanceLogLike[],
  options: WorkHoursOptions = {},
): StaffWorkHoursSummary[] {
  const now = options.now ?? new Date();
  const todayKey = localDateKey(now);
  const weekStartKey = localDateKey(startOfWeekMonday(now));
  const monthStartKey = localDateKey(startOfMonth(now));

  const byStaff = new Map<string, StaffWorkHoursSummary>();

  for (const log of logs) {
    if (!byStaff.has(log.staff_id)) {
      byStaff.set(log.staff_id, {
        staffId: log.staff_id,
        todayMinutes: 0,
        weekMinutes: 0,
        monthMinutes: 0,
        clockIns: 0,
        clockOuts: 0,
        openShift: false,
      });
    }
    const summary = byStaff.get(log.staff_id)!;
    if (log.type === "clock_in") summary.clockIns++;
    else summary.clockOuts++;
  }

  for (const row of dailyRows) {
    if (!byStaff.has(row.staffId)) {
      byStaff.set(row.staffId, {
        staffId: row.staffId,
        todayMinutes: 0,
        weekMinutes: 0,
        monthMinutes: 0,
        clockIns: 0,
        clockOuts: 0,
        openShift: false,
      });
    }

    const summary = byStaff.get(row.staffId)!;
    if (row.openShift) summary.openShift = true;

    if (row.dateKey === todayKey) summary.todayMinutes += row.paidMinutes;
    if (row.dateKey >= weekStartKey) summary.weekMinutes += row.paidMinutes;
    if (row.dateKey >= monthStartKey) summary.monthMinutes += row.paidMinutes;
  }

  return Array.from(byStaff.values());
}

export function formatWorkHours(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0분";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

export function formatTimeLabel(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}
