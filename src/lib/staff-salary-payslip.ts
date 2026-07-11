import type { StaffFinancial, StaffSalaryStatement } from "@/types/staff-salary";
import { formatKrw } from "@/lib/staff-salary-calc";
import { buildInsuranceLines, buildWithholdingLines } from "@/lib/staff-salary-summary";

export interface PayslipContext {
  shopName: string;
  staffName: string;
  position?: string | null;
  financial?: StaffFinancial | null;
  statement: StaffSalaryStatement;
}

function row(label: string, amount: number, bold = false) {
  const style = bold ? "font-weight:700;" : "";
  return `<tr>
    <td style="padding:6px 8px;border-bottom:1px solid #eee;color:#444;${style}">${label}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;${style}">${formatKrw(amount)}</td>
  </tr>`;
}

export function buildPayslipHtml(ctx: PayslipContext): string {
  const s = ctx.statement;
  const [y, m] = s.payment_year_month.split("-");
  const fin = ctx.financial;

  const earningsRows = [
    row("기본급", s.base_pay),
    s.overtime_pay > 0 ? row("연장·야간·휴일 수당", s.overtime_pay) : "",
    s.weekly_holiday_pay > 0 ? row("주휴수당", s.weekly_holiday_pay) : "",
    s.meal_allowance > 0 ? row("식대(비과세)", s.meal_allowance) : "",
    s.other_allowance > 0
      ? row(s.other_allowance_name || "기타 수당", s.other_allowance)
      : "",
    row("지급액 합계", s.gross_pay, true),
  ].join("");

  const insuranceLines = buildInsuranceLines(s, s.employment_type !== "프리랜서");
  const withholdingLines = buildWithholdingLines(s, true);

  const sectionRow = (title: string) =>
    `<tr><td colspan="2" style="padding:8px 8px 4px;font-size:12px;font-weight:700;color:#64748b;background:#f8fafc;border-bottom:1px solid #e2e8f0;">${title}</td></tr>`;

  const deductionRows = [
    s.employment_type !== "프리랜서" && insuranceLines.length > 0
      ? sectionRow("4대보험 (근로자 부담)")
      : "",
    ...insuranceLines.map((line) =>
      row(line.label, line.amount, !!line.isSubtotal),
    ),
    withholdingLines.length > 0 ? sectionRow("원천징수세액") : "",
    ...withholdingLines.map((line) =>
      row(line.label, line.amount, !!line.isSubtotal),
    ),
    row("공제액 합계", s.total_deductions, true),
  ].join("");

  const workInfo =
    s.employment_type === "파트타임"
      ? `<p style="margin:4px 0;font-size:13px;color:#555;">실근무: ${Math.floor(s.worked_minutes / 60)}시간 ${s.worked_minutes % 60}분 · 주휴: ${Math.floor(s.weekly_holiday_minutes / 60)}시간</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>급여명세서 ${y}년 ${m}월 — ${ctx.staffName}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
    body { font-family: 'Malgun Gothic', sans-serif; color: #111; max-width: 720px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .meta { font-size: 13px; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f8fafc; text-align: left; padding: 8px; font-size: 13px; border-bottom: 2px solid #e2e8f0; }
    .net { background: #eef2ff; border-radius: 12px; padding: 16px; text-align: center; margin-top: 20px; }
    .net strong { font-size: 24px; color: #3730a3; }
    .legal { font-size: 11px; color: #94a3b8; margin-top: 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;">
    <button onclick="window.print()" style="padding:8px 16px;background:#3730a3;color:#fff;border:none;border-radius:8px;cursor:pointer;">인쇄 / PDF 저장</button>
  </div>
  <h1>급여명세서</h1>
  <div class="meta">
    <div><strong>${ctx.shopName}</strong></div>
    <div>지급연월: ${y}년 ${m}월 · 성명: ${ctx.staffName}${ctx.position ? ` · ${ctx.position}` : ""}</div>
    <div>고용형태: ${s.employment_type}${fin?.bank_name ? ` · ${fin.bank_name} ${fin.account_number ?? ""}` : ""}</div>
    ${workInfo}
  </div>
  <table>
    <thead><tr><th colspan="2">지급 내역</th></tr></thead>
    <tbody>${earningsRows}</tbody>
  </table>
  <table>
    <thead><tr><th colspan="2">공제 내역</th></tr></thead>
    <tbody>${deductionRows}</tbody>
  </table>
  <div class="net">
    <div style="font-size:13px;color:#64748b;margin-bottom:4px;">실수령액</div>
    <strong>${formatKrw(s.net_pay)}</strong>
  </div>
  <p class="legal">
    본 명세서는 근로기준법 제48조(임금명세서 교부)에 따라 작성되었습니다.
    4대보험 요율·소득세는 간이 계산값이며, 실제 원천징수는 국세청·4대보험 고시 및 간이세액표에 따라 달라질 수 있습니다.
    파트타임 주휴수당은 주 15시간 이상 근로 시 (주 소정근로시간÷40)×8×시급 기준으로 산정합니다.
  </p>
</body>
</html>`;
}

export function buildPayslipEmailSubject(shopName: string, yearMonth: string, staffName: string) {
  const [y, m] = yearMonth.split("-");
  return `[${shopName}] ${y}년 ${m}월 급여명세서 — ${staffName}`;
}
