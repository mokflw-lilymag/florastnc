import type { PayrollCalculator } from "@/lib/payroll/types";
import { monthlyBaseFromFinancial } from "@/lib/payroll/types";
import { resolveManualDeductions } from "@/lib/payroll/calculators/manual-deductions";

/** 해외·미지원 국가: 자동 법규 계산 없이 수동/단순 환산만 */
export const manualPayrollCalculator: PayrollCalculator = {
  id: "MANUAL",
  label: "수동 (글로벌)",
  supportsAuto: false,
  buildStatement(input) {
    const {
      financial,
      paymentYearMonth,
      dailyRows,
      payroll,
      overtimePay = 0,
      otherAllowance = 0,
      otherAllowanceName,
      mealAllowanceOverride,
      manualGrossPay,
      manualDeductions,
      manualIncomeTax,
      manualLocalTax,
      manualInsurance,
    } = input;

    const staffRows = dailyRows.filter((r) => r.staffId === financial.staff_id);
    const workedMinutes = staffRows.reduce((s, r) => s + r.paidMinutes, 0);

    let base_pay: number;
    if (manualGrossPay !== undefined && manualGrossPay > 0) {
      base_pay = Math.floor(manualGrossPay);
    } else if (financial.compensation_model === "hourly") {
      base_pay = Math.floor((workedMinutes / 60) * financial.base_salary);
    } else if (financial.compensation_model === "annual" && financial.annual_salary > 0) {
      base_pay = monthlyBaseFromFinancial(financial, payroll);
    } else {
      base_pay = Math.floor(financial.base_salary);
    }

    const meal_allowance = Math.floor(
      mealAllowanceOverride ?? financial.meal_allowance_monthly ?? 0,
    );

    const gross_pay = base_pay + overtimePay + meal_allowance + otherAllowance;

    const deductions = resolveManualDeductions({
      manualIncomeTax,
      manualLocalTax,
      manualInsurance,
      manualDeductions,
    });

    const net_pay = gross_pay - deductions.total_deductions;

    return {
      staff_id: financial.staff_id,
      payment_year_month: paymentYearMonth,
      employment_type: financial.employment_type,
      worked_minutes: workedMinutes,
      weekly_holiday_minutes: 0,
      base_pay,
      overtime_pay: overtimePay,
      weekly_holiday_pay: 0,
      meal_allowance,
      other_allowance_name: otherAllowanceName ?? null,
      other_allowance: otherAllowance,
      gross_pay,
      national_pension: deductions.national_pension,
      health_insurance: deductions.health_insurance,
      long_term_care: deductions.long_term_care,
      employment_insurance: deductions.employment_insurance,
      income_tax: deductions.income_tax,
      local_income_tax: deductions.local_income_tax,
      freelancer_tax: 0,
      total_deductions: deductions.total_deductions,
      net_pay,
      status: "draft",
      memo: "Manual payroll — verify local tax and labor rules.",
    };
  },
};
