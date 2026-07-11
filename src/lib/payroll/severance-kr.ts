import type { StaffSalaryStatement } from "@/types/staff-salary";
import type { SeveranceEstimate } from "@/lib/payroll/types";

const MS_PER_DAY = 86_400_000;

function parseDateKey(key: string): Date {
  return new Date(key + "T12:00:00");
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY));
}

/**
 * 퇴직금 예상 (근로자퇴직급여보장법 — 참고용)
 * 1일 평균임금 × 30일 × (근속연수)
 * 1일 평균임금 = 퇴직 전 3개월 총임금 ÷ 3개월 총일수
 */
export function estimateKRSeverance(options: {
  hireDate: string | null | undefined;
  salaryStatements: StaffSalaryStatement[];
  fallbackMonthlyPay: number;
  asOf?: Date;
}): SeveranceEstimate {
  const asOf = options.asOf ?? new Date();
  const asOfKey = asOf.toISOString().slice(0, 10);

  if (!options.hireDate) {
    return {
      jurisdiction: "KR",
      eligible: false,
      hireDate: null,
      asOfDate: asOfKey,
      serviceDays: 0,
      serviceYears: 0,
      dailyAverageWage: 0,
      estimatedAmount: 0,
      basisDescription: "입사일이 등록되지 않았습니다.",
      disclaimer: SEVERANCE_DISCLAIMER,
      recentMonthsUsed: 0,
    };
  }

  const hire = parseDateKey(options.hireDate);
  if (hire > asOf) {
    return {
      jurisdiction: "KR",
      eligible: false,
      hireDate: options.hireDate,
      asOfDate: asOfKey,
      serviceDays: 0,
      serviceYears: 0,
      dailyAverageWage: 0,
      estimatedAmount: 0,
      basisDescription: "입사일이 미래입니다.",
      disclaimer: SEVERANCE_DISCLAIMER,
      recentMonthsUsed: 0,
    };
  }

  const serviceDays = daysBetween(hire, asOf);
  const serviceYears = serviceDays / 365;

  const threeMonthsAgo = new Date(asOf);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const periodStart = threeMonthsAgo.toISOString().slice(0, 10);
  const periodDays = daysBetween(threeMonthsAgo, asOf) || 1;

  const recentStatements = options.salaryStatements.filter((s) => {
    const ym = s.payment_year_month + "-01";
    return ym >= periodStart.slice(0, 7) + "-01" && s.gross_pay > 0;
  });

  let totalWages = recentStatements.reduce((sum, s) => sum + s.gross_pay, 0);
  let recentMonthsUsed = recentStatements.length;

  if (totalWages <= 0 && options.fallbackMonthlyPay > 0) {
    totalWages = options.fallbackMonthlyPay * 3;
    recentMonthsUsed = 0;
  }

  const dailyAverageWage = Math.floor(totalWages / periodDays);
  const estimatedAmount = Math.floor(dailyAverageWage * 30 * serviceYears);

  return {
    jurisdiction: "KR",
    eligible: serviceDays >= 365,
    hireDate: options.hireDate,
    asOfDate: asOfKey,
    serviceDays,
    serviceYears: Math.round(serviceYears * 100) / 100,
    dailyAverageWage,
    estimatedAmount,
    basisDescription:
      recentMonthsUsed > 0
        ? `최근 ${recentMonthsUsed}개월 명세 합계 ${totalWages.toLocaleString("ko-KR")}원 ÷ ${periodDays}일`
        : `월 보수 추정 ${options.fallbackMonthlyPay.toLocaleString("ko-KR")}원 × 3개월 ÷ ${periodDays}일`,
    disclaimer: SEVERANCE_DISCLAIMER,
    recentMonthsUsed,
  };
}

const SEVERANCE_DISCLAIMER =
  "본 퇴직금은 참고용 예상치입니다. 평균임금·근속기간·퇴직금 중간정산 등은 근로자퇴직급여보장법 및 실제 임금 지급 내역에 따라 달라질 수 있습니다.";

export function formatServiceTenure(serviceDays: number): string {
  const years = Math.floor(serviceDays / 365);
  const months = Math.floor((serviceDays % 365) / 30);
  if (years === 0) return `${months}개월`;
  if (months === 0) return `${years}년`;
  return `${years}년 ${months}개월`;
}
