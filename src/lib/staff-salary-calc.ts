import type { DailyAttendanceRow } from "@/lib/staff-attendance-hours";
import { estimateKrSimpleIncomeTax } from "@/lib/payroll/kr-income-tax";
import type { EmploymentType, StaffFinancial, StaffSalaryStatement } from "@/types/staff-salary";

/** 근로기준법 기준 주휴수당 산정 최소 주간 근로시간 (15시간) */
export const WEEKLY_HOLIDAY_MIN_HOURS = 15;

/** 주 소정근로시간 (연장수당 산정 기준) */
export const WEEKLY_STANDARD_HOURS = 40;

/** 연장근로 가산율 (시급 × 1.5) */
export const OVERTIME_PAY_MULTIPLIER = 1.5;

/** 월 소정근로시간 (정직원 시급 환산용, 근로기준법 기준) */
export const MONTHLY_STANDARD_HOURS = 209;

/** 4대보험 요율 (근로자 부담분, 2025~2026 기준 근사치 — 실제는 매년 고시 확인 필요) */
export const INSURANCE_RATES = {
  nationalPension: 0.045,
  healthInsurance: 0.03545,
  longTermCareRatio: 0.1295,
  employmentInsurance: 0.009,
} as const;

/** 프리랜서 원천징수 (사업소득 3% + 지방소득 0.3%) */
export const FREELANCER_WITHHOLDING_RATE = 0.033;

/** 식대 비과세 한도 (월, 원) — 소득세법 기준 근사 */
export const MEAL_ALLOWANCE_TAX_FREE_CAP = 200_000;

export interface WeeklyHolidayWeek {
  weekKey: string;
  weeklyPaidMinutes: number;
  workDayCount: number;
  eligible: boolean;
  holidayMinutes: number;
  holidayPay: number;
}

export interface SalaryCalcInput {
  financial: StaffFinancial;
  paymentYearMonth: string;
  dailyRows: DailyAttendanceRow[];
  hourlyRate?: number;
  overtimePay?: number;
  otherAllowance?: number;
  otherAllowanceName?: string;
  incomeTaxManual?: number;
  mealAllowanceOverride?: number;
}

export function defaultInsuranceFlags(employmentType: EmploymentType): Pick<
  StaffFinancial,
  "insurance_national_pension" | "insurance_health" | "insurance_employment"
> {
  switch (employmentType) {
    case "정직원":
      return {
        insurance_national_pension: true,
        insurance_health: true,
        insurance_employment: true,
      };
    case "파트타임":
      return {
        insurance_national_pension: false,
        insurance_health: false,
        insurance_employment: true,
      };
    case "프리랜서":
      return {
        insurance_national_pension: false,
        insurance_health: false,
        insurance_employment: false,
      };
  }
}

export function defaultSalaryType(employmentType: EmploymentType): "월급" | "시급" {
  return employmentType === "파트타임" ? "시급" : "월급";
}

