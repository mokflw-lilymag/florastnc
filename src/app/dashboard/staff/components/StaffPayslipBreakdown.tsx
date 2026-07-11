"use client";

import type { StaffSalaryStatement } from "@/types/staff-salary";
import { formatKrw } from "@/lib/staff-salary-calc";
import {
  buildInsuranceLines,
  buildWithholdingLines,
  type DeductionLine,
} from "@/lib/staff-salary-summary";

function LineRows({ lines }: { lines: DeductionLine[] }) {
  if (!lines.length) return null;
  return (
    <div className="space-y-1">
      {lines.map((line) => (
        <div
          key={line.label}
          className={`flex justify-between text-sm ${
            line.isSubtotal
              ? "font-semibold text-slate-800 pt-1 border-t border-slate-200"
              : "text-slate-600"
          }`}
        >
          <span>{line.label}</span>
          <span className={line.amount === 0 ? "text-slate-400" : ""}>
            {formatKrw(line.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface StaffPayslipBreakdownProps {
  statement: StaffSalaryStatement;
}

export function StaffPayslipBreakdown({ statement }: StaffPayslipBreakdownProps) {
  const s = statement;
  const earnings: [string, number][] = [
    ["기본급", s.base_pay],
    ...(s.overtime_pay > 0 ? ([["연장·야간 수당", s.overtime_pay]] as [string, number][]) : []),
    ...(s.weekly_holiday_pay > 0
      ? ([["주휴수당", s.weekly_holiday_pay]] as [string, number][])
      : []),
    ...(s.meal_allowance > 0 ? ([["식대(비과세)", s.meal_allowance]] as [string, number][]) : []),
    ...(s.other_allowance > 0
      ? ([[s.other_allowance_name || "기타 수당", s.other_allowance]] as [string, number][])
      : []),
  ];

  const insuranceLines = buildInsuranceLines(s, s.employment_type !== "프리랜서");
  const withholdingLines = buildWithholdingLines(s, true);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {[
          ["지급합계", s.gross_pay],
          ["공제합계", s.total_deductions],
          ["원천징수", s.income_tax + s.local_income_tax + s.freelancer_tax],
          ["실수령", s.net_pay],
        ].map(([label, amt]) => (
          <div key={String(label)} className="rounded-xl bg-slate-50 border p-3">
            <p className="text-xs text-slate-500">{label}</p>
            <p
              className={`font-bold ${
                label === "실수령" ? "text-indigo-700" : "text-slate-900"
              }`}
            >
              {formatKrw(Number(amt))}
            </p>
          </div>
        ))}
      </div>

      {s.employment_type === "파트타임" && (
        <p className="text-xs text-slate-500">
          실근무 {Math.floor(s.worked_minutes / 60)}시간 · 주휴{" "}
          {Math.floor(s.weekly_holiday_minutes / 60)}시간 (근로기준법 제55조)
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600 mb-2">지급 내역</p>
          <div className="space-y-1">
            {earnings.map(([label, amt]) => (
              <div key={label} className="flex justify-between text-sm text-slate-600">
                <span>{label}</span>
                <span>{formatKrw(amt)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold text-slate-800 pt-1 border-t">
              <span>지급합계</span>
              <span>{formatKrw(s.gross_pay)}</span>
            </div>
          </div>
        </div>

        {s.employment_type !== "프리랜서" && (
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">4대보험 (근로자 부담)</p>
            <LineRows lines={insuranceLines} />
          </div>
        )}

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
          <p className="text-xs font-semibold text-indigo-800 mb-2">원천징수세액</p>
          <LineRows lines={withholdingLines} />
        </div>
      </div>

      <div className="flex justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
        <span>공제액 합계</span>
        <span>{formatKrw(s.total_deductions)}</span>
      </div>
    </div>
  );
}
