export function resolveManualDeductions(input: {
  manualIncomeTax?: number;
  manualLocalTax?: number;
  manualInsurance?: number;
  manualDeductions?: number;
}) {
  const incomeFromFields = Math.max(0, Math.floor(input.manualIncomeTax ?? 0));
  const local_income_tax = Math.max(0, Math.floor(input.manualLocalTax ?? 0));
  const insuranceSum = Math.max(0, Math.floor(input.manualInsurance ?? 0));

  const legacyDeductions =
    incomeFromFields + local_income_tax + insuranceSum === 0 &&
    input.manualDeductions !== undefined
      ? Math.max(0, Math.floor(input.manualDeductions))
      : 0;

  const income_tax = incomeFromFields > 0 ? incomeFromFields : legacyDeductions;

  let national_pension = 0;
  let health_insurance = 0;
  let long_term_care = 0;
  let employment_insurance = 0;

  if (insuranceSum > 0) {
    employment_insurance = insuranceSum;
  }

  const total_deductions = income_tax + local_income_tax + insuranceSum;

  return {
    income_tax,
    local_income_tax,
    national_pension,
    health_insurance,
    long_term_care,
    employment_insurance,
    total_deductions,
  };
}
