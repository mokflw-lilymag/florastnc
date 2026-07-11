"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { CompensationModel, EmploymentType, StaffFinancial } from "@/types/staff-salary";
import { defaultInsuranceFlags, defaultSalaryType } from "@/lib/staff-salary-calc";
import {
  defaultCompensationModel,
  isKrPayroll,
  syncFinancialFromAnnual,
  type PayrollTenantConfig,
} from "@/lib/payroll/types";
import { formatKrw } from "@/lib/staff-salary-calc";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

interface StaffFinancialFormProps {
  value: StaffFinancial;
  onChange: (next: StaffFinancial) => void;
  payroll?: PayrollTenantConfig;
}

const EMPLOYMENT_OPTIONS: EmploymentType[] = ["정직원", "파트타임", "프리랜서"];

export function StaffFinancialForm({ value, onChange, payroll }: StaffFinancialFormProps) {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);

  const payrollCfg: PayrollTenantConfig = payroll ?? {
    payrollJurisdiction: "KR",
    payrollMode: "auto",
    fullTimeCompensationModel: "annual",
    country: "KR",
  };
  const krAuto = isKrPayroll(payrollCfg);
  const isManual = payrollCfg.payrollMode === "manual";

  const setEmploymentType = (type: EmploymentType) => {
    const defaults = defaultInsuranceFlags(type);
    const comp = defaultCompensationModel(type, payrollCfg);
    onChange(
      syncFinancialFromAnnual({
        ...value,
        employment_type: type,
        salary_type: defaultSalaryType(type),
        compensation_model: comp,
        ...defaults,
      }),
    );
  };

  const setAnnualSalary = (annual: number) => {
    onChange(
      syncFinancialFromAnnual({
        ...value,
        compensation_model: "annual",
        annual_salary: annual,
        salary_type: "월급",
      }),
    );
  };

  const isFreelancer = value.employment_type === pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "프리랜서", "freelancer", "người làm việc tự do", "フリーランサー", "自由职业者", "自由工作者", "persona de libre dedicación", "freelancer", "indépendant", "Freiberufler", "фрилансер"), "freelancer", "người làm việc tự do", "フリーランサー", "自由职业者", "自由工作者", "persona de libre dedicación", "freelancer", "indépendant", "Freiberufler", "фрилансер"), "freelancer", "người làm việc tự do", "フリーランサー", "自由职业者", "自由工作者", "persona de libre dedicación", "freelancer", "indépendant", "Freiberufler", "фрилансер"), "freelancer", "người làm việc tự do", "フリーランサー", "自由职业者", "自由工作者", "persona de libre dedicación", "freelancer", "indépendant", "Freiberufler", "фрилансер");
  const isPartTime = value.employment_type === pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "파트타임", "part time", "bán thời gian", "パートタイム", "兼职", "兼職", "tiempo parcial", "tempo parcial", "temps partiel", "Teilzeit", "неполная занятость"), "part time", "bán thời gian", "パートタイム", "兼职", "兼職", "tiempo parcial", "tempo parcial", "temps partiel", "Teilzeit", "неполная занятость"), "part time", "bán thời gian", "パートタイム", "兼职", "兼職", "tiempo parcial", "tempo parcial", "temps partiel", "Teilzeit", "неполная занятость"), "part time", "bán thời gian", "パートタイム", "兼职", "兼職", "tiempo parcial", "tempo parcial", "temps partiel", "Teilzeit", "неполная занятость");
  const isFullTime = value.employment_type === pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "정직원", "Full-time employee", "Nhân viên toàn thời gian", "正社員", "全职员工", "全職員工", "empleado de tiempo completo", "Funcionário em tempo integral", "Employé à temps plein", "Vollzeitangestellter", "Сотрудник, работающий полный рабочий день"), "Full-time employee", "Nhân viên toàn thời gian", "正社員", "全职员工", "全職員工", "empleado de tiempo completo", "Funcionário em tempo integral", "Employé à temps plein", "Vollzeitangestellter", "Сотрудник, работающий полный рабочий день"), "Full-time employee", "Nhân viên toàn thời gian", "正社員", "全职员工", "全職員工", "empleado de tiempo completo", "Funcionário em tempo integral", "Employé à temps plein", "Vollzeitangestellter", "Сотрудник, работающий полный рабочий день"), "Full-time employee", "Nhân viên toàn thời gian", "正社員", "全职员工", "全職員工", "empleado de tiempo completo", "Funcionário em tempo integral", "Employé à temps plein", "Vollzeitangestellter", "Сотрудник, работающий полный рабочий день");
  const useAnnual =
    isFullTime &&
    (value.compensation_model === "annual" ||
      payrollCfg.fullTimeCompensationModel === "annual");

  const monthlyFromAnnual =
    value.annual_salary > 0 ? Math.floor(value.annual_salary / 12) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {isManual && (
        <div className="md:col-span-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
         {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "수동 급여 모드: 자동 세금·보험 계산 없음. 급여 정산에서 지급·공제를 직접 입력하세요.", "Manual Payroll Mode: No automatic tax/insurance calculations. Enter payments and deductions directly in salary settlement.", "Chế độ tính lương thủ công: Không tính toán thuế/bảo hiểm tự động. Nhập các khoản thanh toán, khấu trừ trực tiếp vào quyết toán lương.", "手動給与モード：自動税・保険計算なし。 給与決済でお支払い・控除を直接入力してください。", "手动薪资模式：无自动税/保险计算。 直接在工资结算中输入付款和扣除额。", "手動薪資模式：無自動稅/保險計算。 直接在薪資結算中輸入付款和扣除額。", "Modo de nómina manual: sin cálculos automáticos de impuestos/seguros. Ingrese pagos y deducciones directamente en la liquidación de salario.", "Modo de folha de pagamento manual: sem cálculos automáticos de impostos/seguros. Insira pagamentos e deduções diretamente na liquidação salarial.", "Mode de paie manuel : pas de calculs automatiques d'impôts/d'assurances. Saisissez les paiements et les retenues directement dans le règlement des salaires.", "Manueller Abrechnungsmodus: Keine automatischen Steuer-/Versicherungsberechnungen. Erfassen Sie Zahlungen und Abzüge direkt in der Gehaltsabrechnung.", "Ручной режим расчета заработной платы: нет автоматических расчетов налогов и страховок. Вносите выплаты и удержания непосредственно в расчет заработной платы."), "Manual Payroll Mode: No automatic tax/insurance calculations. Enter payments and deductions directly in salary settlement.", "Chế độ tính lương thủ công: Không tính toán thuế/bảo hiểm tự động. Nhập các khoản thanh toán, khấu trừ trực tiếp vào quyết toán lương.", "手動給与モード：自動税・保険計算なし。 給与決済でお支払い・控除を直接入力してください。", "手动薪资模式：无自动税/保险计算。 直接在工资结算中输入付款和扣除额。", "手動薪資模式：無自動稅/保險計算。 直接在薪資結算中輸入付款和扣除額。", "Modo de nómina manual: sin cálculos automáticos de impuestos/seguros. Ingrese pagos y deducciones directamente en la liquidación de salario.", "Modo de folha de pagamento manual: sem cálculos automáticos de impostos/seguros. Insira pagamentos e deduções diretamente na liquidação salarial.", "Mode de paie manuel : pas de calculs automatiques d'impôts/d'assurances. Saisissez les paiements et les retenues directement dans le règlement des salaires.", "Manueller Abrechnungsmodus: Keine automatischen Steuer-/Versicherungsberechnungen. Erfassen Sie Zahlungen und Abzüge direkt in der Gehaltsabrechnung.", "Ручной режим расчета заработной платы: нет автоматических расчетов налогов и страховок. Вносите выплаты и удержания непосредственно в расчет заработной платы."), "Manual Payroll Mode: No automatic tax/insurance calculations. Enter payments and deductions directly in salary settlement.", "Chế độ tính lương thủ công: Không tính toán thuế/bảo hiểm tự động. Nhập các khoản thanh toán, khấu trừ trực tiếp vào quyết toán lương.", "手動給与モード：自動税・保険計算なし。 給与決済でお支払い・控除を直接入力してください。", "手动薪资模式：无自动税/保险计算。 直接在工资结算中输入付款和扣除额。", "手動薪資模式：無自動稅/保險計算。 直接在薪資結算中輸入付款和扣除額。", "Modo de nómina manual: sin cálculos automáticos de impuestos/seguros. Ingrese pagos y deducciones directamente en la liquidación de salario.", "Modo de folha de pagamento manual: sem cálculos automáticos de impostos/seguros. Insira pagamentos e deduções diretamente na liquidação salarial.", "Mode de paie manuel : pas de calculs automatiques d'impôts/d'assurances. Saisissez les paiements et les retenues directement dans le règlement des salaires.", "Manueller Abrechnungsmodus: Keine automatischen Steuer-/Versicherungsberechnungen. Erfassen Sie Zahlungen und Abzüge direkt in der Gehaltsabrechnung.", "Ручной режим расчета заработной платы: нет автоматических расчетов налогов и страховок. Вносите выплаты и удержания непосредственно в расчет заработной платы."), "Manual Payroll Mode: No automatic tax/insurance calculations. Enter payments and deductions directly in salary settlement.", "Chế độ tính lương thủ công: Không tính toán thuế/bảo hiểm tự động. Nhập các khoản thanh toán, khấu trừ trực tiếp vào quyết toán lương.", "手動給与モード：自動税・保険計算なし。 給与決済でお支払い・控除を直接入力してください。", "手动薪资模式：无自动税/保险计算。 直接在工资结算中输入付款和扣除额。", "手動薪資模式：無自動稅/保險計算。 直接在薪資結算中輸入付款和扣除額。", "Modo de nómina manual: sin cálculos automáticos de impuestos/seguros. Ingrese pagos y deducciones directamente en la liquidación de salario.", "Modo de folha de pagamento manual: sem cálculos automáticos de impostos/seguros. Insira pagamentos e deduções diretamente na liquidação salarial.", "Mode de paie manuel : pas de calculs automatiques d'impôts/d'assurances. Saisissez les paiements et les retenues directement dans le règlement des salaires.", "Manueller Abrechnungsmodus: Keine automatischen Steuer-/Versicherungsberechnungen. Erfassen Sie Zahlungen und Abzüge direkt in der Gehaltsabrechnung.", "Ручной режим расчета заработной платы: нет автоматических расчетов налогов и страховок. Вносите выплаты и удержания непосредственно в расчет заработной платы.")}.
        </div>
      )}

      <div className="space-y-2 md:col-span-2">
        <Label>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "고용 형태 *", "Employment type *", "Loại việc làm *", "雇用形態*", "就业类型 *", "就業類型 *", "Tipo de empleo *", "Tipo de emprego *", "Type d'emploi *", "Beschäftigungsart *", "Тип занятости *"), "Employment type *", "Loại việc làm *", "雇用形態*", "就业类型 *", "就業類型 *", "Tipo de empleo *", "Tipo de emprego *", "Type d'emploi *", "Beschäftigungsart *", "Тип занятости *"), "Employment type *", "Loại việc làm *", "雇用形態*", "就业类型 *", "就業類型 *", "Tipo de empleo *", "Tipo de emprego *", "Type d'emploi *", "Beschäftigungsart *", "Тип занятости *"), "Employment type *", "Loại việc làm *", "雇用形態*", "就业类型 *", "就業類型 *", "Tipo de empleo *", "Tipo de emprego *", "Type d'emploi *", "Beschäftigungsart *", "Тип занятости *")}</Label>
        <div className="flex flex-wrap gap-2">
          {EMPLOYMENT_OPTIONS.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setEmploymentType(type)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                value.employment_type === type
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {isFreelancer && krAuto && pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "프리랜서: 3.3% 원천징수, 4대보험 미적용", "Freelancer: 3.3% withholding tax, 4 major insurances not applicable", "Freelancer: Thuế khấu trừ 3,3%, 4 bảo hiểm chính không áp dụng", "フリーランサー：3.3％源泉徴収、4大保険未適用", "自由职业者：3.3%预提税，4大保险不适用", "自由工作者：3.3%預提稅，4大保險不適用", "Freelancer: 3,3% de retención en origen, 4 seguros principales no aplicables", "Freelancer: imposto retido na fonte de 3,3%, 4 seguros principais não aplicáveis", "Freelance : 3,3% de prélèvement à la source, 4 grandes assurances non applicables", "Freiberufler: 3,3 % Quellensteuer, 4 große Versicherungen entfallen", "Фрилансер: подоходный налог 3,3%, 4 основные страховки не применимы."), "Freelancer: 3.3% withholding tax, 4 major insurances not applicable", "Freelancer: Thuế khấu trừ 3,3%, 4 bảo hiểm chính không áp dụng", "フリーランサー：3.3％源泉徴収、4大保険未適用", "自由职业者：3.3%预提税，4大保险不适用", "自由工作者：3.3%預提稅，4大保險不適用", "Freelancer: 3,3% de retención en origen, 4 seguros principales no aplicables", "Freelancer: imposto retido na fonte de 3,3%, 4 seguros principais não aplicáveis", "Freelance : 3,3% de prélèvement à la source, 4 grandes assurances non applicables", "Freiberufler: 3,3 % Quellensteuer, 4 große Versicherungen entfallen", "Фрилансер: подоходный налог 3,3%, 4 основные страховки не применимы."), "Freelancer: 3.3% withholding tax, 4 major insurances not applicable", "Freelancer: Thuế khấu trừ 3,3%, 4 bảo hiểm chính không áp dụng", "フリーランサー：3.3％源泉徴収、4大保険未適用", "自由职业者：3.3%预提税，4大保险不适用", "自由工作者：3.3%預提稅，4大保險不適用", "Freelancer: 3,3% de retención en origen, 4 seguros principales no aplicables", "Freelancer: imposto retido na fonte de 3,3%, 4 seguros principais não aplicáveis", "Freelance : 3,3% de prélèvement à la source, 4 grandes assurances non applicables", "Freiberufler: 3,3 % Quellensteuer, 4 große Versicherungen entfallen", "Фрилансер: подоходный налог 3,3%, 4 основные страховки не применимы."), "Freelancer: 3.3% withholding tax, 4 major insurances not applicable", "Freelancer: Thuế khấu trừ 3,3%, 4 bảo hiểm chính không áp dụng", "フリーランサー：3.3％源泉徴収、4大保険未適用", "自由职业者：3.3%预提税，4大保险不适用", "自由工作者：3.3%預提稅，4大保險不適用", "Freelancer: 3,3% de retención en origen, 4 seguros principales no aplicables", "Freelancer: imposto retido na fonte de 3,3%, 4 seguros principais não aplicáveis", "Freelance : 3,3% de prélèvement à la source, 4 grandes assurances non applicables", "Freiberufler: 3,3 % Quellensteuer, 4 große Versicherungen entfallen", "Фрилансер: подоходный налог 3,3%, 4 основные страховки не применимы.")}
          {isPartTime && krAuto && pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "파트타임: 시급·출퇴근 기반 주휴수당 (주 15시간 이상)", "Part-time: Hourly wage, commuting-based weekly holiday allowance (more than 15 hours a week)", "Bán thời gian: Lương theo giờ, trợ cấp nghỉ lễ hàng tuần dựa trên việc đi lại (hơn 15 giờ một tuần)", "パートタイム：時給・出退勤基盤週休手当（週15時間以上）", "兼职：小时工资，基于通勤的每周假期津贴（每周超过15小时）", "兼職：小時工資，基於通勤的每週假期津貼（每週超過15小時）", "A tiempo parcial: salario por hora, subsidio de vacaciones semanales basado en los desplazamientos (más de 15 horas a la semana)", "Tempo parcial: salário por hora, subsídio de férias semanais baseado em deslocamento (mais de 15 horas por semana)", "Temps partiel : Salaire horaire, indemnité de congé hebdomadaire basée sur les déplacements domicile-travail (plus de 15 heures par semaine)", "Teilzeit: Stundenlohn, pendelabhängiger wöchentlicher Urlaubszuschuss (mehr als 15 Stunden pro Woche)", "Неполный рабочий день: почасовая оплата, оплата еженедельных отпусков в зависимости от поездок на работу (более 15 часов в неделю)."), "Part-time: Hourly wage, commuting-based weekly holiday allowance (more than 15 hours a week)", "Bán thời gian: Lương theo giờ, trợ cấp nghỉ lễ hàng tuần dựa trên việc đi lại (hơn 15 giờ một tuần)", "パートタイム：時給・出退勤基盤週休手当（週15時間以上）", "兼职：小时工资，基于通勤的每周假期津贴（每周超过15小时）", "兼職：小時工資，基於通勤的每週假期津貼（每週超過15小時）", "A tiempo parcial: salario por hora, subsidio de vacaciones semanales basado en los desplazamientos (más de 15 horas a la semana)", "Tempo parcial: salário por hora, subsídio de férias semanais baseado em deslocamento (mais de 15 horas por semana)", "Temps partiel : Salaire horaire, indemnité de congé hebdomadaire basée sur les déplacements domicile-travail (plus de 15 heures par semaine)", "Teilzeit: Stundenlohn, pendelabhängiger wöchentlicher Urlaubszuschuss (mehr als 15 Stunden pro Woche)", "Неполный рабочий день: почасовая оплата, оплата еженедельных отпусков в зависимости от поездок на работу (более 15 часов в неделю)."), "Part-time: Hourly wage, commuting-based weekly holiday allowance (more than 15 hours a week)", "Bán thời gian: Lương theo giờ, trợ cấp nghỉ lễ hàng tuần dựa trên việc đi lại (hơn 15 giờ một tuần)", "パートタイム：時給・出退勤基盤週休手当（週15時間以上）", "兼职：小时工资，基于通勤的每周假期津贴（每周超过15小时）", "兼職：小時工資，基於通勤的每週假期津貼（每週超過15小時）", "A tiempo parcial: salario por hora, subsidio de vacaciones semanales basado en los desplazamientos (más de 15 horas a la semana)", "Tempo parcial: salário por hora, subsídio de férias semanais baseado em deslocamento (mais de 15 horas por semana)", "Temps partiel : Salaire horaire, indemnité de congé hebdomadaire basée sur les déplacements domicile-travail (plus de 15 heures par semaine)", "Teilzeit: Stundenlohn, pendelabhängiger wöchentlicher Urlaubszuschuss (mehr als 15 Stunden pro Woche)", "Неполный рабочий день: почасовая оплата, оплата еженедельных отпусков в зависимости от поездок на работу (более 15 часов в неделю)."), "Part-time: Hourly wage, commuting-based weekly holiday allowance (more than 15 hours a week)", "Bán thời gian: Lương theo giờ, trợ cấp nghỉ lễ hàng tuần dựa trên việc đi lại (hơn 15 giờ một tuần)", "パートタイム：時給・出退勤基盤週休手当（週15時間以上）", "兼职：小时工资，基于通勤的每周假期津贴（每周超过15小时）", "兼職：小時工資，基於通勤的每週假期津貼（每週超過15小時）", "A tiempo parcial: salario por hora, subsidio de vacaciones semanales basado en los desplazamientos (más de 15 horas a la semana)", "Tempo parcial: salário por hora, subsídio de férias semanais baseado em deslocamento (mais de 15 horas por semana)", "Temps partiel : Salaire horaire, indemnité de congé hebdomadaire basée sur les déplacements domicile-travail (plus de 15 heures par semaine)", "Teilzeit: Stundenlohn, pendelabhängiger wöchentlicher Urlaubszuschuss (mehr als 15 Stunden pro Woche)", "Неполный рабочий день: почасовая оплата, оплата еженедельных отпусков в зависимости от поездок на работу (более 15 часов в неделю).")}
          {isFullTime && krAuto && useAnnual && pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "정직원: 년봉 ÷ 12 월 환산, 4대보험 기본 적용", "Full-time employees: annual salary converted to 12 months, basic four major insurance policies applied", "Nhân viên chính thức: lương năm quy đổi thành 12 tháng, áp dụng 4 chính sách bảo hiểm cơ bản", "正社員：年俸÷12月換算、4大保険基本適用", "全职员工：年薪折算为12个月，适用基本四大保险", "全職員工：年薪折算為12個月，適用基本四大保險", "Empleados de tiempo completo: salario anual convertido a 12 meses, se aplican las cuatro pólizas de seguro principales básicas", "Funcionários em tempo integral: salário anual convertido para 12 meses, quatro principais apólices de seguro básicas aplicadas", "Salariés à temps plein : salaire annuel converti en 12 mois, quatre grandes assurances de base appliquées", "Vollzeitbeschäftigte: Jahresgehalt auf 12 Monate umgerechnet, es gelten die vier wichtigsten Versicherungspolicen", "Сотрудники, работающие полный рабочий день: годовая зарплата конвертируется в 12 месяцев, применяются четыре основных страховых полиса."), "Full-time employees: annual salary converted to 12 months, basic four major insurance policies applied", "Nhân viên chính thức: lương năm quy đổi thành 12 tháng, áp dụng 4 chính sách bảo hiểm cơ bản", "正社員：年俸÷12月換算、4大保険基本適用", "全职员工：年薪折算为12个月，适用基本四大保险", "全職員工：年薪折算為12個月，適用基本四大保險", "Empleados de tiempo completo: salario anual convertido a 12 meses, se aplican las cuatro pólizas de seguro principales básicas", "Funcionários em tempo integral: salário anual convertido para 12 meses, quatro principais apólices de seguro básicas aplicadas", "Salariés à temps plein : salaire annuel converti en 12 mois, quatre grandes assurances de base appliquées", "Vollzeitbeschäftigte: Jahresgehalt auf 12 Monate umgerechnet, es gelten die vier wichtigsten Versicherungspolicen", "Сотрудники, работающие полный рабочий день: годовая зарплата конвертируется в 12 месяцев, применяются четыре основных страховых полиса."), "Full-time employees: annual salary converted to 12 months, basic four major insurance policies applied", "Nhân viên chính thức: lương năm quy đổi thành 12 tháng, áp dụng 4 chính sách bảo hiểm cơ bản", "正社員：年俸÷12月換算、4大保険基本適用", "全职员工：年薪折算为12个月，适用基本四大保险", "全職員工：年薪折算為12個月，適用基本四大保險", "Empleados de tiempo completo: salario anual convertido a 12 meses, se aplican las cuatro pólizas de seguro principales básicas", "Funcionários em tempo integral: salário anual convertido para 12 meses, quatro principais apólices de seguro básicas aplicadas", "Salariés à temps plein : salaire annuel converti en 12 mois, quatre grandes assurances de base appliquées", "Vollzeitbeschäftigte: Jahresgehalt auf 12 Monate umgerechnet, es gelten die vier wichtigsten Versicherungspolicen", "Сотрудники, работающие полный рабочий день: годовая зарплата конвертируется в 12 месяцев, применяются четыре основных страховых полиса."), "Full-time employees: annual salary converted to 12 months, basic four major insurance policies applied", "Nhân viên chính thức: lương năm quy đổi thành 12 tháng, áp dụng 4 chính sách bảo hiểm cơ bản", "正社員：年俸÷12月換算、4大保険基本適用", "全职员工：年薪折算为12个月，适用基本四大保险", "全職員工：年薪折算為12個月，適用基本四大保險", "Empleados de tiempo completo: salario anual convertido a 12 meses, se aplican las cuatro pólizas de seguro principales básicas", "Funcionários em tempo integral: salário anual convertido para 12 meses, quatro principais apólices de seguro básicas aplicadas", "Salariés à temps plein : salaire annuel converti en 12 mois, quatre grandes assurances de base appliquées", "Vollzeitbeschäftigte: Jahresgehalt auf 12 Monate umgerechnet, es gelten die vier wichtigsten Versicherungspolicen", "Сотрудники, работающие полный рабочий день: годовая зарплата конвертируется в 12 месяцев, применяются четыре основных страховых полиса.")}
          {isFullTime && !useAnnual && pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "정직원: 월급제", "Full-time employees: monthly salary system", "Nhân viên toàn thời gian: hệ thống lương hàng tháng", "正社員：給料制", "全职员工：月薪制", "全職員工：月薪制", "Empleados a tiempo completo: sistema salarial mensual", "Funcionários em tempo integral: sistema de salário mensal", "Salariés à temps plein : système de salaire mensuel", "Vollzeitbeschäftigte: monatliches Gehaltssystem", "Сотрудники, работающие полный рабочий день: система ежемесячной заработной платы"), "Full-time employees: monthly salary system", "Nhân viên toàn thời gian: hệ thống lương hàng tháng", "正社員：給料制", "全职员工：月薪制", "全職員工：月薪制", "Empleados a tiempo completo: sistema salarial mensual", "Funcionários em tempo integral: sistema de salário mensal", "Salariés à temps plein : système de salaire mensuel", "Vollzeitbeschäftigte: monatliches Gehaltssystem", "Сотрудники, работающие полный рабочий день: система ежемесячной заработной платы"), "Full-time employees: monthly salary system", "Nhân viên toàn thời gian: hệ thống lương hàng tháng", "正社員：給料制", "全职员工：月薪制", "全職員工：月薪制", "Empleados a tiempo completo: sistema salarial mensual", "Funcionários em tempo integral: sistema de salário mensal", "Salariés à temps plein : système de salaire mensuel", "Vollzeitbeschäftigte: monatliches Gehaltssystem", "Сотрудники, работающие полный рабочий день: система ежемесячной заработной платы"), "Full-time employees: monthly salary system", "Nhân viên toàn thời gian: hệ thống lương hàng tháng", "正社員：給料制", "全职员工：月薪制", "全職員工：月薪制", "Empleados a tiempo completo: sistema salarial mensual", "Funcionários em tempo integral: sistema de salário mensal", "Salariés à temps plein : système de salaire mensuel", "Vollzeitbeschäftigte: monatliches Gehaltssystem", "Сотрудники, работающие полный рабочий день: система ежемесячной заработной платы")}
        </p>
      </div>

      {isFullTime && useAnnual && (
        <>
          <div className="space-y-2 md:col-span-2">
            <Label>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "년봉 (연봉, 원)", "Annual salary (annual salary, won)", "Lương hàng năm (lương hàng năm, won)", "年俸（年俸、円）", "年薪（年薪，韩元）", "年薪（年薪，韓元）", "Salario anual (salario anual, ganado)", "Salário anual (salário anual, ganho)", "Salaire annuel (salaire annuel, gagné)", "Jahresgehalt (Jahresgehalt, Won)", "Годовая зарплата (годовая зарплата, вон)"), "Annual salary (annual salary, won)", "Lương hàng năm (lương hàng năm, won)", "年俸（年俸、円）", "年薪（年薪，韩元）", "年薪（年薪，韓元）", "Salario anual (salario anual, ganado)", "Salário anual (salário anual, ganho)", "Salaire annuel (salaire annuel, gagné)", "Jahresgehalt (Jahresgehalt, Won)", "Годовая зарплата (годовая зарплата, вон)"), "Annual salary (annual salary, won)", "Lương hàng năm (lương hàng năm, won)", "年俸（年俸、円）", "年薪（年薪，韩元）", "年薪（年薪，韓元）", "Salario anual (salario anual, ganado)", "Salário anual (salário anual, ganho)", "Salaire annuel (salaire annuel, gagné)", "Jahresgehalt (Jahresgehalt, Won)", "Годовая зарплата (годовая зарплата, вон)"), "Annual salary (annual salary, won)", "Lương hàng năm (lương hàng năm, won)", "年俸（年俸、円）", "年薪（年薪，韩元）", "年薪（年薪，韓元）", "Salario anual (salario anual, ganado)", "Salário anual (salário anual, ganho)", "Salaire annuel (salaire annuel, gagné)", "Jahresgehalt (Jahresgehalt, Won)", "Годовая зарплата (годовая зарплата, вон)")}</Label>
            <Input
              type="number"
              min={0}
              step={1000000}
              value={value.annual_salary || ""}
              onChange={(e) => setAnnualSalary(Number(e.target.value) || 0)}
              placeholder="36000000"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <p className="text-sm text-indigo-700 font-medium">
              월 환산 기본급: {formatKrw(monthlyFromAnnual)}
            </p>
          </div>
        </>
      )}

      {(!isFullTime || !useAnnual) && (
        <div className="space-y-2">
          <Label>
            {isPartTime ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "시급 (원)", "Hourly wage (KRW)", "Lương theo giờ (KRW)", "時給（円）", "每小时工资（韩元）", "每小時工資（韓元）", "Salario por hora (KRW)", "Salário por hora (KRW)", "Salaire horaire (KRW)", "Stundenlohn (KRW)", "Почасовая оплата (KRW)"), "Hourly wage (KRW)", "Lương theo giờ (KRW)", "時給（円）", "每小时工资（韩元）", "每小時工資（韓元）", "Salario por hora (KRW)", "Salário por hora (KRW)", "Salaire horaire (KRW)", "Stundenlohn (KRW)", "Почасовая оплата (KRW)"), "Hourly wage (KRW)", "Lương theo giờ (KRW)", "時給（円）", "每小时工资（韩元）", "每小時工資（韓元）", "Salario por hora (KRW)", "Salário por hora (KRW)", "Salaire horaire (KRW)", "Stundenlohn (KRW)", "Почасовая оплата (KRW)"), "Hourly wage (KRW)", "Lương theo giờ (KRW)", "時給（円）", "每小时工资（韩元）", "每小時工資（韓元）", "Salario por hora (KRW)", "Salário por hora (KRW)", "Salaire horaire (KRW)", "Stundenlohn (KRW)", "Почасовая оплата (KRW)") : isFreelancer ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "계약금 (원)", "Down payment (KRW)", "Trả trước (KRW)", "契約金（ウォン）", "首付（韩元）", "首付（韓元）", "Pago inicial (KRW)", "Pagamento inicial (KRW)", "Acompte (KRW)", "Anzahlung (KRW)", "Первоначальный взнос (KRW)"), "Down payment (KRW)", "Trả trước (KRW)", "契約金（ウォン）", "首付（韩元）", "首付（韓元）", "Pago inicial (KRW)", "Pagamento inicial (KRW)", "Acompte (KRW)", "Anzahlung (KRW)", "Первоначальный взнос (KRW)"), "Down payment (KRW)", "Trả trước (KRW)", "契約金（ウォン）", "首付（韩元）", "首付（韓元）", "Pago inicial (KRW)", "Pagamento inicial (KRW)", "Acompte (KRW)", "Anzahlung (KRW)", "Первоначальный взнос (KRW)"), "Down payment (KRW)", "Trả trước (KRW)", "契約金（ウォン）", "首付（韩元）", "首付（韓元）", "Pago inicial (KRW)", "Pagamento inicial (KRW)", "Acompte (KRW)", "Anzahlung (KRW)", "Первоначальный взнос (KRW)") : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "월급 (원)", "Monthly salary (KRW)", "Lương hàng tháng (KRW)", "給料（ウォン）", "月薪（韩元）", "月薪（韓元）", "Salario mensual (KRW)", "Salário mensal (KRW)", "Salaire mensuel (KRW)", "Monatsgehalt (KRW)", "Ежемесячная зарплата (KRW)"), "Monthly salary (KRW)", "Lương hàng tháng (KRW)", "給料（ウォン）", "月薪（韩元）", "月薪（韓元）", "Salario mensual (KRW)", "Salário mensal (KRW)", "Salaire mensuel (KRW)", "Monatsgehalt (KRW)", "Ежемесячная зарплата (KRW)"), "Monthly salary (KRW)", "Lương hàng tháng (KRW)", "給料（ウォン）", "月薪（韩元）", "月薪（韓元）", "Salario mensual (KRW)", "Salário mensal (KRW)", "Salaire mensuel (KRW)", "Monatsgehalt (KRW)", "Ежемесячная зарплата (KRW)"), "Monthly salary (KRW)", "Lương hàng tháng (KRW)", "給料（ウォン）", "月薪（韩元）", "月薪（韓元）", "Salario mensual (KRW)", "Salário mensal (KRW)", "Salaire mensuel (KRW)", "Monatsgehalt (KRW)", "Ежемесячная зарплата (KRW)")}
          </Label>
          <Input
            type="number"
            min={0}
            value={value.base_salary || ""}
            onChange={(e) =>
              onChange({
                ...value,
                base_salary: Number(e.target.value) || 0,
                compensation_model: isPartTime
                  ? "hourly"
                  : isFreelancer
                    ? "project"
                    : "monthly",
              })
            }
          />
        </div>
      )}

      {!isFreelancer && krAuto && (
        <div className="space-y-2">
          <Label>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "식대 (월, 비과세 한도 20만원)", "Meals (monthly, tax-exempt limit of 200,000 won)", "Các bữa ăn (hàng tháng, giới hạn miễn thuế 200.000 won)", "食代（月、非課税限度20万ウォン）", "膳食（每月，免税限额20万韩元）", "餐點（每月，免稅限額20萬韓元）", "Comidas (límite mensual exento de impuestos de 200.000 wones)", "Refeições (mensal, limite de isenção de impostos de 200.000 won)", "Repas (mensuel, limite d'exonération fiscale de 200 000 won)", "Mahlzeiten (monatlich, Steuerfreigrenze 200.000 Won)", "Питание (ежемесячно, необлагаемый налогом лимит 200 000 вон)"), "Meals (monthly, tax-exempt limit of 200,000 won)", "Các bữa ăn (hàng tháng, giới hạn miễn thuế 200.000 won)", "食代（月、非課税限度20万ウォン）", "膳食（每月，免税限额20万韩元）", "餐點（每月，免稅限額20萬韓元）", "Comidas (límite mensual exento de impuestos de 200.000 wones)", "Refeições (mensal, limite de isenção de impostos de 200.000 won)", "Repas (mensuel, limite d'exonération fiscale de 200 000 won)", "Mahlzeiten (monatlich, Steuerfreigrenze 200.000 Won)", "Питание (ежемесячно, необлагаемый налогом лимит 200 000 вон)"), "Meals (monthly, tax-exempt limit of 200,000 won)", "Các bữa ăn (hàng tháng, giới hạn miễn thuế 200.000 won)", "食代（月、非課税限度20万ウォン）", "膳食（每月，免税限额20万韩元）", "餐點（每月，免稅限額20萬韓元）", "Comidas (límite mensual exento de impuestos de 200.000 wones)", "Refeições (mensal, limite de isenção de impostos de 200.000 won)", "Repas (mensuel, limite d'exonération fiscale de 200 000 won)", "Mahlzeiten (monatlich, Steuerfreigrenze 200.000 Won)", "Питание (ежемесячно, необлагаемый налогом лимит 200 000 вон)"), "Meals (monthly, tax-exempt limit of 200,000 won)", "Các bữa ăn (hàng tháng, giới hạn miễn thuế 200.000 won)", "食代（月、非課税限度20万ウォン）", "膳食（每月，免税限额20万韩元）", "餐點（每月，免稅限額20萬韓元）", "Comidas (límite mensual exento de impuestos de 200.000 wones)", "Refeições (mensal, limite de isenção de impostos de 200.000 won)", "Repas (mensuel, limite d'exonération fiscale de 200 000 won)", "Mahlzeiten (monatlich, Steuerfreigrenze 200.000 Won)", "Питание (ежемесячно, необлагаемый налогом лимит 200 000 вон)")}</Label>
          <Input
            type="number"
            min={0}
            value={value.meal_allowance_monthly ?? 200000}
            onChange={(e) =>
              onChange({ ...value, meal_allowance_monthly: Number(e.target.value) || 0 })
            }
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "은행", "bank", "ngân hàng", "銀行", "银行", "銀行", "banco", "banco", "banque", "Bank", "банк"), "bank", "ngân hàng", "銀行", "银行", "銀行", "banco", "banco", "banque", "Bank", "банк"), "bank", "ngân hàng", "銀行", "银行", "銀行", "banco", "banco", "banque", "Bank", "банк"), "bank", "ngân hàng", "銀行", "银行", "銀行", "banco", "banco", "banque", "Bank", "банк")}</Label>
        <Input
          value={value.bank_name ?? ""}
          onChange={(e) => onChange({ ...value, bank_name: e.target.value })}
          placeholder={pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "국민은행", "Kookmin Bank", "Ngân hàng Kookmin", "国民銀行", "国民银行", "國民銀行", "Banco Kookmin", "Banco Kookmin", "Banque Kookmin", "Kookmin Bank", "Кукмин Банк"), "Kookmin Bank", "Ngân hàng Kookmin", "国民銀行", "国民银行", "國民銀行", "Banco Kookmin", "Banco Kookmin", "Banque Kookmin", "Kookmin Bank", "Кукмин Банк"), "Kookmin Bank", "Ngân hàng Kookmin", "国民銀行", "国民银行", "國民銀行", "Banco Kookmin", "Banco Kookmin", "Banque Kookmin", "Kookmin Bank", "Кукмин Банк"), "Kookmin Bank", "Ngân hàng Kookmin", "国民銀行", "国民银行", "國民銀行", "Banco Kookmin", "Banco Kookmin", "Banque Kookmin", "Kookmin Bank", "Кукмин Банк")}
        />
      </div>
      <div className="space-y-2">
        <Label>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "계좌번호", "account number", "số tài khoản", "口座番号", "帐号", "帳號", "número de cuenta", "número de conta", "numéro de compte", "Kontonummer", "номер счета"), "account number", "số tài khoản", "口座番号", "帐号", "帳號", "número de cuenta", "número de conta", "numéro de compte", "Kontonummer", "номер счета"), "account number", "số tài khoản", "口座番号", "帐号", "帳號", "número de cuenta", "número de conta", "numéro de compte", "Kontonummer", "номер счета"), "account number", "số tài khoản", "口座番号", "帐号", "帳號", "número de cuenta", "número de conta", "numéro de compte", "Kontonummer", "номер счета")}</Label>
        <Input
          value={value.account_number ?? ""}
          onChange={(e) => onChange({ ...value, account_number: e.target.value })}
        />
      </div>

      {!isFreelancer && krAuto && (
        <div className="md:col-span-2 rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
          <Label className="text-sm font-semibold">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "4대보험 (근로자 부담분)", "4 major insurances (employee’s share)", "4 loại bảo hiểm chính (phần của người lao động)", "4大保険（労働者負担分）", "4大保险（员工份额）", "4大保險（員工份額）", "4 seguros principales (participación de los empleados)", "4 principais seguros (parcela do funcionário)", "4 assurances majeures (part salarié)", "4 große Versicherungen (Mitarbeiteranteil)", "4 основные страховки (доля работника)"), "4 major insurances (employee’s share)", "4 loại bảo hiểm chính (phần của người lao động)", "4大保険（労働者負担分）", "4大保险（员工份额）", "4大保險（員工份額）", "4 seguros principales (participación de los empleados)", "4 principais seguros (parcela do funcionário)", "4 assurances majeures (part salarié)", "4 große Versicherungen (Mitarbeiteranteil)", "4 основные страховки (доля работника)"), "4 major insurances (employee’s share)", "4 loại bảo hiểm chính (phần của người lao động)", "4大保険（労働者負担分）", "4大保险（员工份额）", "4大保險（員工份額）", "4 seguros principales (participación de los empleados)", "4 principais seguros (parcela do funcionário)", "4 assurances majeures (part salarié)", "4 große Versicherungen (Mitarbeiteranteil)", "4 основные страховки (доля работника)"), "4 major insurances (employee’s share)", "4 loại bảo hiểm chính (phần của người lao động)", "4大保険（労働者負担分）", "4大保险（员工份额）", "4大保險（員工份額）", "4 seguros principales (participación de los empleados)", "4 principais seguros (parcela do funcionário)", "4 assurances majeures (part salarié)", "4 große Versicherungen (Mitarbeiteranteil)", "4 основные страховки (доля работника)")}</Label>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={value.insurance_national_pension}
                onCheckedChange={(v) =>
                  onChange({ ...value, insurance_national_pension: v === true })
                }
              />
             {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "국민연금 (4.5%)", "National Pension (4.5%)", "Lương hưu quốc gia (4,5%)", "国民年金（4.5％）", "国民养老金 (4.5%)", "國民退休金 (4.5%)", "Pensión Nacional (4,5%)", "Pensão Nacional (4,5%)", "Pension nationale (4,5%)", "Volksrente (4,5 %)", "Национальная пенсия (4,5%)"), "National Pension (4.5%)", "Lương hưu quốc gia (4,5%)", "国民年金（4.5％）", "国民养老金 (4.5%)", "國民退休金 (4.5%)", "Pensión Nacional (4,5%)", "Pensão Nacional (4,5%)", "Pension nationale (4,5%)", "Volksrente (4,5 %)", "Национальная пенсия (4,5%)"), "National Pension (4.5%)", "Lương hưu quốc gia (4,5%)", "国民年金（4.5％）", "国民养老金 (4.5%)", "國民退休金 (4.5%)", "Pensión Nacional (4,5%)", "Pensão Nacional (4,5%)", "Pension nationale (4,5%)", "Volksrente (4,5 %)", "Национальная пенсия (4,5%)"), "National Pension (4.5%)", "Lương hưu quốc gia (4,5%)", "国民年金（4.5％）", "国民养老金 (4.5%)", "國民退休金 (4.5%)", "Pensión Nacional (4,5%)", "Pensão Nacional (4,5%)", "Pension nationale (4,5%)", "Volksrente (4,5 %)", "Национальная пенсия (4,5%)")})
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={value.insurance_health}
                onCheckedChange={(v) =>
                  onChange({ ...value, insurance_health: v === true })
                }
              />
             {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "건강보험 (3.545%)", "Health Insurance (3.545%)", "Bảo hiểm y tế (3,545%)", "健康保険（3.545％）", "健康保险 (3.545%)", "健康保險 (3.545%)", "Seguro de Salud (3,545%)", "Seguro Saúde (3,545%)", "Assurance maladie (3,545%)", "Krankenversicherung (3,545 %)", "Медицинское страхование (3,545%)"), "Health Insurance (3.545%)", "Bảo hiểm y tế (3,545%)", "健康保険（3.545％）", "健康保险 (3.545%)", "健康保險 (3.545%)", "Seguro de Salud (3,545%)", "Seguro Saúde (3,545%)", "Assurance maladie (3,545%)", "Krankenversicherung (3,545 %)", "Медицинское страхование (3,545%)"), "Health Insurance (3.545%)", "Bảo hiểm y tế (3,545%)", "健康保険（3.545％）", "健康保险 (3.545%)", "健康保險 (3.545%)", "Seguro de Salud (3,545%)", "Seguro Saúde (3,545%)", "Assurance maladie (3,545%)", "Krankenversicherung (3,545 %)", "Медицинское страхование (3,545%)"), "Health Insurance (3.545%)", "Bảo hiểm y tế (3,545%)", "健康保険（3.545％）", "健康保险 (3.545%)", "健康保險 (3.545%)", "Seguro de Salud (3,545%)", "Seguro Saúde (3,545%)", "Assurance maladie (3,545%)", "Krankenversicherung (3,545 %)", "Медицинское страхование (3,545%)")})
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={value.insurance_employment}
                onCheckedChange={(v) =>
                  onChange({ ...value, insurance_employment: v === true })
                }
              />
             {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "고용보험 (0.9%)", "Employment insurance (0.9%)", "Bảo hiểm việc làm (0,9%)", "雇用保険（0.9％）", "就业保险 (0.9%)", "就業保險 (0.9%)", "Seguro de empleo (0,9%)", "Seguro de trabalho (0,9%)", "Assurance-emploi (0,9%)", "Arbeitsversicherung (0,9 %)", "Страхование занятости (0,9%)"), "Employment insurance (0.9%)", "Bảo hiểm việc làm (0,9%)", "雇用保険（0.9％）", "就业保险 (0.9%)", "就業保險 (0.9%)", "Seguro de empleo (0,9%)", "Seguro de trabalho (0,9%)", "Assurance-emploi (0,9%)", "Arbeitsversicherung (0,9 %)", "Страхование занятости (0,9%)"), "Employment insurance (0.9%)", "Bảo hiểm việc làm (0,9%)", "雇用保険（0.9％）", "就业保险 (0.9%)", "就業保險 (0.9%)", "Seguro de empleo (0,9%)", "Seguro de trabalho (0,9%)", "Assurance-emploi (0,9%)", "Arbeitsversicherung (0,9 %)", "Страхование занятости (0,9%)"), "Employment insurance (0.9%)", "Bảo hiểm việc làm (0,9%)", "雇用保険（0.9％）", "就业保险 (0.9%)", "就業保險 (0.9%)", "Seguro de empleo (0,9%)", "Seguro de trabalho (0,9%)", "Assurance-emploi (0,9%)", "Arbeitsversicherung (0,9 %)", "Страхование занятости (0,9%)")})
            </label>
          </div>
        </div>
      )}

      <div className="space-y-2 md:col-span-2">
        <Label>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "세무 메모", "tax memo", "bản ghi nhớ thuế", "税務メモ", "税务备忘录", "稅務備忘錄", "nota de impuestos", "nota fiscal", "mémo fiscal", "Steuervermerk", "налоговая записка"), "tax memo", "bản ghi nhớ thuế", "税務メモ", "税务备忘录", "稅務備忘錄", "nota de impuestos", "nota fiscal", "mémo fiscal", "Steuervermerk", "налоговая записка"), "tax memo", "bản ghi nhớ thuế", "税務メモ", "税务备忘录", "稅務備忘錄", "nota de impuestos", "nota fiscal", "mémo fiscal", "Steuervermerk", "налоговая записка"), "tax memo", "bản ghi nhớ thuế", "税務メモ", "税务备忘录", "稅務備忘錄", "nota de impuestos", "nota fiscal", "mémo fiscal", "Steuervermerk", "налоговая записка")}</Label>
        <Input
          value={value.tax_note ?? ""}
          onChange={(e) => onChange({ ...value, tax_note: e.target.value })}
          placeholder={pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "간이세액표 적용, 외국인 단일세율 등", "Application of simplified tax table, single tax rate for foreigners, etc.", "Áp dụng biểu thuế đơn giản, thuế suất chung cho người nước ngoài, v.v.", "簡易税額表の適用、外国人単一税率など", "适用简化税表、外国人单一税率等", "適用簡化稅表、外國人單一稅率等", "Aplicación de tabla impositiva simplificada, tipo impositivo único para extranjeros, etc.", "Aplicação de tabela tributária simplificada, alíquota única para estrangeiros, etc.", "Application du barème d’imposition simplifié, taux d’imposition unique pour les étrangers, etc.", "Anwendung der vereinfachten Steuertabelle, des einheitlichen Steuersatzes für Ausländer usw.", "Применение упрощенной таблицы налогообложения, единой ставки налога для иностранцев и т.д."), "Application of simplified tax table, single tax rate for foreigners, etc.", "Áp dụng biểu thuế đơn giản, thuế suất chung cho người nước ngoài, v.v.", "簡易税額表の適用、外国人単一税率など", "适用简化税表、外国人单一税率等", "適用簡化稅表、外國人單一稅率等", "Aplicación de tabla impositiva simplificada, tipo impositivo único para extranjeros, etc.", "Aplicação de tabela tributária simplificada, alíquota única para estrangeiros, etc.", "Application du barème d’imposition simplifié, taux d’imposition unique pour les étrangers, etc.", "Anwendung der vereinfachten Steuertabelle, des einheitlichen Steuersatzes für Ausländer usw.", "Применение упрощенной таблицы налогообложения, единой ставки налога для иностранцев и т.д."), "Application of simplified tax table, single tax rate for foreigners, etc.", "Áp dụng biểu thuế đơn giản, thuế suất chung cho người nước ngoài, v.v.", "簡易税額表の適用、外国人単一税率など", "适用简化税表、外国人单一税率等", "適用簡化稅表、外國人單一稅率等", "Aplicación de tabla impositiva simplificada, tipo impositivo único para extranjeros, etc.", "Aplicação de tabela tributária simplificada, alíquota única para estrangeiros, etc.", "Application du barème d’imposition simplifié, taux d’imposition unique pour les étrangers, etc.", "Anwendung der vereinfachten Steuertabelle, des einheitlichen Steuersatzes für Ausländer usw.", "Применение упрощенной таблицы налогообложения, единой ставки налога для иностранцев и т.д."), "Application of simplified tax table, single tax rate for foreigners, etc.", "Áp dụng biểu thuế đơn giản, thuế suất chung cho người nước ngoài, v.v.", "簡易税額表の適用、外国人単一税率など", "适用简化税表、外国人单一税率等", "適用簡化稅表、外國人單一稅率等", "Aplicación de tabla impositiva simplificada, tipo impositivo único para extranjeros, etc.", "Aplicação de tabela tributária simplificada, alíquota única para estrangeiros, etc.", "Application du barème d’imposition simplifié, taux d’imposition unique pour les étrangers, etc.", "Anwendung der vereinfachten Steuertabelle, des einheitlichen Steuersatzes für Ausländer usw.", "Применение упрощенной таблицы налогообложения, единой ставки налога для иностранцев и т.д.")}
        />
      </div>
    </div>
  );
}
