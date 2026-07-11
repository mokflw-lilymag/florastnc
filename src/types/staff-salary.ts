/** 고용 형태: 급여·4대보험·주휴수당 계산 기준 */
export type EmploymentType = "정직원" | "파트타임" | "프리랜서";
export type SalaryType = "월급" | "시급";
export type CompensationModel = "annual" | "monthly" | "hourly" | "project";
export type SalaryStatementStatus = "draft" | "confirmed" | "sent";
export type LeaveType = "연차" | "반차" | "병가" | "무급" | "기타";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface StaffFinancial {
  id?: string;
  tenant_id?: string;
  staff_id: string;
  employment_type: EmploymentType;
  salary_type: SalaryType;
  compensation_model: CompensationModel;
  annual_salary: number;
  base_salary: number;
  meal_allowance_monthly: number;
  insurance_national_pension: boolean;
  insurance_health: boolean;
  insurance_employment: boolean;
  bank_name?: string | null;
  account_number?: string | null;
  tax_note?: string | null;
}

export interface StaffSalaryStatement {
  id?: string;
  tenant_id?: string;
  staff_id: string;
  payment_year_month: string;
  employment_type: EmploymentType;
  worked_minutes: number;
  weekly_holiday_minutes: number;
  base_pay: number;
  overtime_pay: number;
  weekly_holiday_pay: number;
  meal_allowance: number;
  other_allowance_name?: string | null;
  other_allowance: number;
  gross_pay: number;
  national_pension: number;
  health_insurance: number;
  long_term_care: number;
  employment_insurance: number;
  income_tax: number;
  local_income_tax: number;
  freelancer_tax: number;
  total_deductions: number;
  net_pay: number;
  status: SalaryStatementStatus;
  emailed_at?: string | null;
  memo?: string | null;
}

export interface StaffLeaveRequest {
  id: string;
  tenant_id: string;
  staff_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string | null;
  contact?: string | null;
  status: LeaveStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  reject_reason?: string | null;
  created_at?: string;
  tenant_staff?: { name: string } | null;
}

export const STAFF_FINANCIAL_SELECT =
  "id, tenant_id, staff_id, employment_type, salary_type, compensation_model, annual_salary, base_salary, meal_allowance_monthly, insurance_national_pension, insurance_health, insurance_employment, bank_name, account_number, tax_note";

export const STAFF_SALARY_SELECT =
  "id, tenant_id, staff_id, payment_year_month, employment_type, worked_minutes, weekly_holiday_minutes, base_pay, overtime_pay, weekly_holiday_pay, meal_allowance, other_allowance_name, other_allowance, gross_pay, national_pension, health_insurance, long_term_care, employment_insurance, income_tax, local_income_tax, freelancer_tax, total_deductions, net_pay, status, emailed_at, memo";

export const STAFF_LEAVE_SELECT =
  "id, tenant_id, staff_id, leave_type, start_date, end_date, reason, contact, status, approved_by, approved_at, reject_reason, created_at, tenant_staff(name)";