/** ISO 주(월요일 시작) 키 */
export function weekKeyMonday(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function inYearMonth(dateKey: string, yearMonth: string): boolean {
  return dateKey.startsWith(yearMonth);
}

/**
 * 주휴수당 (근로기준법 제55조, 시간제 근로자)
 * 주 15시간 이상 + 해당 주 근무일이 1일 이상 → (주 소정근로시간 ÷ 40) × 8 × 시급
 * 소정근로시간 = 해당 주 실제 유급 근무시간 (출퇴근 기록 기반)
 */
export function calculateWeeklyHolidayWeeks(
  dailyRows: DailyAttendanceRow[],
  paymentYearMonth: string,
  hourlyRate: number,
): WeeklyHolidayWeek[] {
  const byWeek = new Map<string, { minutes: number; days: Set<string> }>();

  for (const row of dailyRows) {
    if (!inYearMonth(row.dateKey, paymentYearMonth)) continue;
    const wk = weekKeyMonday(row.dateKey);
    const bucket = byWeek.get(wk) ?? { minutes: 0, days: new Set<string>() };
    bucket.minutes += row.paidMinutes;
    if (row.paidMinutes > 0) bucket.days.add(row.dateKey);
    byWeek.set(wk, bucket);
  }

  const results: WeeklyHolidayWeek[] = [];

  for (const [wk, data] of byWeek) {
    const weeklyHours = data.minutes / 60;
    const eligible =
      weeklyHours >= WEEKLY_HOLIDAY_MIN_HOURS && data.days.size > 0;
    const holidayHours = eligible ? (weeklyHours / 40) * 8 : 0;
    const holidayMinutes = Math.round(holidayHours * 60);
    const holidayPay = Math.floor(holidayHours * hourlyRate);

    results.push({
      weekKey: wk,
      weeklyPaidMinutes: data.minutes,
      workDayCount: data.days.size,
      eligible,
      holidayMinutes,
      holidayPay,
    });
  }

  return results.sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

export function sumWeeklyHoliday(weeks: WeeklyHolidayWeek[]) {
  return weeks.reduce(
    (acc, w) => ({
      minutes: acc.minutes + w.holidayMinutes,
      pay: acc.pay + w.holidayPay,
    }),
    { minutes: 0, pay: 0 },
  );
}

export interface OvertimeWeekBreakdown {
  weekKey: string;
  weeklyPaidMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  overtimePay: number;
}

export interface MonthlyOvertimeResult {
  regularMinutes: number;
  overtimeMinutes: number;
  overtimePay: number;
  weeks: OvertimeWeekBreakdown[];
}

/**
 * 주 40시간 초과분 연장근로 수당 (근로기준법 — 통상임금 × 1.5)
 * 주별 유급 근무시간이 40시간을 넘는 분만 연장으로 산정합니다.
 */
export function calculateMonthlyOvertime(
  dailyRows: DailyAttendanceRow[],
  paymentYearMonth: string,
  hourlyRate: number,
): MonthlyOvertimeResult {
  const capMinutes = WEEKLY_STANDARD_HOURS * 60;
  const byWeek = new Map<string, number>();

  for (const row of dailyRows) {
    if (!inYearMonth(row.dateKey, paymentYearMonth)) continue;
    const wk = weekKeyMonday(row.dateKey);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + row.paidMinutes);
  }

  let regularMinutes = 0;
  let overtimeMinutes = 0;
  const weeks: OvertimeWeekBreakdown[] = [];

  for (const [weekKey, weeklyPaidMinutes] of byWeek) {
    const regular = Math.min(weeklyPaidMinutes, capMinutes);
    const overtime = Math.max(0, weeklyPaidMinutes - capMinutes);
    const overtimePay = Math.floor(
      (overtime / 60) * hourlyRate * OVERTIME_PAY_MULTIPLIER,
    );
    regularMinutes += regular;
    overtimeMinutes += overtime;
    weeks.push({
      weekKey,
      weeklyPaidMinutes,
      regularMinutes: regular,
      overtimeMinutes: overtime,
      overtimePay,
    });
  }

  weeks.sort((a, b) => a.weekKey.localeCompare(b.weekKey));

  return {
    regularMinutes,
    overtimeMinutes,
    overtimePay: weeks.reduce((s, w) => s + w.overtimePay, 0),
    weeks,
  };
}

export function impliedHourlyFromMonthly(monthlyPay: number): number {
  if (monthlyPay <= 0) return 0;
  return monthlyPay / MONTHLY_STANDARD_HOURS;
}

export interface DeductionResult {
  national_pension: number;
  health_insurance: number;
  long_term_care: number;
  employment_insurance: number;
  income_tax: number;
  local_income_tax: number;
  freelancer_tax: number;
  total_deductions: number;
}

/**
 * 4대보험·세금 공제 (근로자 부담분)
 * - 과세표준 = 총지급액 - 비과세 식대(한도 내)
 * - 소득세는 간이세액표 미적용 시 수동 입력 권장
 */
export function calculateDeductions(options: {
  employmentType: EmploymentType;
  grossPay: number;
  mealAllowance: number;
  financial: StaffFinancial;
  /** 지정 시 해당 금액 사용 (0 포함). 미지정 시 KR 자동 간이세액 근사 */
  incomeTaxManual?: number;
  autoIncomeTax?: boolean;
}): DeductionResult {
  const {
    employmentType,
    grossPay,
    mealAllowance,
    financial,
    incomeTaxManual,
    autoIncomeTax = true,
  } = options;

  if (employmentType === "프리랜서") {
    const freelancerTax = Math.floor(grossPay * FREELANCER_WITHHOLDING_RATE);
    return {
      national_pension: 0,
      health_insurance: 0,
      long_term_care: 0,
      employment_insurance: 0,
      income_tax: 0,
      local_income_tax: 0,
      freelancer_tax: freelancerTax,
      total_deductions: freelancerTax,
    };
  }

  const taxFreeMeal = Math.min(mealAllowance, MEAL_ALLOWANCE_TAX_FREE_CAP);
  const taxablePay = Math.max(0, grossPay - taxFreeMeal);

  let national_pension = 0;
  let health_insurance = 0;
  let long_term_care = 0;
  let employment_insurance = 0;

  if (financial.insurance_national_pension) {
    national_pension = Math.floor(taxablePay * INSURANCE_RATES.nationalPension);
  }
  if (financial.insurance_health) {
    health_insurance = Math.floor(taxablePay * INSURANCE_RATES.healthInsurance);
    long_term_care = Math.floor(
      health_insurance * INSURANCE_RATES.longTermCareRatio,
    );
  }
  if (financial.insurance_employment) {
    employment_insurance = Math.floor(
      taxablePay * INSURANCE_RATES.employmentInsurance,
    );
  }

  let income_tax: number;
  if (incomeTaxManual !== undefined) {
    income_tax = Math.max(0, Math.floor(incomeTaxManual));
  } else if (autoIncomeTax) {
    income_tax = estimateKrSimpleIncomeTax(taxablePay);
  } else {
    income_tax = 0;
  }
  const local_income_tax = Math.floor(income_tax * 0.1);

  const total_deductions =
    national_pension +
    health_insurance +
    long_term_care +
    employment_insurance +
    income_tax +
    local_income_tax;

  return {
    national_pension,
    health_insurance,
    long_term_care,
    employment_insurance,
    income_tax,
    local_income_tax,
    freelancer_tax: 0,
    total_deductions,
  };
}

export function formatKrw(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(amount)) + "원";
}
