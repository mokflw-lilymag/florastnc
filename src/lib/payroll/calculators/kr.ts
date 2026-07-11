import {
  calculateDeductions,
  calculateMonthlyOvertime,
  calculateWeeklyHolidayWeeks,
  impliedHourlyFromMonthly,
  sumWeeklyHoliday,
} from "@/lib/staff-salary-calc";
import {
  monthlyBaseFromFinancial,
  type PayrollCalculator,
  type SalaryCalcInput,
} from "@/lib/payroll/types";

export const krPayrollCalculator: PayrollCalculator = {
  id: "KR",
  label: "대한민국",
  supportsAuto: true,
  buildStatement(input) {
    const {
      financial,
      paymentYearMonth,
      dailyRows,
      otherAllowance = 0,
      otherAllowanceName,
      mealAllowanceOverride,
      payroll,
      applyAutoAdjustments = true,
    } = input;

    const staffRows = dailyRows.filter((r) => r.staffId === financial.staff_id);
    const workedMinutes = staffRows.reduce((s, r) => s + r.paidMinutes, 0);
    const hourlyRate =
      input.hourlyRate ??
      (financial.salary_type === "시급" ? financial.base_salary : 0);

    let base_pay = 0;
    let weekly_holiday_pay = 0;
    let weekly_holiday_minutes = 0;
    let overtime_pay = 0;
    let overtime_minutes = 0;

    if (financial.employment_type === "파트타임" && financial.salary_type === "시급") {
      const ot = calculateMonthlyOvertime(staffRows, paymentYearMonth, hourlyRate);
      base_pay = Math.floor((ot.regularMinutes / 60) * hourlyRate);
      overtime_minutes = ot.overtimeMinutes;
      overtime_pay =
        !applyAutoAdjustments && input.overtimePay !== undefined
          ? Math.max(0, Math.floor(input.overtimePay))
          : ot.overtimePay;

      const weeks = calculateWeeklyHolidayWeeks(
        staffRows,
        paymentYearMonth,
        hourlyRate,
      );
      const wh = sumWeeklyHoliday(weeks);
      weekly_holiday_pay = wh.pay;
      weekly_holiday_minutes = wh.minutes;
    } else if (financial.employment_type === "프리랜서") {
      base_pay = Math.floor(financial.base_salary);
    } else {
      base_pay = monthlyBaseFromFinancial(financial, payroll);
      const impliedHourly = impliedHourlyFromMonthly(base_pay);
      if (impliedHourly > 0 && workedMinutes > 0) {
        const ot = calculateMonthlyOvertime(
          staffRows,
          paymentYearMonth,
          impliedHourly,
        );
        overtime_minutes = ot.overtimeMinutes;
        overtime_pay =
          !applyAutoAdjustments && input.overtimePay !== undefined
            ? Math.max(0, Math.floor(input.overtimePay))
            : ot.overtimePay;
      } else if (!applyAutoAdjustments && input.overtimePay !== undefined) {
        overtime_pay = Math.max(0, Math.floor(input.overtimePay));
      }
    }

    const meal_allowance = Math.floor(
      mealAllowanceOverride ?? financial.meal_allowance_monthly ?? 0,
    );

    const gross_pay =
      base_pay + overtime_pay + weekly_holiday_pay + meal_allowance + otherAllowance;

    const incomeTaxManual =
      !applyAutoAdjustments && input.incomeTaxManual !== undefined
        ? Math.max(0, Math.floor(input.incomeTaxManual))
        : undefined;

    const deductions = calculateDeductions({
      employmentType: financial.employment_type,
      grossPay: gross_pay,
      mealAllowance: meal_allowance,
      financial,
      incomeTaxManual,
      autoIncomeTax: incomeTaxManual === undefined,
    });

    const net_pay = gross_pay - deductions.total_deductions;

    const otHours = Math.floor(overtime_minutes / 60);
    const otMins = overtime_minutes % 60;
    const otNote =
      overtime_minutes > 0
        ? `연장 ${otHours}시간${otMins > 0 ? ` ${otMins}분` : ""} (주 40h 초과, 시급×1.5)`
        : null;

    return {
      staff_id: financial.staff_id,
      payment_year_month: paymentYearMonth,
      employment_type: financial.employment_type,
      worked_minutes: workedMinutes,
      weekly_holiday_minutes,
      base_pay,
      overtime_pay,
      weekly_holiday_pay,
      meal_allowance,
      other_allowance_name: otherAllowanceName ?? null,
      other_allowance: otherAllowance,
      gross_pay,
      ...deductions,
      net_pay,
      status: "draft",
      memo: otNote,
    };
  },
};
