import type { StaffSalaryStatement } from "@/types/staff-salary";

/** 4대보험 근로자 부담분 합계 */
export function socialInsuranceTotal(s: StaffSalaryStatement): number {
  return (
    s.national_pension +
    s.health_insurance +
    s.long_term_care +
    s.employment_insurance
  );
}

/** 원천징수세액 (소득세 + 지방소득세 + 사업소득 3.3%) */
export function withholdingTaxTotal(s: StaffSalaryStatement): number {
  return s.income_tax + s.local_income_tax + s.freelancer_tax;
}

export interface DeductionLine {
  label: string;
  amount: number;
  isSubtotal?: boolean;
}

/** 4대보험 근로자 부담분 항목 */
export function buildInsuranceLines(
  s: StaffSalaryStatement,
  showZero = false,
): DeductionLine[] {
  const lines: DeductionLine[] = [];
  const items: [string, number][] = [
    ["국민연금", s.national_pension],
    ["건강보험", s.health_insurance],
    ["장기요양보험", s.long_term_care],
    ["고용보험", s.employment_insurance],
  ];

  for (const [label, amount] of items) {
    if (amount > 0 || showZero) lines.push({ label, amount });
  }

  const insTotal = socialInsuranceTotal(s);
  if (insTotal > 0 || (showZero && s.employment_type !== "프리랜서")) {
    lines.push({ label: "4대보험 소계", amount: insTotal, isSubtotal: true });
  }

  return lines;
}

/** 원천징수세액 항목 (소득세·지방소득세·프리랜서 3.3%) */
export function buildWithholdingLines(
  s: StaffSalaryStatement,
  showZero = false,
): DeductionLine[] {
  const lines: DeductionLine[] = [];
  const isFreelancer = s.employment_type === "프리랜서";

  if (!isFreelancer) {
    if (s.income_tax > 0 || showZero) {
      lines.push({ label: "소득세", amount: s.income_tax });
    }
    if (s.local_income_tax > 0 || showZero) {
      lines.push({ label: "지방소득세", amount: s.local_income_tax });
    }
  }

  if (s.freelancer_tax > 0 || (showZero && isFreelancer)) {
    lines.push({ label: "사업소득 원천징수 (3.3%)", amount: s.freelancer_tax });
  }

  const whTotal = withholdingTaxTotal(s);
  if (whTotal > 0 || showZero) {
    lines.push({ label: "원천징수세액 소계", amount: whTotal, isSubtotal: true });
  }

  return lines;
}

/** 명세서·화면용 공제 항목 (인쇄용 — 0원 원천징수 항목 포함) */
export function buildDeductionLines(
  s: StaffSalaryStatement,
  opts?: { showZeroWithholding?: boolean },
): DeductionLine[] {
  const showWh = opts?.showZeroWithholding ?? true;
  return [
    ...buildInsuranceLines(s, false),
    ...buildWithholdingLines(s, showWh),
  ];
}
