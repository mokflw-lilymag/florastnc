import { krPayrollCalculator } from "@/lib/payroll/calculators/kr";
import { manualPayrollCalculator } from "@/lib/payroll/calculators/manual";
import type {
  PayrollCalculator,
  PayrollTenantConfig,
  SalaryCalcInput,
} from "@/lib/payroll/types";
import type { StaffSalaryStatement } from "@/types/staff-salary";

const calculators: Record<string, PayrollCalculator> = {
  KR: krPayrollCalculator,
  MANUAL: manualPayrollCalculator,
};

export function getPayrollCalculator(
  payroll: PayrollTenantConfig,
): PayrollCalculator {
  if (payroll.payrollMode === "manual") {
    return calculators.MANUAL;
  }
  return calculators[payroll.payrollJurisdiction] ?? calculators.MANUAL;
}

export function buildPayrollStatement(
  input: SalaryCalcInput,
): StaffSalaryStatement {
  const calculator = getPayrollCalculator(input.payroll);
  return calculator.buildStatement(input);
}

export { krPayrollCalculator, manualPayrollCalculator };
