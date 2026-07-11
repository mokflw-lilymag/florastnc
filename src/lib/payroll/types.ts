import type { DailyAttendanceRow } from "@/lib/staff-attendance-hours";
import type {
  CompensationModel,
  EmploymentType,
  StaffFinancial,
  StaffSalaryStatement,
} from "@/types/staff-salary";

export type { CompensationModel, EmploymentType };

/** 급여 관할 국가/지역 코드 (ISO 3166-1 alpha-2) */
export type PayrollJurisdiction = string;

/** auto = 국가 모듈 자동계산, manual = 수당·공제 수동 입력만 */
export type PayrollMode = "auto" | "manual";

export interface PayrollTenantConfig {
  payrollJurisdiction: PayrollJurisdiction;
  payrollMode: PayrollMode;
  /** KR 정직원 기본 보수 방식 */
  fullTimeCompensationModel: CompensationModel;
  country: string;
}

export interface SalaryCalcInput {
  financial: StaffFinancial;
  paymentYearMonth: string;
  dailyRows: DailyAttendanceRow[];
  payroll: PayrollTenantConfig;
  hourlyRate?: number;
  /** 미지정 시 근태 기준 자동 산정 (KR) */
  overtimePay?: number;
  otherAllowance?: number;
  otherAllowanceName?: string;
  /** 미지정 시 간이세액 근사 자동 (KR) */
  incomeTaxManual?: number;
  /** true(기본): 연장수당·소득세 자동 / false: overtimePay·incomeTaxManual 수동 반영 */
  applyAutoAdjustments?: boolean;
  mealAllowanceOverride?: number;
  /** manual 모드: 지급·공제 직접 지정 */
  manualGrossPay?: number;
  manualDeductions?: number;
  manualIncomeTax?: number;
  manualLocalTax?: number;
  manualInsurance?: number;
}

export interface PayrollCalculator {
  id: PayrollJurisdiction;
  label: string;
  supportsAuto: boolean;
  buildStatement(input: SalaryCalcInput): StaffSalaryStatement;
}

export interface SeveranceEstimate {
  jurisdiction: PayrollJurisdiction;
  eligible: boolean;
  hireDate: string | null;
  asOfDate: string;
  serviceDays: number;
  serviceYears: number;
  dailyAverageWage: number;
  estimatedAmount: number;
  basisDescription: string;
  disclaimer: string;
  recentMonthsUsed: number;
}

export const PAYROLL_JURISDICTION_OPTIONS = [
  { code: "KR", label: "대한민국 (4대보험·주휴·퇴직금)" },
  { code: "MANUAL", label: "기타 국가 (수동 명세)" },
] as const;

export function resolvePayrollConfig(settings: {
  country?: string;
  payrollJurisdiction?: string;
  payrollMode?: PayrollMode;
  fullTimeCompensationModel?: CompensationModel;
}): PayrollTenantConfig {
  const country = settings.country || "KR";
  const jurisdiction = settings.payrollJurisdiction || country;
  const mode =
    settings.payrollMode ??
    (jurisdiction === "KR" ? "auto" : "manual");

  return {
    payrollJurisdiction: jurisdiction,
    payrollMode: mode,
    fullTimeCompensationModel: settings.fullTimeCompensationModel ?? "annual",
    country,
  };
}

export function isKrPayroll(payroll: PayrollTenantConfig): boolean {
  return payroll.payrollMode === "auto" && payroll.payrollJurisdiction === "KR";
}

export function monthlyBaseFromFinancial(
  financial: StaffFinancial,
  payroll: PayrollTenantConfig,
): number {
  if (
    financial.employment_type === "정직원" &&
    financial.compensation_model === "annual" &&
    financial.annual_salary > 0
  ) {
    return Math.floor(financial.annual_salary / 12);
  }
  if (financial.compensation_model === "monthly" || financial.salary_type === "월급") {
    return Math.floor(financial.base_salary);
  }
  return Math.floor(financial.base_salary);
}

export function syncFinancialFromAnnual(financial: StaffFinancial): StaffFinancial {
  if (
    financial.employment_type === "정직원" &&
    financial.compensation_model === "annual" &&
    financial.annual_salary > 0
  ) {
    return {
      ...financial,
      salary_type: "월급",
      base_salary: Math.floor(financial.annual_salary / 12),
    };
  }
  return financial;
}

export function defaultCompensationModel(
  employmentType: EmploymentType,
  payroll: PayrollTenantConfig,
): CompensationModel {
  if (employmentType === "파트타임") return "hourly";
  if (employmentType === "프리랜서") return "project";
  return payroll.fullTimeCompensationModel === "monthly" ? "monthly" : "annual";
}
