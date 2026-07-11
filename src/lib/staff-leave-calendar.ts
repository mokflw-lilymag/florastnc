import {
  eachDayOfInterval,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import type { StaffLeaveRequest } from "@/types/staff-salary";

export type LeaveDayStatus = "approved" | "pending" | "rejected";

export interface LeaveDayMarker {
  dateYmd: string;
  leaveId: string;
  staffName: string;
  leaveType: string;
  status: LeaveDayStatus;
}

/** 휴가 기간을 일별 마커로 펼칩니다 */
export function expandLeaveToDayMarkers(
  requests: StaffLeaveRequest[],
): LeaveDayMarker[] {
  const markers: LeaveDayMarker[] = [];

  for (const req of requests) {
    if (req.status === "rejected") continue;
    try {
      const start = parseISO(req.start_date);
      const end = parseISO(req.end_date);
      if (end < start) continue;

      for (const day of eachDayOfInterval({ start, end })) {
        markers.push({
          dateYmd: format(day, "yyyy-MM-dd"),
          leaveId: req.id,
          staffName: req.tenant_staff?.name ?? "직원",
          leaveType: req.leave_type,
          status: req.status as LeaveDayStatus,
        });
      }
    } catch {
      // skip invalid dates
    }
  }

  return markers;
}

export function markersForMonth(
  markers: LeaveDayMarker[],
  month: Date,
): Map<string, LeaveDayMarker[]> {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const map = new Map<string, LeaveDayMarker[]>();

  for (const m of markers) {
    const d = parseISO(m.dateYmd);
    if (!isWithinInterval(d, { start: monthStart, end: monthEnd })) continue;
    const bucket = map.get(m.dateYmd);
    if (bucket) bucket.push(m);
    else map.set(m.dateYmd, [m]);
  }

  return map;
}

export function leaveStatusColor(status: LeaveDayStatus): string {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}
