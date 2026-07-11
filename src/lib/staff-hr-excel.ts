import { saveAs } from "file-saver";
import type { DailyAttendanceRow } from "@/lib/staff-attendance-hours";
import { formatWorkHours } from "@/lib/staff-attendance-hours";
import type { StaffLeaveRequest, StaffSalaryStatement } from "@/types/staff-salary";
import { formatKrw } from "@/lib/staff-salary-calc";

async function writeXlsx(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  fileName: string,
) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName);
}

export async function exportStaffAttendanceToExcel(
  rows: DailyAttendanceRow[],
  dateFrom: string,
  dateTo: string,
) {
  const headers = [
    "날짜",
    "직원",
    "출근",
    "퇴근",
    "점심휴게(1h)",
    "저녁휴게(1h)",
    "실근무",
    "유급근무",
  ];
  const data = rows.map((r) => [
    r.dateKey,
    r.staffName,
    r.clockIn?.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) ?? "-",
    r.openShift ? "근무중" : r.clockOut?.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) ?? "-",
    r.tookLunch ? "Y" : "N",
    r.tookDinner ? "Y" : "N",
    formatWorkHours(r.rawMinutes),
    formatWorkHours(r.paidMinutes),
  ]);
  await writeXlsx("출퇴근", headers, data, `출퇴근_${dateFrom}_${dateTo}.xlsx`);
}

export async function exportStaffSalaryToExcel(
  statements: (StaffSalaryStatement & { tenant_staff?: { name: string } | null })[],
  yearMonth: string,
) {
  const headers = [
    "직원",
    "고용형태",
    "기본급",
    "주휴수당",
    "연장수당",
    "식대",
    "지급합계",
    "4대보험",
    "소득세",
    "원천징수",
    "공제합계",
    "실수령",
    "상태",
  ];
  const data = statements.map((s) => {
    const ins =
      s.national_pension +
      s.health_insurance +
      s.long_term_care +
      s.employment_insurance;
    return [
      s.tenant_staff?.name ?? s.staff_id,
      s.employment_type,
      s.base_pay,
      s.weekly_holiday_pay,
      s.overtime_pay,
      s.meal_allowance,
      s.gross_pay,
      ins,
      s.income_tax + s.local_income_tax,
      s.freelancer_tax,
      s.total_deductions,
      s.net_pay,
      s.status,
    ];
  });
  await writeXlsx("급여명세", headers, data, `급여명세_${yearMonth}.xlsx`);
}

export async function exportStaffLeaveToExcel(requests: StaffLeaveRequest[]) {
  const headers = ["직원", "유형", "시작일", "종료일", "사유", "상태", "신청일"];
  const statusLabel: Record<string, string> = {
    pending: "대기",
    approved: "승인",
    rejected: "반려",
  };
  const data = requests.map((r) => [
    r.tenant_staff?.name ?? r.staff_id,
    r.leave_type,
    r.start_date,
    r.end_date,
    r.reason ?? "",
    statusLabel[r.status] ?? r.status,
    r.created_at?.slice(0, 10) ?? "",
  ]);
  await writeXlsx("휴가", headers, data, `휴가신청_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export { formatKrw };
