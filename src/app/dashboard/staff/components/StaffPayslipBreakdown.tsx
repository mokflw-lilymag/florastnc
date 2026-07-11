"use client";

import type { StaffSalaryStatement } from "@/types/staff-salary";
import { formatKrw } from "@/lib/staff-salary-calc";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
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
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);

  const s = statement;
  const earnings: [string, number][] = [
    ["기본급", s.base_pay],
    ...(s.overtime_pay > 0 ? ([["연장·야간 수당", s.overtime_pay]] as [string, number][]) : []),
    ...(s.weekly_holiday_pay > 0
      ? ([["주휴수당", s.weekly_holiday_pay]] as [string, number][])
      : []),
    ...(s.meal_allowance > 0 ? ([["식대(비과세)", s.meal_allowance]] as [string, number][]) : []),
    ...(s.other_allowance > 0
      ? ([[s.other_allowance_name || pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "기타 수당", "Other allowances", "Các khoản phụ cấp khác", "その他の手当", "其他津贴", "其他津貼", "Otras asignaciones", "Outros subsídios", "Autres allocations", "Sonstige Zulagen", "Другие надбавки"), "Other allowances", "Các khoản phụ cấp khác", "その他の手当", "其他津贴", "其他津貼", "Otras asignaciones", "Outros subsídios", "Autres allocations", "Sonstige Zulagen", "Другие надбавки"), "Other allowances", "Các khoản phụ cấp khác", "その他の手当", "其他津贴", "其他津貼", "Otras asignaciones", "Outros subsídios", "Autres allocations", "Sonstige Zulagen", "Другие надбавки"), "Other allowances", "Các khoản phụ cấp khác", "その他の手当", "其他津贴", "其他津貼", "Otras asignaciones", "Outros subsídios", "Autres allocations", "Sonstige Zulagen", "Другие надбавки"), s.other_allowance]] as [string, number][])
      : []),
  ];

  const insuranceLines = buildInsuranceLines(s, s.employment_type !== pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "프리랜서", "freelancer", "người làm việc tự do", "フリーランサー", "自由职业者", "自由工作者", "persona de libre dedicación", "freelancer", "indépendant", "Freiberufler", "фрилансер"), "freelancer", "người làm việc tự do", "フリーランサー", "自由职业者", "自由工作者", "persona de libre dedicación", "freelancer", "indépendant", "Freiberufler", "фрилансер"), "freelancer", "người làm việc tự do", "フリーランサー", "自由职业者", "自由工作者", "persona de libre dedicación", "freelancer", "indépendant", "Freiberufler", "фрилансер"), "freelancer", "người làm việc tự do", "フリーランサー", "自由职业者", "自由工作者", "persona de libre dedicación", "freelancer", "indépendant", "Freiberufler", "фрилансер"));
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
                label === pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "실수령", "real command", "lệnh thực", "間違い", "真实指挥", "真實指揮", "comando real", "comando real", "vrai commandement", "echter Befehl", "настоящая команда"), "real command", "lệnh thực", "間違い", "真实指挥", "真實指揮", "comando real", "comando real", "vrai commandement", "echter Befehl", "настоящая команда"), "real command", "lệnh thực", "間違い", "真实指挥", "真實指揮", "comando real", "comando real", "vrai commandement", "echter Befehl", "настоящая команда"), "real command", "lệnh thực", "間違い", "真实指挥", "真實指揮", "comando real", "comando real", "vrai commandement", "echter Befehl", "настоящая команда") ? "text-indigo-700" : "text-slate-900"
              }`}
            >
              {formatKrw(Number(amt))}
            </p>
          </div>
        ))}
      </div>

      {s.employment_type === pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "파트타임", "part time", "bán thời gian", "パートタイム", "兼职", "兼職", "tiempo parcial", "tempo parcial", "temps partiel", "Teilzeit", "неполная занятость"), "part time", "bán thời gian", "パートタイム", "兼职", "兼職", "tiempo parcial", "tempo parcial", "temps partiel", "Teilzeit", "неполная занятость"), "part time", "bán thời gian", "パートタイム", "兼职", "兼職", "tiempo parcial", "tempo parcial", "temps partiel", "Teilzeit", "неполная занятость"), "part time", "bán thời gian", "パートタイム", "兼职", "兼職", "tiempo parcial", "tempo parcial", "temps partiel", "Teilzeit", "неполная занятость") && (
        <p className="text-xs text-slate-500">
         {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "실근무", "actual work", "công việc thực tế", "実務", "实际工作", "實際工作", "trabajo real", "trabalho real", "travail réel", "eigentliche Arbeit", "реальная работа"), "actual work", "công việc thực tế", "実務", "实际工作", "實際工作", "trabajo real", "trabalho real", "travail réel", "eigentliche Arbeit", "реальная работа"), "actual work", "công việc thực tế", "実務", "实际工作", "實際工作", "trabajo real", "trabalho real", "travail réel", "eigentliche Arbeit", "реальная работа"), "actual work", "công việc thực tế", "実務", "实际工作", "實際工作", "trabajo real", "trabalho real", "travail réel", "eigentliche Arbeit", "реальная работа")}무 {Math.floor(s.worked_minutes / 60)}시간 · 주휴{" "}
          {Math.floor(s.weekly_holiday_minutes / 60)}시간 (근로기준법 제55조)
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600 mb-2">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "지급 내역", "Payment details", "Chi tiết thanh toán", "支払履歴", "付款详情", "付款詳情", "Detalles de pago", "Detalhes de pagamento", "Détails du paiement", "Zahlungsdetails", "Детали оплаты"), "Payment details", "Chi tiết thanh toán", "支払履歴", "付款详情", "付款詳情", "Detalles de pago", "Detalhes de pagamento", "Détails du paiement", "Zahlungsdetails", "Детали оплаты"), "Payment details", "Chi tiết thanh toán", "支払履歴", "付款详情", "付款詳情", "Detalles de pago", "Detalhes de pagamento", "Détails du paiement", "Zahlungsdetails", "Детали оплаты"), "Payment details", "Chi tiết thanh toán", "支払履歴", "付款详情", "付款詳情", "Detalles de pago", "Detalhes de pagamento", "Détails du paiement", "Zahlungsdetails", "Детали оплаты")}</p>
          <div className="space-y-1">
            {earnings.map(([label, amt]) => (
              <div key={label} className="flex justify-between text-sm text-slate-600">
                <span>{label}</span>
                <span>{formatKrw(amt)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold text-slate-800 pt-1 border-t">
              <span>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "지급합계", "Total payment", "Tổng số tiền thanh toán", "支払合計", "付款总额", "付款總額", "pago total", "Pagamento total", "Paiement total", "Gesamtzahlung", "Общая сумма платежа"), "Total payment", "Tổng số tiền thanh toán", "支払合計", "付款总额", "付款總額", "pago total", "Pagamento total", "Paiement total", "Gesamtzahlung", "Общая сумма платежа"), "Total payment", "Tổng số tiền thanh toán", "支払合計", "付款总额", "付款總額", "pago total", "Pagamento total", "Paiement total", "Gesamtzahlung", "Общая сумма платежа"), "Total payment", "Tổng số tiền thanh toán", "支払合計", "付款总额", "付款總額", "pago total", "Pagamento total", "Paiement total", "Gesamtzahlung", "Общая сумма платежа")}</span>
              <span>{formatKrw(s.gross_pay)}</span>
            </div>
          </div>
        </div>

        {s.employment_type !== pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "프리랜서", "freelancer", "người làm việc tự do", "フリーランサー", "自由职业者", "自由工作者", "persona de libre dedicación", "freelancer", "indépendant", "Freiberufler", "фрилансер"), "freelancer", "người làm việc tự do", "フリーランサー", "自由职业者", "自由工作者", "persona de libre dedicación", "freelancer", "indépendant", "Freiberufler", "фрилансер"), "freelancer", "người làm việc tự do", "フリーランサー", "自由职业者", "自由工作者", "persona de libre dedicación", "freelancer", "indépendant", "Freiberufler", "фрилансер"), "freelancer", "người làm việc tự do", "フリーランサー", "自由职业者", "自由工作者", "persona de libre dedicación", "freelancer", "indépendant", "Freiberufler", "фрилансер") && (
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "4대보험 (근로자 부담)", "4 major insurances (employee’s responsibility)", "4 loại bảo hiểm chính (trách nhiệm của người lao động)", "4大保険（労働者負担）", "4大保险（员工责任）", "4大保險（員工責任）", "4 seguros mayores (responsabilidad del empleado)", "4 principais seguros (responsabilidade do funcionário)", "4 assurances majeures (responsabilité du salarié)", "4 große Versicherungen (Mitarbeiterverantwortung)", "4 основные страховки (ответственность работника)"), "4 major insurances (employee’s responsibility)", "4 loại bảo hiểm chính (trách nhiệm của người lao động)", "4大保険（労働者負担）", "4大保险（员工责任）", "4大保險（員工責任）", "4 seguros mayores (responsabilidad del empleado)", "4 principais seguros (responsabilidade do funcionário)", "4 assurances majeures (responsabilité du salarié)", "4 große Versicherungen (Mitarbeiterverantwortung)", "4 основные страховки (ответственность работника)"), "4 major insurances (employee’s responsibility)", "4 loại bảo hiểm chính (trách nhiệm của người lao động)", "4大保険（労働者負担）", "4大保险（员工责任）", "4大保險（員工責任）", "4 seguros mayores (responsabilidad del empleado)", "4 principais seguros (responsabilidade do funcionário)", "4 assurances majeures (responsabilité du salarié)", "4 große Versicherungen (Mitarbeiterverantwortung)", "4 основные страховки (ответственность работника)"), "4 major insurances (employee’s responsibility)", "4 loại bảo hiểm chính (trách nhiệm của người lao động)", "4大保険（労働者負担）", "4大保险（员工责任）", "4大保險（員工責任）", "4 seguros mayores (responsabilidad del empleado)", "4 principais seguros (responsabilidade do funcionário)", "4 assurances majeures (responsabilité du salarié)", "4 große Versicherungen (Mitarbeiterverantwortung)", "4 основные страховки (ответственность работника)")}</p>
            <LineRows lines={insuranceLines} />
          </div>
        )}

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
          <p className="text-xs font-semibold text-indigo-800 mb-2">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "원천징수세액", "withholding tax amount", "số tiền thuế khấu trừ", "源泉徴収税額", "预扣税金额", "預扣稅金額", "monto de retención de impuestos", "valor do imposto retido na fonte", "montant de la retenue à la source", "Quellensteuerbetrag", "сумма подоходного налога"), "withholding tax amount", "số tiền thuế khấu trừ", "源泉徴収税額", "预扣税金额", "預扣稅金額", "monto de retención de impuestos", "valor do imposto retido na fonte", "montant de la retenue à la source", "Quellensteuerbetrag", "сумма подоходного налога"), "withholding tax amount", "số tiền thuế khấu trừ", "源泉徴収税額", "预扣税金额", "預扣稅金額", "monto de retención de impuestos", "valor do imposto retido na fonte", "montant de la retenue à la source", "Quellensteuerbetrag", "сумма подоходного налога"), "withholding tax amount", "số tiền thuế khấu trừ", "源泉徴収税額", "预扣税金额", "預扣稅金額", "monto de retención de impuestos", "valor do imposto retido na fonte", "montant de la retenue à la source", "Quellensteuerbetrag", "сумма подоходного налога")}</p>
          <LineRows lines={withholdingLines} />
        </div>
      </div>

      <div className="flex justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
        <span>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "공제액 합계", "Total deductible", "Tổng số tiền được khấu trừ", "控除額の合計", "总免赔额", "總免賠額", "Deducible total", "Franquia total", "Franchise totale", "Gesamter Selbstbehalt", "Общая франшиза"), "Total deductible", "Tổng số tiền được khấu trừ", "控除額の合計", "总免赔额", "總免賠額", "Deducible total", "Franquia total", "Franchise totale", "Gesamter Selbstbehalt", "Общая франшиза"), "Total deductible", "Tổng số tiền được khấu trừ", "控除額の合計", "总免赔额", "總免賠額", "Deducible total", "Franquia total", "Franchise totale", "Gesamter Selbstbehalt", "Общая франшиза"), "Total deductible", "Tổng số tiền được khấu trừ", "控除額の合計", "总免赔额", "總免賠額", "Deducible total", "Franquia total", "Franchise totale", "Gesamter Selbstbehalt", "Общая франшиза")}</span>
        <span>{formatKrw(s.total_deductions)}</span>
      </div>
    </div>
  );
}
