"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Globe, Save } from "lucide-react";
import { PAYROLL_JURISDICTION_OPTIONS } from "@/lib/payroll/types";
import type { CompensationModel, PayrollMode } from "@/lib/payroll/types";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export function PayrollSettingsCard() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);

  const { settings, saveSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [jurisdiction, setJurisdiction] = useState("KR");
  const [payrollMode, setPayrollMode] = useState<PayrollMode>("auto");
  const [fullTimeModel, setFullTimeModel] = useState<CompensationModel>("annual");

  useEffect(() => {
    if (!settings) return;
    const j = settings.payrollJurisdiction || settings.country || "KR";
    setJurisdiction(j);
    setPayrollMode(settings.payrollMode ?? (j === "KR" ? "auto" : "manual"));
    setFullTimeModel(settings.fullTimeCompensationModel ?? "annual");
  }, [settings]);

  if (!settings) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({
        ...settings,
        payrollJurisdiction: jurisdiction,
        payrollMode,
        fullTimeCompensationModel: fullTimeModel,
      });
      toast.success(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여·노동 설정이 저장되었습니다.", "Payroll/labor settings have been saved.", "Cài đặt tiền lương/lao động đã được lưu.", "給与・労働設定が保存されました。", "工资单/人工设置已保存。", "薪資單/手動設定已儲存。", "Se han guardado las configuraciones de nómina/mano de obra.", "As configurações de folha de pagamento/mão de obra foram salvas.", "Les paramètres de paie/main-d'œuvre ont été enregistrés.", "Lohn-/Arbeitseinstellungen wurden gespeichert.", "Настройки расчета/труда сохранены."), "Payroll/labor settings have been saved.", "Cài đặt tiền lương/lao động đã được lưu.", "給与・労働設定が保存されました。", "工资单/人工设置已保存。", "薪資單/手動設定已儲存。", "Se han guardado las configuraciones de nómina/mano de obra.", "As configurações de folha de pagamento/mão de obra foram salvas.", "Les paramètres de paie/main-d'œuvre ont été enregistrés.", "Lohn-/Arbeitseinstellungen wurden gespeichert.", "Настройки расчета/труда сохранены."), "Payroll/labor settings have been saved.", "Cài đặt tiền lương/lao động đã được lưu.", "給与・労働設定が保存されました。", "工资单/人工设置已保存。", "薪資單/手動設定已儲存。", "Se han guardado las configuraciones de nómina/mano de obra.", "As configurações de folha de pagamento/mão de obra foram salvas.", "Les paramètres de paie/main-d'œuvre ont été enregistrés.", "Lohn-/Arbeitseinstellungen wurden gespeichert.", "Настройки расчета/труда сохранены."), "Payroll/labor settings have been saved.", "Cài đặt tiền lương/lao động đã được lưu.", "給与・労働設定が保存されました。", "工资单/人工设置已保存。", "薪資單/手動設定已儲存。", "Se han guardado las configuraciones de nómina/mano de obra.", "As configurações de folha de pagamento/mão de obra foram salvas.", "Les paramètres de paie/main-d'œuvre ont été enregistrés.", "Lohn-/Arbeitseinstellungen wurden gespeichert.", "Настройки расчета/труда сохранены."));
    } catch {
      toast.error(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "저장에 실패했습니다.", "Save failed.", "Lưu không thành công.", "保存に失敗しました。", "保存失败。", "保存失敗。", "Error al guardar.", "Falha ao salvar.", "L'enregistrement a échoué.", "Speichern fehlgeschlagen.", "Сохранить не удалось."), "Save failed.", "Lưu không thành công.", "保存に失敗しました。", "保存失败。", "保存失敗。", "Error al guardar.", "Falha ao salvar.", "L'enregistrement a échoué.", "Speichern fehlgeschlagen.", "Сохранить не удалось."), "Save failed.", "Lưu không thành công.", "保存に失敗しました。", "保存失败。", "保存失敗。", "Error al guardar.", "Falha ao salvar.", "L'enregistrement a échoué.", "Speichern fehlgeschlagen.", "Сохранить не удалось."), "Save failed.", "Lưu không thành công.", "保存に失敗しました。", "保存失败。", "保存失敗。", "Error al guardar.", "Falha ao salvar.", "L'enregistrement a échoué.", "Speichern fehlgeschlagen.", "Сохранить не удалось."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
           {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여·노동 (국가)", "Salary/Labor (Country)", "Mức lương/Lao động (Quốc gia)", "給与・労働（国）", "工资/劳动力（国家/地区）", "工資/勞動力（國家/地區）", "Salario/Mano de obra (País)", "Salário/Trabalho (País)", "Salaire/Main d'œuvre (Pays)", "Gehalt/Arbeit (Land)", "Заработная плата/труд (Страна)"), "Salary/Labor (Country)", "Mức lương/Lao động (Quốc gia)", "給与・労働（国）", "工资/劳动力（国家/地区）", "工資/勞動力（國家/地區）", "Salario/Mano de obra (País)", "Salário/Trabalho (País)", "Salaire/Main d'œuvre (Pays)", "Gehalt/Arbeit (Land)", "Заработная плата/труд (Страна)"), "Salary/Labor (Country)", "Mức lương/Lao động (Quốc gia)", "給与・労働（国）", "工资/劳动力（国家/地区）", "工資/勞動力（國家/地區）", "Salario/Mano de obra (País)", "Salário/Trabalho (País)", "Salaire/Main d'œuvre (Pays)", "Gehalt/Arbeit (Land)", "Заработная плата/труд (Страна)"), "Salary/Labor (Country)", "Mức lương/Lao động (Quốc gia)", "給与・労働（国）", "工资/劳动力（国家/地区）", "工資/勞動力（國家/地區）", "Salario/Mano de obra (País)", "Salário/Trabalho (País)", "Salaire/Main d'œuvre (Pays)", "Gehalt/Arbeit (Land)", "Заработная плата/труд (Страна)")})
          </CardTitle>
          <CardDescription className="mt-1">
           {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "국가별 급여 계산 방식. 한국 외 지역은 수동 명세 모드를 권장합니다.", "How salaries are calculated by country. For regions outside of Korea, manual specification mode is recommended.", "Cách tính lương theo quốc gia Đối với các khu vực bên ngoài Hàn Quốc, nên sử dụng chế độ cài đặt thủ công.", "国ごとの給与の計算方法。 韓国以外の地域の場合は、手動指定モードをお勧めします。", "工资如何按国家/地区计算。 对于韩国以外的地区，建议使用手动指定模式。", "工資如何按國家計算。 對於韓國以外的地區，建議使用手動指定模式。", "Cómo se calculan los salarios por país. Para regiones fuera de Corea, se recomienda el modo de especificación manual.", "Como os salários são calculados por país. Para regiões fora da Coreia, recomenda-se o modo de especificação manual.", "Comment les salaires sont calculés par pays. Pour les régions en dehors de la Corée, le mode de spécification manuelle est recommandé.", "Wie Gehälter nach Ländern berechnet werden. Für Regionen außerhalb Koreas wird der manuelle Spezifikationsmodus empfohlen.", "Как рассчитываются зарплаты по странам. Для регионов за пределами Кореи рекомендуется использовать режим ручного указания."), "How salaries are calculated by country. For regions outside of Korea, manual specification mode is recommended.", "Cách tính lương theo quốc gia Đối với các khu vực bên ngoài Hàn Quốc, nên sử dụng chế độ cài đặt thủ công.", "国ごとの給与の計算方法。 韓国以外の地域の場合は、手動指定モードをお勧めします。", "工资如何按国家/地区计算。 对于韩国以外的地区，建议使用手动指定模式。", "工資如何按國家計算。 對於韓國以外的地區，建議使用手動指定模式。", "Cómo se calculan los salarios por país. Para regiones fuera de Corea, se recomienda el modo de especificación manual.", "Como os salários são calculados por país. Para regiões fora da Coreia, recomenda-se o modo de especificação manual.", "Comment les salaires sont calculés par pays. Pour les régions en dehors de la Corée, le mode de spécification manuelle est recommandé.", "Wie Gehälter nach Ländern berechnet werden. Für Regionen außerhalb Koreas wird der manuelle Spezifikationsmodus empfohlen.", "Как рассчитываются зарплаты по странам. Для регионов за пределами Кореи рекомендуется использовать режим ручного указания."), "How salaries are calculated by country. For regions outside of Korea, manual specification mode is recommended.", "Cách tính lương theo quốc gia Đối với các khu vực bên ngoài Hàn Quốc, nên sử dụng chế độ cài đặt thủ công.", "国ごとの給与の計算方法。 韓国以外の地域の場合は、手動指定モードをお勧めします。", "工资如何按国家/地区计算。 对于韩国以外的地区，建议使用手动指定模式。", "工資如何按國家計算。 對於韓國以外的地區，建議使用手動指定模式。", "Cómo se calculan los salarios por país. Para regiones fuera de Corea, se recomienda el modo de especificación manual.", "Como os salários são calculados por país. Para regiões fora da Coreia, recomenda-se o modo de especificação manual.", "Comment les salaires sont calculés par pays. Pour les régions en dehors de la Corée, le mode de spécification manuelle est recommandé.", "Wie Gehälter nach Ländern berechnet werden. Für Regionen außerhalb Koreas wird der manuelle Spezifikationsmodus empfohlen.", "Как рассчитываются зарплаты по странам. Для регионов за пределами Кореи рекомендуется использовать режим ручного указания."), "How salaries are calculated by country. For regions outside of Korea, manual specification mode is recommended.", "Cách tính lương theo quốc gia Đối với các khu vực bên ngoài Hàn Quốc, nên sử dụng chế độ cài đặt thủ công.", "国ごとの給与の計算方法。 韓国以外の地域の場合は、手動指定モードをお勧めします。", "工资如何按国家/地区计算。 对于韩国以外的地区，建议使用手动指定模式。", "工資如何按國家計算。 對於韓國以外的地區，建議使用手動指定模式。", "Cómo se calculan los salarios por país. Para regiones fuera de Corea, se recomienda el modo de especificación manual.", "Como os salários são calculados por país. Para regiões fora da Coreia, recomenda-se o modo de especificação manual.", "Comment les salaires sont calculés par pays. Pour les régions en dehors de la Corée, le mode de spécification manuelle est recommandé.", "Wie Gehälter nach Ländern berechnet werden. Für Regionen außerhalb Koreas wird der manuelle Spezifikationsmodus empfohlen.", "Как рассчитываются зарплаты по странам. Для регионов за пределами Кореи рекомендуется использовать режим ручного указания.")}.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />
          {saving ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "저장 중...", "Saving...", "Đang lưu...", "保存中...", "保存...", "儲存...", "Ahorro...", "Salvando...", "Économie...", "Sparen...", "Сохранение..."), "Saving...", "Đang lưu...", "保存中...", "保存...", "儲存...", "Ahorro...", "Salvando...", "Économie...", "Sparen...", "Сохранение..."), "Saving...", "Đang lưu...", "保存中...", "保存...", "儲存...", "Ahorro...", "Salvando...", "Économie...", "Sparen...", "Сохранение..."), "Saving...", "Đang lưu...", "保存中...", "保存...", "儲存...", "Ahorro...", "Salvando...", "Économie...", "Sparen...", "Сохранение...") : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "저장", "save", "cứu", "保存", "节省", "節省", "ahorrar", "salvar", "sauvegarder", "speichern", "сохранять"), "save", "cứu", "保存", "节省", "節省", "ahorrar", "salvar", "sauvegarder", "speichern", "сохранять"), "save", "cứu", "保存", "节省", "節省", "ahorrar", "salvar", "sauvegarder", "speichern", "сохранять"), "save", "cứu", "保存", "节省", "節省", "ahorrar", "salvar", "sauvegarder", "speichern", "сохранять")}
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여 관할 국가", "Salary jurisdiction country", "Quốc gia có thẩm quyền về lương", "給与管轄国", "薪资管辖国家", "薪資管轄國家", "País de jurisdicción salarial", "País de jurisdição salarial", "Pays de juridiction salariale", "Land der Gehaltszuständigkeit", "Страна юрисдикции зарплаты"), "Salary jurisdiction country", "Quốc gia có thẩm quyền về lương", "給与管轄国", "薪资管辖国家", "薪資管轄國家", "País de jurisdicción salarial", "País de jurisdição salarial", "Pays de juridiction salariale", "Land der Gehaltszuständigkeit", "Страна юрисдикции зарплаты"), "Salary jurisdiction country", "Quốc gia có thẩm quyền về lương", "給与管轄国", "薪资管辖国家", "薪資管轄國家", "País de jurisdicción salarial", "País de jurisdição salarial", "Pays de juridiction salariale", "Land der Gehaltszuständigkeit", "Страна юрисдикции зарплаты"), "Salary jurisdiction country", "Quốc gia có thẩm quyền về lương", "給与管轄国", "薪资管辖国家", "薪資管轄國家", "País de jurisdicción salarial", "País de jurisdição salarial", "Pays de juridiction salariale", "Land der Gehaltszuständigkeit", "Страна юрисдикции зарплаты")}</Label>
          <select
            className="w-full h-9 rounded-md border px-3 text-sm"
            value={jurisdiction}
            onChange={(e) => {
              const code = e.target.value;
              setJurisdiction(code);
              if (code !== "KR") setPayrollMode("manual");
              else setPayrollMode("auto");
            }}
          >
            {PAYROLL_JURISDICTION_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">매장 국가: {settings.country}</p>
        </div>

        <div className="space-y-2">
          <Label>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "계산 모드", "calculation mode", "chế độ tính toán", "計算モード", "计算方式", "計算方式", "modo de cálculo", "modo de cálculo", "mode de calcul", "Berechnungsmodus", "режим расчета"), "calculation mode", "chế độ tính toán", "計算モード", "计算方式", "計算方式", "modo de cálculo", "modo de cálculo", "mode de calcul", "Berechnungsmodus", "режим расчета"), "calculation mode", "chế độ tính toán", "計算モード", "计算方式", "計算方式", "modo de cálculo", "modo de cálculo", "mode de calcul", "Berechnungsmodus", "режим расчета"), "calculation mode", "chế độ tính toán", "計算モード", "计算方式", "計算方式", "modo de cálculo", "modo de cálculo", "mode de calcul", "Berechnungsmodus", "режим расчета")}</Label>
          <select
            className="w-full h-9 rounded-md border px-3 text-sm"
            value={payrollMode}
            onChange={(e) => setPayrollMode(e.target.value as PayrollMode)}
          >
            <option value="auto">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "자동 (국가 법규 모듈)", "Automatic (national legislation module)", "Tự động (mô-đun pháp luật quốc gia)", "自動(国家法規モジュール)", "自动（国家立法模块）", "自動（國家立法模組）", "Automático (módulo de legislación nacional)", "Automático (módulo de legislação nacional)", "Automatique (module législation nationale)", "Automatisch (Modul für nationale Gesetzgebung)", "Автоматический (модуль национального законодательства)"), "Automatic (national legislation module)", "Tự động (mô-đun pháp luật quốc gia)", "自動(国家法規モジュール)", "自动（国家立法模块）", "自動（國家立法模組）", "Automático (módulo de legislación nacional)", "Automático (módulo de legislação nacional)", "Automatique (module législation nationale)", "Automatisch (Modul für nationale Gesetzgebung)", "Автоматический (модуль национального законодательства)"), "Automatic (national legislation module)", "Tự động (mô-đun pháp luật quốc gia)", "自動(国家法規モジュール)", "自动（国家立法模块）", "自動（國家立法模組）", "Automático (módulo de legislación nacional)", "Automático (módulo de legislação nacional)", "Automatique (module législation nationale)", "Automatisch (Modul für nationale Gesetzgebung)", "Автоматический (модуль национального законодательства)"), "Automatic (national legislation module)", "Tự động (mô-đun pháp luật quốc gia)", "自動(国家法規モジュール)", "自动（国家立法模块）", "自動（國家立法模組）", "Automático (módulo de legislación nacional)", "Automático (módulo de legislação nacional)", "Automatique (module législation nationale)", "Automatisch (Modul für nationale Gesetzgebung)", "Автоматический (модуль национального законодательства)")}</option>
            <option value="manual">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "수동 (지급·공제 직접 입력)", "Manually (input payment/deduction directly)", "Thủ công (nhập/khấu trừ trực tiếp)", "手動（支払・控除直接入力）", "手动（直接输入付款/扣款）", "手動（直接輸入付款/扣款）", "Manualmente (ingresar pago/deducción directamente)", "Manualmente (inserir pagamento/dedução diretamente)", "Manuellement (saisir directement le paiement/déduction)", "Manuell (Zahlung/Abzug direkt erfassen)", "Вручную (ввод платежа/вычета напрямую)"), "Manually (input payment/deduction directly)", "Thủ công (nhập/khấu trừ trực tiếp)", "手動（支払・控除直接入力）", "手动（直接输入付款/扣款）", "手動（直接輸入付款/扣款）", "Manualmente (ingresar pago/deducción directamente)", "Manualmente (inserir pagamento/dedução diretamente)", "Manuellement (saisir directement le paiement/déduction)", "Manuell (Zahlung/Abzug direkt erfassen)", "Вручную (ввод платежа/вычета напрямую)"), "Manually (input payment/deduction directly)", "Thủ công (nhập/khấu trừ trực tiếp)", "手動（支払・控除直接入力）", "手动（直接输入付款/扣款）", "手動（直接輸入付款/扣款）", "Manualmente (ingresar pago/deducción directamente)", "Manualmente (inserir pagamento/dedução diretamente)", "Manuellement (saisir directement le paiement/déduction)", "Manuell (Zahlung/Abzug direkt erfassen)", "Вручную (ввод платежа/вычета напрямую)"), "Manually (input payment/deduction directly)", "Thủ công (nhập/khấu trừ trực tiếp)", "手動（支払・控除直接入力）", "手动（直接输入付款/扣款）", "手動（直接輸入付款/扣款）", "Manualmente (ingresar pago/deducción directamente)", "Manualmente (inserir pagamento/dedução diretamente)", "Manuellement (saisir directement le paiement/déduction)", "Manuell (Zahlung/Abzug direkt erfassen)", "Вручную (ввод платежа/вычета напрямую)")}</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "정직원 기본 보수", "Basic compensation for full-time employees", "Bồi thường cơ bản cho nhân viên toàn thời gian", "正社員基本報酬", "全职员工的基本薪酬", "全職員工的基本薪酬", "Compensación básica para empleados de tiempo completo", "Remuneração básica para funcionários em tempo integral", "Rémunération de base pour les salariés à temps plein", "Grundvergütung für Vollzeitbeschäftigte", "Базовая компенсация для штатных сотрудников"), "Basic compensation for full-time employees", "Bồi thường cơ bản cho nhân viên toàn thời gian", "正社員基本報酬", "全职员工的基本薪酬", "全職員工的基本薪酬", "Compensación básica para empleados de tiempo completo", "Remuneração básica para funcionários em tempo integral", "Rémunération de base pour les salariés à temps plein", "Grundvergütung für Vollzeitbeschäftigte", "Базовая компенсация для штатных сотрудников"), "Basic compensation for full-time employees", "Bồi thường cơ bản cho nhân viên toàn thời gian", "正社員基本報酬", "全职员工的基本薪酬", "全職員工的基本薪酬", "Compensación básica para empleados de tiempo completo", "Remuneração básica para funcionários em tempo integral", "Rémunération de base pour les salariés à temps plein", "Grundvergütung für Vollzeitbeschäftigte", "Базовая компенсация для штатных сотрудников"), "Basic compensation for full-time employees", "Bồi thường cơ bản cho nhân viên toàn thời gian", "正社員基本報酬", "全职员工的基本薪酬", "全職員工的基本薪酬", "Compensación básica para empleados de tiempo completo", "Remuneração básica para funcionários em tempo integral", "Rémunération de base pour les salariés à temps plein", "Grundvergütung für Vollzeitbeschäftigte", "Базовая компенсация для штатных сотрудников")}</Label>
          <select
            className="w-full h-9 rounded-md border px-3 text-sm"
            value={fullTimeModel}
            onChange={(e) => setFullTimeModel(e.target.value as CompensationModel)}
          >
            <option value="annual">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "년봉제 (÷12 월 환산)", "Yearly salary (converted to December)", "Lương hàng năm (quy đổi sang tháng 12)", "年縫製（÷12月換算）", "年薪（换算为12月）", "年薪（換算為12月）", "Salario anual (convertido a diciembre)", "Salário anual (convertido para dezembro)", "Salaire annuel (converti en décembre)", "Jahresgehalt (umgerechnet auf Dezember)", "Годовая зарплата (пересчитанная в декабрь)"), "Yearly salary (converted to December)", "Lương hàng năm (quy đổi sang tháng 12)", "年縫製（÷12月換算）", "年薪（换算为12月）", "年薪（換算為12月）", "Salario anual (convertido a diciembre)", "Salário anual (convertido para dezembro)", "Salaire annuel (converti en décembre)", "Jahresgehalt (umgerechnet auf Dezember)", "Годовая зарплата (пересчитанная в декабрь)"), "Yearly salary (converted to December)", "Lương hàng năm (quy đổi sang tháng 12)", "年縫製（÷12月換算）", "年薪（换算为12月）", "年薪（換算為12月）", "Salario anual (convertido a diciembre)", "Salário anual (convertido para dezembro)", "Salaire annuel (converti en décembre)", "Jahresgehalt (umgerechnet auf Dezember)", "Годовая зарплата (пересчитанная в декабрь)"), "Yearly salary (converted to December)", "Lương hàng năm (quy đổi sang tháng 12)", "年縫製（÷12月換算）", "年薪（换算为12月）", "年薪（換算為12月）", "Salario anual (convertido a diciembre)", "Salário anual (convertido para dezembro)", "Salaire annuel (converti en décembre)", "Jahresgehalt (umgerechnet auf Dezember)", "Годовая зарплата (пересчитанная в декабрь)")}</option>
            <option value="monthly">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "월급제", "monthly salary system", "hệ thống lương hàng tháng", "給料制", "月薪制", "月薪制度", "sistema de salario mensual", "sistema salarial mensal", "système de salaire mensuel", "monatliches Gehaltssystem", "система ежемесячной заработной платы"), "monthly salary system", "hệ thống lương hàng tháng", "給料制", "月薪制", "月薪制度", "sistema de salario mensual", "sistema salarial mensal", "système de salaire mensuel", "monatliches Gehaltssystem", "система ежемесячной заработной платы"), "monthly salary system", "hệ thống lương hàng tháng", "給料制", "月薪制", "月薪制度", "sistema de salario mensual", "sistema salarial mensal", "système de salaire mensuel", "monatliches Gehaltssystem", "система ежемесячной заработной платы"), "monthly salary system", "hệ thống lương hàng tháng", "給料制", "月薪制", "月薪制度", "sistema de salario mensual", "sistema salarial mensal", "système de salaire mensuel", "monatliches Gehaltssystem", "система ежемесячной заработной платы")}</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
