"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { toast } from "sonner";
import { StaffSubNav } from "@/app/dashboard/staff/components/staff-sub-nav";
import { StaffFinancialForm } from "@/app/dashboard/staff/components/StaffFinancialForm";
import { StaffSeveranceCard } from "@/app/dashboard/staff/components/StaffSeveranceCard";
import { PayrollSettingsCard } from "@/app/dashboard/staff/components/PayrollSettingsCard";
import { resolvePayrollConfig, syncFinancialFromAnnual } from "@/lib/payroll/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calculator,
  Eye,
  FileDown,
  Mail,
  Printer,
  RefreshCw,
  Save,
  Wallet,
} from "lucide-react";
import type { StaffFinancial, StaffSalaryStatement } from "@/types/staff-salary";
import { StaffPayslipBreakdown } from "@/app/dashboard/staff/components/StaffPayslipBreakdown";
import { PayslipPreviewDialog } from "@/app/dashboard/staff/components/PayslipPreviewDialog";
import { exportStaffSalaryToExcel } from "@/lib/staff-hr-excel";
import { createClient } from "@/utils/supabase/client";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

interface StaffRow {
  id: string;
  name: string;
  position?: string | null;
  email?: string | null;
}

type StatementRow = StaffSalaryStatement & {
  tenant_staff?: { name: string; position?: string; email?: string } | null;
};

const EMPTY_FIN: StaffFinancial = {
  staff_id: "",
  employment_type: "정직원",
  salary_type: "월급",
  compensation_model: "annual",
  annual_salary: 0,
  base_salary: 0,
  meal_allowance_monthly: 200000,
  insurance_national_pension: true,
  insurance_health: true,
  insurance_employment: true,
};

export default function StaffSalaryPage() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);

  const { canManageStaff, isLoading: authLoading, tenantId } = useAuth();
  const { settings } = useSettings();
  const payroll = resolvePayrollConfig(settings ?? {});
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [financial, setFinancial] = useState<StaffFinancial>(EMPTY_FIN);
  const [statement, setStatement] = useState<StatementRow | null>(null);
  const [incomeTaxManual, setIncomeTaxManual] = useState(0);
  const [manualDeductions, setManualDeductions] = useState(0);
  const [manualIncomeTax, setManualIncomeTax] = useState(0);
  const [manualLocalTax, setManualLocalTax] = useState(0);
  const [manualInsurance, setManualInsurance] = useState(0);
  const [overtimePay, setOvertimePay] = useState(0);
  const [otherAllowance, setOtherAllowance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [allStatements, setAllStatements] = useState<StatementRow[]>([]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [schemaWarning, setSchemaWarning] = useState<string | null>(null);

  const applySchemaWarning = (msg?: string) => {
    if (msg) setSchemaWarning(msg);
  };

  const fetchStaff = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("tenant_staff")
      .select("id, name, position, email")
      .eq("tenant_id", tenantId)
      .order("name");
    setStaffList(data || []);
    if (data?.length && !selectedStaffId) setSelectedStaffId(data[0].id);
  }, [tenantId, selectedStaffId]);

  const fetchFinancial = useCallback(async (staffId: string) => {
    const res = await fetch(`/api/staff/financials?staffId=${staffId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    applySchemaWarning(json.schemaWarning);
    const fin = (json.financials?.[0] as StaffFinancial) ?? {
      ...EMPTY_FIN,
      staff_id: staffId,
    };
    setFinancial({
      ...fin,
      compensation_model: fin.compensation_model ?? "annual",
      annual_salary: fin.annual_salary ?? 0,
    });
  }, []);

  const fetchStatement = useCallback(async (staffId: string, ym: string) => {
    const res = await fetch(
      `/api/staff/salary?staffId=${staffId}&yearMonth=${ym}`,
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    applySchemaWarning(json.schemaWarning);
    const stmt = (json.statements?.[0] as StatementRow) ?? null;
    setStatement(stmt);
    if (stmt) {
      setIncomeTaxManual(stmt.income_tax);
      setOvertimePay(stmt.overtime_pay);
      setOtherAllowance(stmt.other_allowance);
      setManualIncomeTax(stmt.income_tax);
      setManualLocalTax(stmt.local_income_tax);
      setManualInsurance(
        stmt.national_pension +
          stmt.health_insurance +
          stmt.long_term_care +
          stmt.employment_insurance,
      );
    }
  }, []);

  const fetchAllStatements = useCallback(async (ym: string) => {
    const res = await fetch(`/api/staff/salary?yearMonth=${ym}`);
    const json = await res.json();
    if (res.ok) {
      setAllStatements(json.statements || []);
      applySchemaWarning(json.schemaWarning);
    }
  }, []);

  const load = useCallback(async () => {
    if (!selectedStaffId) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchFinancial(selectedStaffId),
        fetchStatement(selectedStaffId, yearMonth),
        fetchAllStatements(yearMonth),
      ]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "불러오기 실패", "Failed to load", "Không tải được", "読み込みに失敗しました", "加载失败", "載入失敗", "No se pudo cargar", "Falha ao carregar", "Échec du chargement", "Laden fehlgeschlagen", "Не удалось загрузить"), "Failed to load", "Không tải được", "読み込みに失敗しました", "加载失败", "載入失敗", "No se pudo cargar", "Falha ao carregar", "Échec du chargement", "Laden fehlgeschlagen", "Не удалось загрузить"), "Failed to load", "Không tải được", "読み込みに失敗しました", "加载失败", "載入失敗", "No se pudo cargar", "Falha ao carregar", "Échec du chargement", "Laden fehlgeschlagen", "Не удалось загрузить"), "Failed to load", "Không tải được", "読み込みに失敗しました", "加载失败", "載入失敗", "No se pudo cargar", "Falha ao carregar", "Échec du chargement", "Laden fehlgeschlagen", "Не удалось загрузить"));
    } finally {
      setLoading(false);
    }
  }, [selectedStaffId, yearMonth, fetchFinancial, fetchStatement, fetchAllStatements]);

  useEffect(() => {
    if (tenantId && canManageStaff) void fetchStaff();
  }, [tenantId, canManageStaff, fetchStaff]);

  useEffect(() => {
    if (selectedStaffId && canManageStaff) void load();
  }, [selectedStaffId, yearMonth, canManageStaff, load]);

  const saveFinancial = async () => {
    if (!selectedStaffId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/staff/financials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          syncFinancialFromAnnual({ ...financial, staff_id: selectedStaffId }),
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setFinancial(json.financial);
      if (json.schemaWarning) {
        toast.warning(json.schemaWarning);
      } else {
        toast.success(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "계약 정보가 저장되었습니다.", "Your contract information has been saved.", "Thông tin hợp đồng của bạn đã được lưu.", "契約情報が保存されました。", "您的合同信息已保存。", "您的合約資訊已儲存。", "La información de su contrato ha sido guardada.", "As informações do seu contrato foram salvas.", "Les informations de votre contrat ont été enregistrées.", "Ihre Vertragsinformationen wurden gespeichert.", "Информация о вашем контракте сохранена."), "Your contract information has been saved.", "Thông tin hợp đồng của bạn đã được lưu.", "契約情報が保存されました。", "您的合同信息已保存。", "您的合約資訊已儲存。", "La información de su contrato ha sido guardada.", "As informações do seu contrato foram salvas.", "Les informations de votre contrat ont été enregistrées.", "Ihre Vertragsinformationen wurden gespeichert.", "Информация о вашем контракте сохранена."), "Your contract information has been saved.", "Thông tin hợp đồng của bạn đã được lưu.", "契約情報が保存されました。", "您的合同信息已保存。", "您的合約資訊已儲存。", "La información de su contrato ha sido guardada.", "As informações do seu contrato foram salvas.", "Les informations de votre contrat ont été enregistrées.", "Ihre Vertragsinformationen wurden gespeichert.", "Информация о вашем контракте сохранена."), "Your contract information has been saved.", "Thông tin hợp đồng của bạn đã được lưu.", "契約情報が保存されました。", "您的合同信息已保存。", "您的合約資訊已儲存。", "La información de su contrato ha sido guardada.", "As informações do seu contrato foram salvas.", "Les informations de votre contrat ont été enregistrées.", "Ihre Vertragsinformationen wurden gespeichert.", "Информация о вашем контракте сохранена."));
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "저장 실패", "save failed", "lưu không thành công", "保存失敗", "保存失败", "保存失敗", "guardar falló", "falha ao salvar", "échec de la sauvegarde", "Speichern fehlgeschlagen", "сохранить не удалось"), "save failed", "lưu không thành công", "保存失敗", "保存失败", "保存失敗", "guardar falló", "falha ao salvar", "échec de la sauvegarde", "Speichern fehlgeschlagen", "сохранить не удалось"), "save failed", "lưu không thành công", "保存失敗", "保存失败", "保存失敗", "guardar falló", "falha ao salvar", "échec de la sauvegarde", "Speichern fehlgeschlagen", "сохранить не удалось"), "save failed", "lưu không thành công", "保存失敗", "保存失败", "保存失敗", "guardar falló", "falha ao salvar", "échec de la sauvegarde", "Speichern fehlgeschlagen", "сохранить не удалось"));
    } finally {
      setSaving(false);
    }
  };

  const calculateAndSave = async (opts?: { saveOnly?: boolean; applyAuto?: boolean }) => {
    if (!selectedStaffId) return;
    const saveOnly = opts?.saveOnly ?? false;
    const applyAuto = opts?.applyAuto ?? !saveOnly;
    setCalculating(true);
    try {
      const res = await fetch("/api/staff/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedStaffId,
          yearMonth,
          recalculate: !saveOnly,
          applyAutoAdjustments: applyAuto,
          otherAllowance,
          ...(applyAuto
            ? {}
            : {
                overtimePay,
                incomeTaxManual,
                manualDeductions:
                  payroll.payrollMode === "manual" ? manualDeductions : undefined,
                manualIncomeTax:
                  payroll.payrollMode === "manual" ? manualIncomeTax : undefined,
                manualLocalTax:
                  payroll.payrollMode === "manual" ? manualLocalTax : undefined,
                manualInsurance:
                  payroll.payrollMode === "manual" ? manualInsurance : undefined,
              }),
          save: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const stmt = json.statement as StatementRow;
      setStatement(stmt);
      setOvertimePay(stmt.overtime_pay);
      setIncomeTaxManual(stmt.income_tax);
      setManualIncomeTax(stmt.income_tax);
      setManualLocalTax(stmt.local_income_tax);
      toast.success(
        saveOnly
          ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "저장되었습니다.", "Saved.", "Đã lưu.", "保存されました。", "已保存。", "已儲存。", "Guardado.", "Salvo.", "Sauvé.", "Gespeichert.", "Сохранено."), "Saved.", "Đã lưu.", "保存されました。", "已保存。", "已儲存。", "Guardado.", "Salvo.", "Sauvé.", "Gespeichert.", "Сохранено."), "Saved.", "Đã lưu.", "保存されました。", "已保存。", "已儲存。", "Guardado.", "Salvo.", "Sauvé.", "Gespeichert.", "Сохранено."), "Saved.", "Đã lưu.", "保存されました。", "已保存。", "已儲存。", "Guardado.", "Salvo.", "Sauvé.", "Gespeichert.", "Сохранено.")
          : applyAuto
            ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "근태·간이세액 기준으로 재계산했습니다.", "It was recalculated based on attendance and simplified tax amount.", "Nó được tính toán lại dựa trên số tiền thuế tham dự và đơn giản hóa.", "勤態・簡易税額基準で再計算しました。", "根据出勤率和简化税额重新计算。", "根據出席率和簡化稅額重新計算。", "Se recalculó en base a la asistencia y al monto del impuesto simplificado.", "Foi recalculado com base no atendimento e no valor do imposto simplificado.", "Il a été recalculé en fonction de la fréquentation et du montant de l'impôt simplifié.", "Es wurde auf der Grundlage der Anwesenheit und des vereinfachten Steuerbetrags neu berechnet.", "Перерасчет произведен с учетом посещаемости и суммы упрощенного налога."), "It was recalculated based on attendance and simplified tax amount.", "Nó được tính toán lại dựa trên số tiền thuế tham dự và đơn giản hóa.", "勤態・簡易税額基準で再計算しました。", "根据出勤率和简化税额重新计算。", "根據出席率和簡化稅額重新計算。", "Se recalculó en base a la asistencia y al monto del impuesto simplificado.", "Foi recalculado com base no atendimento e no valor do imposto simplificado.", "Il a été recalculé en fonction de la fréquentation et du montant de l'impôt simplifié.", "Es wurde auf der Grundlage der Anwesenheit und des vereinfachten Steuerbetrags neu berechnet.", "Перерасчет произведен с учетом посещаемости и суммы упрощенного налога."), "It was recalculated based on attendance and simplified tax amount.", "Nó được tính toán lại dựa trên số tiền thuế tham dự và đơn giản hóa.", "勤態・簡易税額基準で再計算しました。", "根据出勤率和简化税额重新计算。", "根據出席率和簡化稅額重新計算。", "Se recalculó en base a la asistencia y al monto del impuesto simplificado.", "Foi recalculado com base no atendimento e no valor do imposto simplificado.", "Il a été recalculé en fonction de la fréquentation et du montant de l'impôt simplifié.", "Es wurde auf der Grundlage der Anwesenheit und des vereinfachten Steuerbetrags neu berechnet.", "Перерасчет произведен с учетом посещаемости и суммы упрощенного налога."), "It was recalculated based on attendance and simplified tax amount.", "Nó được tính toán lại dựa trên số tiền thuế tham dự và đơn giản hóa.", "勤態・簡易税額基準で再計算しました。", "根据出勤率和简化税额重新计算。", "根據出席率和簡化稅額重新計算。", "Se recalculó en base a la asistencia y al monto del impuesto simplificado.", "Foi recalculado com base no atendimento e no valor do imposto simplificado.", "Il a été recalculé en fonction de la fréquentation et du montant de l'impôt simplifié.", "Es wurde auf der Grundlage der Anwesenheit und des vereinfachten Steuerbetrags neu berechnet.", "Перерасчет произведен с учетом посещаемости и суммы упрощенного налога.")
            : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "조정값이 반영되었습니다.", "Adjustments have been reflected.", "Những điều chỉnh đã được phản ánh.", "調整値が反映されました。", "调整已得到反映。", "調整已反映出來。", "Los ajustes se han reflejado.", "Os ajustes foram refletidos.", "Des ajustements ont été pris en compte.", "Anpassungen wurden berücksichtigt.", "Изменения были отражены."), "Adjustments have been reflected.", "Những điều chỉnh đã được phản ánh.", "調整値が反映されました。", "调整已得到反映。", "調整已反映出來。", "Los ajustes se han reflejado.", "Os ajustes foram refletidos.", "Des ajustements ont été pris en compte.", "Anpassungen wurden berücksichtigt.", "Изменения были отражены."), "Adjustments have been reflected.", "Những điều chỉnh đã được phản ánh.", "調整値が反映されました。", "调整已得到反映。", "調整已反映出來。", "Los ajustes se han reflejado.", "Os ajustes foram refletidos.", "Des ajustements ont été pris en compte.", "Anpassungen wurden berücksichtigt.", "Изменения были отражены."), "Adjustments have been reflected.", "Những điều chỉnh đã được phản ánh.", "調整値が反映されました。", "调整已得到反映。", "調整已反映出來。", "Los ajustes se han reflejado.", "Os ajustes foram refletidos.", "Des ajustements ont été pris en compte.", "Anpassungen wurden berücksichtigt.", "Изменения были отражены."),
      );
      void fetchAllStatements(yearMonth);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "계산 실패", "calculation failed", "tính toán thất bại", "計算失敗", "计算失败", "計算失敗", "cálculo fallido", "cálculo falhou", "échec du calcul", "Berechnung fehlgeschlagen", "расчет не удался"), "calculation failed", "tính toán thất bại", "計算失敗", "计算失败", "計算失敗", "cálculo fallido", "cálculo falhou", "échec du calcul", "Berechnung fehlgeschlagen", "расчет не удался"), "calculation failed", "tính toán thất bại", "計算失敗", "计算失败", "計算失敗", "cálculo fallido", "cálculo falhou", "échec du calcul", "Berechnung fehlgeschlagen", "расчет не удался"), "calculation failed", "tính toán thất bại", "計算失敗", "计算失败", "計算失敗", "cálculo fallido", "cálculo falhou", "échec du calcul", "Berechnung fehlgeschlagen", "расчет не удался"));
    } finally {
      setCalculating(false);
    }
  };

  const sendEmail = async () => {
    if (!statement?.id) return;
    setEmailSending(true);
    try {
      const res = await fetch(`/api/staff/salary/${statement.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTo || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`${json.emailedTo}(으)로 명세서를 발송했습니다.`);
      setEmailOpen(false);
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "이메일 발송 실패", "Failed to send email", "Không gửi được email", "電子メールの送信に失敗しました", "发送电子邮件失败", "發送電子郵件失敗", "No se pudo enviar el correo electrónico", "Falha ao enviar e-mail", "Échec de l'envoi de l'e-mail", "E-Mail konnte nicht gesendet werden", "Не удалось отправить электронное письмо"), "Failed to send email", "Không gửi được email", "電子メールの送信に失敗しました", "发送电子邮件失败", "發送電子郵件失敗", "No se pudo enviar el correo electrónico", "Falha ao enviar e-mail", "Échec de l'envoi de l'e-mail", "E-Mail konnte nicht gesendet werden", "Не удалось отправить электронное письмо"), "Failed to send email", "Không gửi được email", "電子メールの送信に失敗しました", "发送电子邮件失败", "發送電子郵件失敗", "No se pudo enviar el correo electrónico", "Falha ao enviar e-mail", "Échec de l'envoi de l'e-mail", "E-Mail konnte nicht gesendet werden", "Не удалось отправить электронное письмо"), "Failed to send email", "Không gửi được email", "電子メールの送信に失敗しました", "发送电子邮件失败", "發送電子郵件失敗", "No se pudo enviar el correo electrónico", "Falha ao enviar e-mail", "Échec de l'envoi de l'e-mail", "E-Mail konnte nicht gesendet werden", "Не удалось отправить электронное письмо"));
    } finally {
      setEmailSending(false);
    }
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  if (authLoading) return <div className="p-8 text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "불러오는 중...", "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка...")}</div>;
  if (!canManageStaff) {
    return <div className="p-8 text-slate-600">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "접근 권한이 없습니다.", "You do not have access permission.", "Bạn không có quyền truy cập.", "アクセス権がありません。", "您没有访问权限。", "您沒有存取權限。", "No tienes permiso de acceso.", "Você não tem permissão de acesso.", "Vous n'avez pas d'autorisation d'accès.", "Sie haben keine Zugriffsberechtigung.", "У вас нет разрешения на доступ."), "You do not have access permission.", "Bạn không có quyền truy cập.", "アクセス権がありません。", "您没有访问权限。", "您沒有存取權限。", "No tienes permiso de acceso.", "Você não tem permissão de acesso.", "Vous n'avez pas d'autorisation d'accès.", "Sie haben keine Zugriffsberechtigung.", "У вас нет разрешения на доступ."), "You do not have access permission.", "Bạn không có quyền truy cập.", "アクセス権がありません。", "您没有访问权限。", "您沒有存取權限。", "No tienes permiso de acceso.", "Você não tem permissão de acesso.", "Vous n'avez pas d'autorisation d'accès.", "Sie haben keine Zugriffsberechtigung.", "У вас нет разрешения на доступ."), "You do not have access permission.", "Bạn không có quyền truy cập.", "アクセス権がありません。", "您没有访问权限。", "您沒有存取權限。", "No tienes permiso de acceso.", "Você não tem permissão de acesso.", "Vous n'avez pas d'autorisation d'accès.", "Sie haben keine Zugriffsberechtigung.", "У вас нет разрешения на доступ.")}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여 정산", "salary settlement", "quyết toán lương", "給与決済", "工资结算", "薪資結算", "liquidación de salario", "liquidação salarial", "règlement salarial", "Gehaltsabrechnung", "расчет заработной платы"), "salary settlement", "quyết toán lương", "給与決済", "工资结算", "薪資結算", "liquidación de salario", "liquidação salarial", "règlement salarial", "Gehaltsabrechnung", "расчет заработной платы"), "salary settlement", "quyết toán lương", "給与決済", "工资结算", "薪資結算", "liquidación de salario", "liquidação salarial", "règlement salarial", "Gehaltsabrechnung", "расчет заработной платы"), "salary settlement", "quyết toán lương", "給与決済", "工资结算", "薪資結算", "liquidación de salario", "liquidação salarial", "règlement salarial", "Gehaltsabrechnung", "расчет заработной платы")}</h1>
        <p className="text-sm text-slate-500 mt-1">
         {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "정직원·파트타임·프리랜서별 4대보험·주휴수당·명세서 발송", "Sending 4 major insurance policies, weekly holiday allowances, and statements for full-time employees, part-time employees, and freelancers", "Gửi 4 chính sách bảo hiểm lớn, trợ cấp nghỉ lễ hàng tuần và sao kê cho nhân viên toàn thời gian, nhân viên bán thời gian và cộng tác viên", "正社員・パートタイム・フリーランサー別4大保険・週休手当・明細書発送", "发送全职员工、兼职员工和自由职业者的4大保险单、每周假期津贴和报表", "寄送全職員工、兼職員工和自由工作者的4大保險單、每週假期津貼和報表", "Envío de 4 pólizas de seguro importantes, asignaciones de vacaciones semanales y extractos para empleados de tiempo completo, empleados de tiempo parcial y autónomos.", "Envio de 4 apólices de seguro principais, subsídios de férias semanais e extratos para funcionários em tempo integral, funcionários de meio período e freelancers", "Envoi de 4 polices d'assurance majeures, indemnités de congés hebdomadaires et relevés pour les salariés à temps plein, les salariés à temps partiel et les indépendants", "Versenden von 4 wichtigen Versicherungspolicen, wöchentlichem Urlaubsgeld und Abrechnungen für Vollzeitbeschäftigte, Teilzeitbeschäftigte und Freiberufler", "Отправка 4 основных страховых полисов, еженедельных отпускных и отчетов для сотрудников, работающих полный рабочий день, сотрудников, работающих неполный рабочий день, и фрилансеров."), "Sending 4 major insurance policies, weekly holiday allowances, and statements for full-time employees, part-time employees, and freelancers", "Gửi 4 chính sách bảo hiểm lớn, trợ cấp nghỉ lễ hàng tuần và sao kê cho nhân viên toàn thời gian, nhân viên bán thời gian và cộng tác viên", "正社員・パートタイム・フリーランサー別4大保険・週休手当・明細書発送", "发送全职员工、兼职员工和自由职业者的4大保险单、每周假期津贴和报表", "寄送全職員工、兼職員工和自由工作者的4大保險單、每週假期津貼和報表", "Envío de 4 pólizas de seguro importantes, asignaciones de vacaciones semanales y extractos para empleados de tiempo completo, empleados de tiempo parcial y autónomos.", "Envio de 4 apólices de seguro principais, subsídios de férias semanais e extratos para funcionários em tempo integral, funcionários de meio período e freelancers", "Envoi de 4 polices d'assurance majeures, indemnités de congés hebdomadaires et relevés pour les salariés à temps plein, les salariés à temps partiel et les indépendants", "Versenden von 4 wichtigen Versicherungspolicen, wöchentlichem Urlaubsgeld und Abrechnungen für Vollzeitbeschäftigte, Teilzeitbeschäftigte und Freiberufler", "Отправка 4 основных страховых полисов, еженедельных отпускных и отчетов для сотрудников, работающих полный рабочий день, сотрудников, работающих неполный рабочий день, и фрилансеров."), "Sending 4 major insurance policies, weekly holiday allowances, and statements for full-time employees, part-time employees, and freelancers", "Gửi 4 chính sách bảo hiểm lớn, trợ cấp nghỉ lễ hàng tuần và sao kê cho nhân viên toàn thời gian, nhân viên bán thời gian và cộng tác viên", "正社員・パートタイム・フリーランサー別4大保険・週休手当・明細書発送", "发送全职员工、兼职员工和自由职业者的4大保险单、每周假期津贴和报表", "寄送全職員工、兼職員工和自由工作者的4大保險單、每週假期津貼和報表", "Envío de 4 pólizas de seguro importantes, asignaciones de vacaciones semanales y extractos para empleados de tiempo completo, empleados de tiempo parcial y autónomos.", "Envio de 4 apólices de seguro principais, subsídios de férias semanais e extratos para funcionários em tempo integral, funcionários de meio período e freelancers", "Envoi de 4 polices d'assurance majeures, indemnités de congés hebdomadaires et relevés pour les salariés à temps plein, les salariés à temps partiel et les indépendants", "Versenden von 4 wichtigen Versicherungspolicen, wöchentlichem Urlaubsgeld und Abrechnungen für Vollzeitbeschäftigte, Teilzeitbeschäftigte und Freiberufler", "Отправка 4 основных страховых полисов, еженедельных отпускных и отчетов для сотрудников, работающих полный рабочий день, сотрудников, работающих неполный рабочий день, и фрилансеров."), "Sending 4 major insurance policies, weekly holiday allowances, and statements for full-time employees, part-time employees, and freelancers", "Gửi 4 chính sách bảo hiểm lớn, trợ cấp nghỉ lễ hàng tuần và sao kê cho nhân viên toàn thời gian, nhân viên bán thời gian và cộng tác viên", "正社員・パートタイム・フリーランサー別4大保険・週休手当・明細書発送", "发送全职员工、兼职员工和自由职业者的4大保险单、每周假期津贴和报表", "寄送全職員工、兼職員工和自由工作者的4大保險單、每週假期津貼和報表", "Envío de 4 pólizas de seguro importantes, asignaciones de vacaciones semanales y extractos para empleados de tiempo completo, empleados de tiempo parcial y autónomos.", "Envio de 4 apólices de seguro principais, subsídios de férias semanais e extratos para funcionários em tempo integral, funcionários de meio período e freelancers", "Envoi de 4 polices d'assurance majeures, indemnités de congés hebdomadaires et relevés pour les salariés à temps plein, les salariés à temps partiel et les indépendants", "Versenden von 4 wichtigen Versicherungspolicen, wöchentlichem Urlaubsgeld und Abrechnungen für Vollzeitbeschäftigte, Teilzeitbeschäftigte und Freiberufler", "Отправка 4 основных страховых полисов, еженедельных отпускных и отчетов для сотрудников, работающих полный рабочий день, сотрудников, работающих неполный рабочий день, и фрилансеров.")}송
        </p>
      </div>

      <div className="p-4 md:p-6 space-y-4 flex-1 overflow-auto">
        <StaffSubNav />
        <PayrollSettingsCard />

        {schemaWarning && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "DB 마이그레이션 필요:", "DB migration required:", "Yêu cầu di chuyển DB:", "DB移行が必要：", "需要数据库迁移：", "需要資料庫遷移：", "Se requiere migración de base de datos:", "Migração de banco de dados necessária:", "Migration de base de données requise :", "DB-Migration erforderlich:", "Требуется миграция БД:"), "DB migration required:", "Yêu cầu di chuyển DB:", "DB移行が必要：", "需要数据库迁移：", "需要資料庫遷移：", "Se requiere migración de base de datos:", "Migração de banco de dados necessária:", "Migration de base de données requise :", "DB-Migration erforderlich:", "Требуется миграция БД:"), "DB migration required:", "Yêu cầu di chuyển DB:", "DB移行が必要：", "需要数据库迁移：", "需要資料庫遷移：", "Se requiere migración de base de datos:", "Migração de banco de dados necessária:", "Migration de base de données requise :", "DB-Migration erforderlich:", "Требуется миграция БД:"), "DB migration required:", "Yêu cầu di chuyển DB:", "DB移行が必要：", "需要数据库迁移：", "需要資料庫遷移：", "Se requiere migración de base de datos:", "Migração de banco de dados necessária:", "Migration de base de données requise :", "DB-Migration erforderlich:", "Требуется миграция БД:")}</strong> {schemaWarning}
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "정산 월", "settlement month", "tháng quyết toán", "精算月", "结算月", "結算月", "mes de liquidación", "mês de liquidação", "mois de règlement", "Abrechnungsmonat", "расчетный месяц"), "settlement month", "tháng quyết toán", "精算月", "结算月", "結算月", "mes de liquidación", "mês de liquidação", "mois de règlement", "Abrechnungsmonat", "расчетный месяц"), "settlement month", "tháng quyết toán", "精算月", "结算月", "結算月", "mes de liquidación", "mês de liquidação", "mois de règlement", "Abrechnungsmonat", "расчетный месяц"), "settlement month", "tháng quyết toán", "精算月", "结算月", "結算月", "mes de liquidación", "mês de liquidação", "mois de règlement", "Abrechnungsmonat", "расчетный месяц")}</label>
            <Input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="w-40 h-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void exportStaffSalaryToExcel(allStatements, yearMonth)}
            disabled={!allStatements.length}
          >
            <FileDown className="w-4 h-4" />
           {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "엑셀보내기", "Send Excel", "Gửi Excel", "Excelを送信", "发送Excel", "發送Excel", "Enviar Excel", "Enviar Excel", "Envoyer Excel", "Excel senden", "Отправить Excel"), "Send Excel", "Gửi Excel", "Excelを送信", "发送Excel", "發送Excel", "Enviar Excel", "Enviar Excel", "Envoyer Excel", "Excel senden", "Отправить Excel"), "Send Excel", "Gửi Excel", "Excelを送信", "发送Excel", "發送Excel", "Enviar Excel", "Enviar Excel", "Envoyer Excel", "Excel senden", "Отправить Excel"), "Send Excel", "Gửi Excel", "Excelを送信", "发送Excel", "發送Excel", "Enviar Excel", "Enviar Excel", "Envoyer Excel", "Excel senden", "Отправить Excel")}기
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <Card className="xl:col-span-3 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원", "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-[480px] overflow-y-auto">
              {staffList.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStaffId(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedStaffId === s.id
                      ? "bg-indigo-100 text-indigo-900 font-semibold"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  {s.name}
                  {s.position && (
                    <span className="block text-xs text-slate-500">{s.position}</span>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="xl:col-span-9 space-y-4">
            {selectedStaff && (
              <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-indigo-500" />
                      {selectedStaff.name} — 계약·보험
                    </CardTitle>
                    <CardDescription>
                      <Link href={`/dashboard/staff/${selectedStaff.id}`} className="text-indigo-600 hover:underline text-xs">
                       {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "인사 상세 보기 →", "View personnel details →", "Xem chi tiết nhân sự →", "人事詳細を見る→", "查看人员详情→", "查看人員詳情→", "Ver detalles del personal →", "Ver detalhes do pessoal →", "Voir les détails du personnel →", "Personaldetails anzeigen →", "Посмотреть информацию о персонале →"), "View personnel details →", "Xem chi tiết nhân sự →", "人事詳細を見る→", "查看人员详情→", "查看人員詳情→", "Ver detalles del personal →", "Ver detalhes do pessoal →", "Voir les détails du personnel →", "Personaldetails anzeigen →", "Посмотреть информацию о персонале →"), "View personnel details →", "Xem chi tiết nhân sự →", "人事詳細を見る→", "查看人员详情→", "查看人員詳情→", "Ver detalles del personal →", "Ver detalhes do pessoal →", "Voir les détails du personnel →", "Personaldetails anzeigen →", "Посмотреть информацию о персонале →"), "View personnel details →", "Xem chi tiết nhân sự →", "人事詳細を見る→", "查看人员详情→", "查看人員詳情→", "Ver detalles del personal →", "Ver detalhes do pessoal →", "Voir les détails du personnel →", "Personaldetails anzeigen →", "Посмотреть информацию о персонале →")}→
                      </Link>
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => void saveFinancial()} disabled={saving}>
                    <Save className="w-4 h-4 mr-1" />
                    {saving ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "저장 중...", "Saving...", "Đang lưu...", "保存中...", "保存...", "儲存...", "Ahorro...", "Salvando...", "Économie...", "Sparen...", "Сохранение..."), "Saving...", "Đang lưu...", "保存中...", "保存...", "儲存...", "Ahorro...", "Salvando...", "Économie...", "Sparen...", "Сохранение..."), "Saving...", "Đang lưu...", "保存中...", "保存...", "儲存...", "Ahorro...", "Salvando...", "Économie...", "Sparen...", "Сохранение..."), "Saving...", "Đang lưu...", "保存中...", "保存...", "儲存...", "Ahorro...", "Salvando...", "Économie...", "Sparen...", "Сохранение...") : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "계약 저장", "save contract", "lưu hợp đồng", "契約を保存", "保存合同", "保存合約", "guardar contrato", "salvar contrato", "sauvegarder le contrat", "Vertrag speichern", "сохранить контракт"), "save contract", "lưu hợp đồng", "契約を保存", "保存合同", "保存合約", "guardar contrato", "salvar contrato", "sauvegarder le contrat", "Vertrag speichern", "сохранить контракт"), "save contract", "lưu hợp đồng", "契約を保存", "保存合同", "保存合約", "guardar contrato", "salvar contrato", "sauvegarder le contrat", "Vertrag speichern", "сохранить контракт"), "save contract", "lưu hợp đồng", "契約を保存", "保存合同", "保存合約", "guardar contrato", "salvar contrato", "sauvegarder le contrat", "Vertrag speichern", "сохранить контракт")}
                  </Button>
                </CardHeader>
                <CardContent>
                  <StaffFinancialForm value={financial} onChange={setFinancial} payroll={payroll} />
                </CardContent>
              </Card>
            )}

            <StaffSeveranceCard staffId={selectedStaffId} />

            <Card className="border-slate-200">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  {yearMonth} 급여 명세
                  {statement?.status && (
                    <Badge variant="outline" className="ml-2">
                      {statement.status === "sent" ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "발송완료", "Delivery completed", "Đã giao hàng xong", "発送完了", "发货完成", "出貨完成", "Entrega completada", "Entrega concluída", "Livraison terminée", "Lieferung abgeschlossen", "Доставка завершена"), "Delivery completed", "Đã giao hàng xong", "発送完了", "发货完成", "出貨完成", "Entrega completada", "Entrega concluída", "Livraison terminée", "Lieferung abgeschlossen", "Доставка завершена"), "Delivery completed", "Đã giao hàng xong", "発送完了", "发货完成", "出貨完成", "Entrega completada", "Entrega concluída", "Livraison terminée", "Lieferung abgeschlossen", "Доставка завершена"), "Delivery completed", "Đã giao hàng xong", "発送完了", "发货完成", "出貨完成", "Entrega completada", "Entrega concluída", "Livraison terminée", "Lieferung abgeschlossen", "Доставка завершена") : statement.status === "confirmed" ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "확정", "confirmed", "xác nhận", "確定", "确认的", "確認的", "confirmado", "confirmado", "confirmé", "bestätigt", "подтвержденный"), "confirmed", "xác nhận", "確定", "确认的", "確認的", "confirmado", "confirmado", "confirmé", "bestätigt", "подтвержденный"), "confirmed", "xác nhận", "確定", "确认的", "確認的", "confirmado", "confirmado", "confirmé", "bestätigt", "подтвержденный"), "confirmed", "xác nhận", "確定", "确认的", "確認的", "confirmado", "confirmado", "confirmé", "bestätigt", "подтвержденный") : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "초안", "draft", "bản nháp", "ドラフト", "草稿", "草稿", "borrador", "rascunho", "brouillon", "Entwurf", "черновик"), "draft", "bản nháp", "ドラフト", "草稿", "草稿", "borrador", "rascunho", "brouillon", "Entwurf", "черновик"), "draft", "bản nháp", "ドラフト", "草稿", "草稿", "borrador", "rascunho", "brouillon", "Entwurf", "черновик"), "draft", "bản nháp", "ドラフト", "草稿", "草稿", "borrador", "rascunho", "brouillon", "Entwurf", "черновик")}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void calculateAndSave({ applyAuto: true })}
                    disabled={calculating || loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${calculating ? "animate-spin" : ""}`} />
                   {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "재계산", "recalculation", "tính toán lại", "再計算", "重新计算", "重新計算", "recálculo", "recálculo", "recalcul", "Neuberechnung", "перерасчет"), "recalculation", "tính toán lại", "再計算", "重新计算", "重新計算", "recálculo", "recálculo", "recalcul", "Neuberechnung", "перерасчет"), "recalculation", "tính toán lại", "再計算", "重新计算", "重新計算", "recálculo", "recálculo", "recalcul", "Neuberechnung", "перерасчет"), "recalculation", "tính toán lại", "再計算", "重新计算", "重新計算", "recálculo", "recálculo", "recalcul", "Neuberechnung", "перерасчет")}산
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void calculateAndSave({ applyAuto: false })}
                    disabled={calculating || loading}
                  >
                   {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "조정 반영", "adjustment reflection", "phản ánh điều chỉnh", "調整反映", "调整反射", "調整反射", "reflexión de ajuste", "reflexão de ajuste", "réflexion d'ajustement", "Anpassungsreflexion", "отражение корректировки"), "adjustment reflection", "phản ánh điều chỉnh", "調整反映", "调整反射", "調整反射", "reflexión de ajuste", "reflexão de ajuste", "réflexion d'ajustement", "Anpassungsreflexion", "отражение корректировки"), "adjustment reflection", "phản ánh điều chỉnh", "調整反映", "调整反射", "調整反射", "reflexión de ajuste", "reflexão de ajuste", "réflexion d'ajustement", "Anpassungsreflexion", "отражение корректировки"), "adjustment reflection", "phản ánh điều chỉnh", "調整反映", "调整反射", "調整反射", "reflexión de ajuste", "reflexão de ajuste", "réflexion d'ajustement", "Anpassungsreflexion", "отражение корректировки")}영
                  </Button>
                  {statement?.id && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewOpen(true)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                       {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "명세서 미리보기", "Statement Preview", "Xem trước tuyên bố", "明細プレビュー", "声明预览", "聲明預覽", "Vista previa de la declaración", "Visualização do extrato", "Aperçu du relevé", "Statement-Vorschau", "Предварительный просмотр заявления"), "Statement Preview", "Xem trước tuyên bố", "明細プレビュー", "声明预览", "聲明預覽", "Vista previa de la declaración", "Visualização do extrato", "Aperçu du relevé", "Statement-Vorschau", "Предварительный просмотр заявления"), "Statement Preview", "Xem trước tuyên bố", "明細プレビュー", "声明预览", "聲明預覽", "Vista previa de la declaración", "Visualização do extrato", "Aperçu du relevé", "Statement-Vorschau", "Предварительный просмотр заявления"), "Statement Preview", "Xem trước tuyên bố", "明細プレビュー", "声明预览", "聲明預覽", "Vista previa de la declaración", "Visualização do extrato", "Aperçu du relevé", "Statement-Vorschau", "Предварительный просмотр заявления")}기
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(
                            `/dashboard/staff/salary/print/${statement.id}`,
                            "_blank",
                          )
                        }
                      >
                        <Printer className="w-4 h-4 mr-1" />
                       {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "인쇄 / PDF", "Print/PDF", "In/PDF", "印刷/PDF", "打印/PDF", "列印/PDF", "Imprimir/PDF", "Imprimir/PDF", "Imprimer/PDF", "Drucken/PDF", "Распечатать/PDF"), "Print/PDF", "In/PDF", "印刷/PDF", "打印/PDF", "列印/PDF", "Imprimir/PDF", "Imprimir/PDF", "Imprimer/PDF", "Drucken/PDF", "Распечатать/PDF"), "Print/PDF", "In/PDF", "印刷/PDF", "打印/PDF", "列印/PDF", "Imprimir/PDF", "Imprimir/PDF", "Imprimer/PDF", "Drucken/PDF", "Распечатать/PDF"), "Print/PDF", "In/PDF", "印刷/PDF", "打印/PDF", "列印/PDF", "Imprimir/PDF", "Imprimir/PDF", "Imprimer/PDF", "Drucken/PDF", "Распечатать/PDF")}F
                      </Button>
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => {
                          setEmailTo(selectedStaff?.email || "");
                          setEmailOpen(true);
                        }}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                       {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "이메일 발송", "Send email", "Gửi email", "メール送信", "发送电子邮件", "傳送電子郵件", "Enviar correo electrónico", "Enviar e-mail", "Envoyer un e-mail", "E-Mail senden", "Отправить письмо"), "Send email", "Gửi email", "メール送信", "发送电子邮件", "傳送電子郵件", "Enviar correo electrónico", "Enviar e-mail", "Envoyer un e-mail", "E-Mail senden", "Отправить письмо"), "Send email", "Gửi email", "メール送信", "发送电子邮件", "傳送電子郵件", "Enviar correo electrónico", "Enviar e-mail", "Envoyer un e-mail", "E-Mail senden", "Отправить письмо"), "Send email", "Gửi email", "メール送信", "发送电子邮件", "傳送電子郵件", "Enviar correo electrónico", "Enviar e-mail", "Envoyer un e-mail", "E-Mail senden", "Отправить письмо")}송
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {payroll.payrollMode === "auto" && payroll.payrollJurisdiction === "KR" && (
                  <p className="text-xs text-slate-500 rounded-lg bg-slate-50 border px-3 py-2">
                    <strong>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "재계산", "recalculation", "tính toán lại", "再計算", "重新计算", "重新計算", "recálculo", "recálculo", "recalcul", "Neuberechnung", "перерасчет"), "recalculation", "tính toán lại", "再計算", "重新计算", "重新計算", "recálculo", "recálculo", "recalcul", "Neuberechnung", "перерасчет"), "recalculation", "tính toán lại", "再計算", "重新计算", "重新計算", "recálculo", "recálculo", "recalcul", "Neuberechnung", "перерасчет"), "recalculation", "tính toán lại", "再計算", "重新计算", "重新計算", "recálculo", "recálculo", "recalcul", "Neuberechnung", "перерасчет")}</strong>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, ": 출퇴근 기준 주 40시간 초과 연장수당(시급×1.5)과 간이세액표 근사\n                    소득세를 자동 채웁니다. 금액을 바꾼 뒤에는", ": Approximate overtime allowance (hourly wage x 1.5) for over 40 hours per week based on commuting and simplified tax amount \nAuto-fill your income tax. After changing the amount", ": Khoản trợ cấp làm thêm giờ ước tính (lương theo giờ x 1,5) trong hơn 40 giờ mỗi tuần dựa trên số tiền thuế đi lại và đơn giản hóa\nTự động điền thuế thu nhập của bạn. Sau khi thay đổi số tiền", "：出退勤基準週40時間超過延長手当（時給×1.5）と簡易税額表近似\n 所得税を自動入力します。 金額を変えた後", "：每周超过 40 小时的大约加班津贴（时薪 x 1.5）基于通勤和简化税额\n自动填写您的所得税。 更改金额后", "：每週超過 40 小時的大約加班津貼（時薪 x 1.5）是基於通勤和簡化稅額\n自動填寫您的所得稅。 更改金額後", ": Asignación aproximada de horas extras (salario por hora x 1,5) para más de 40 horas por semana según los desplazamientos y el monto del impuesto simplificado\nComplete automáticamente su impuesto sobre la renta. Después de cambiar la cantidad", ": Subsídio aproximado de horas extras (salário por hora x 1,5) para mais de 40 horas por semana com base no deslocamento e no valor do imposto simplificado\nPreencha automaticamente seu imposto de renda. Depois de alterar o valor", ": Indemnité approximative d'heures supplémentaires (salaire horaire x 1,5) pour plus de 40 heures par semaine basée sur les déplacements domicile-travail et le montant de la taxe simplifiée\nRemplissez automatiquement votre impôt sur le revenu. Après avoir modifié le montant", ": Ungefähre Überstundenvergütung (Stundenlohn x 1,5) für mehr als 40 Stunden pro Woche, basierend auf Pendler und vereinfachtem Steuerbetrag\nFüllen Sie Ihre Einkommenssteuer automatisch aus. Nach Änderung des Betrags", ": Приблизительная надбавка за сверхурочную работу (почасовая оплата х 1,5) за более чем 40 часов в неделю на основе суммы поездок на работу и упрощенного налога.\nАвтоматическое заполнение подоходного налога. После изменения суммы"), ": Approximate overtime allowance (hourly wage x 1.5) for over 40 hours per week based on commuting and simplified tax amount \nAuto-fill your income tax. After changing the amount", ": Khoản trợ cấp làm thêm giờ ước tính (lương theo giờ x 1,5) trong hơn 40 giờ mỗi tuần dựa trên số tiền thuế đi lại và đơn giản hóa\nTự động điền thuế thu nhập của bạn. Sau khi thay đổi số tiền", "：出退勤基準週40時間超過延長手当（時給×1.5）と簡易税額表近似\n 所得税を自動入力します。 金額を変えた後", "：每周超过 40 小时的大约加班津贴（时薪 x 1.5）基于通勤和简化税额\n自动填写您的所得税。 更改金额后", "：每週超過 40 小時的大約加班津貼（時薪 x 1.5）是基於通勤和簡化稅額\n自動填寫您的所得稅。 更改金額後", ": Asignación aproximada de horas extras (salario por hora x 1,5) para más de 40 horas por semana según los desplazamientos y el monto del impuesto simplificado\nComplete automáticamente su impuesto sobre la renta. Después de cambiar la cantidad", ": Subsídio aproximado de horas extras (salário por hora x 1,5) para mais de 40 horas por semana com base no deslocamento e no valor do imposto simplificado\nPreencha automaticamente seu imposto de renda. Depois de alterar o valor", ": Indemnité approximative d'heures supplémentaires (salaire horaire x 1,5) pour plus de 40 heures par semaine basée sur les déplacements domicile-travail et le montant de la taxe simplifiée\nRemplissez automatiquement votre impôt sur le revenu. Après avoir modifié le montant", ": Ungefähre Überstundenvergütung (Stundenlohn x 1,5) für mehr als 40 Stunden pro Woche, basierend auf Pendler und vereinfachtem Steuerbetrag\nFüllen Sie Ihre Einkommenssteuer automatisch aus. Nach Änderung des Betrags", ": Приблизительная надбавка за сверхурочную работу (почасовая оплата х 1,5) за более чем 40 часов в неделю на основе суммы поездок на работу и упрощенного налога.\nАвтоматическое заполнение подоходного налога. После изменения суммы"), ": Approximate overtime allowance (hourly wage x 1.5) for over 40 hours per week based on commuting and simplified tax amount \nAuto-fill your income tax. After changing the amount", ": Khoản trợ cấp làm thêm giờ ước tính (lương theo giờ x 1,5) trong hơn 40 giờ mỗi tuần dựa trên số tiền thuế đi lại và đơn giản hóa\nTự động điền thuế thu nhập của bạn. Sau khi thay đổi số tiền", "：出退勤基準週40時間超過延長手当（時給×1.5）と簡易税額表近似\n 所得税を自動入力します。 金額を変えた後", "：每周超过 40 小时的大约加班津贴（时薪 x 1.5）基于通勤和简化税额\n自动填写您的所得税。 更改金额后", "：每週超過 40 小時的大約加班津貼（時薪 x 1.5）是基於通勤和簡化稅額\n自動填寫您的所得稅。 更改金額後", ": Asignación aproximada de horas extras (salario por hora x 1,5) para más de 40 horas por semana según los desplazamientos y el monto del impuesto simplificado\nComplete automáticamente su impuesto sobre la renta. Después de cambiar la cantidad", ": Subsídio aproximado de horas extras (salário por hora x 1,5) para mais de 40 horas por semana com base no deslocamento e no valor do imposto simplificado\nPreencha automaticamente seu imposto de renda. Depois de alterar o valor", ": Indemnité approximative d'heures supplémentaires (salaire horaire x 1,5) pour plus de 40 heures par semaine basée sur les déplacements domicile-travail et le montant de la taxe simplifiée\nRemplissez automatiquement votre impôt sur le revenu. Après avoir modifié le montant", ": Ungefähre Überstundenvergütung (Stundenlohn x 1,5) für mehr als 40 Stunden pro Woche, basierend auf Pendler und vereinfachtem Steuerbetrag\nFüllen Sie Ihre Einkommenssteuer automatisch aus. Nach Änderung des Betrags", ": Приблизительная надбавка за сверхурочную работу (почасовая оплата х 1,5) за более чем 40 часов в неделю на основе суммы поездок на работу и упрощенного налога.\nАвтоматическое заполнение подоходного налога. После изменения суммы"), ": Approximate overtime allowance (hourly wage x 1.5) for over 40 hours per week based on commuting and simplified tax amount \nAuto-fill your income tax. After changing the amount", ": Khoản trợ cấp làm thêm giờ ước tính (lương theo giờ x 1,5) trong hơn 40 giờ mỗi tuần dựa trên số tiền thuế đi lại và đơn giản hóa\nTự động điền thuế thu nhập của bạn. Sau khi thay đổi số tiền", "：出退勤基準週40時間超過延長手当（時給×1.5）と簡易税額表近似\n 所得税を自動入力します。 金額を変えた後", "：每周超过 40 小时的大约加班津贴（时薪 x 1.5）基于通勤和简化税额\n自动填写您的所得税。 更改金额后", "：每週超過 40 小時的大約加班津貼（時薪 x 1.5）是基於通勤和簡化稅額\n自動填寫您的所得稅。 更改金額後", ": Asignación aproximada de horas extras (salario por hora x 1,5) para más de 40 horas por semana según los desplazamientos y el monto del impuesto simplificado\nComplete automáticamente su impuesto sobre la renta. Después de cambiar la cantidad", ": Subsídio aproximado de horas extras (salário por hora x 1,5) para mais de 40 horas por semana com base no deslocamento e no valor do imposto simplificado\nPreencha automaticamente seu imposto de renda. Depois de alterar o valor", ": Indemnité approximative d'heures supplémentaires (salaire horaire x 1,5) pour plus de 40 heures par semaine basée sur les déplacements domicile-travail et le montant de la taxe simplifiée\nRemplissez automatiquement votre impôt sur le revenu. Après avoir modifié le montant", ": Ungefähre Überstundenvergütung (Stundenlohn x 1,5) für mehr als 40 Stunden pro Woche, basierend auf Pendler und vereinfachtem Steuerbetrag\nFüllen Sie Ihre Einkommenssteuer automatisch aus. Nach Änderung des Betrags", ": Приблизительная надбавка за сверхурочную работу (почасовая оплата х 1,5) за более чем 40 часов в неделю на основе суммы поездок на работу и упрощенного налога.\nАвтоматическое заполнение подоходного налога. После изменения суммы")}는 <strong>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "조정 반영", "adjustment reflection", "phản ánh điều chỉnh", "調整反映", "调整反射", "調整反射", "reflexión de ajuste", "reflexão de ajuste", "réflexion d'ajustement", "Anpassungsreflexion", "отражение корректировки"), "adjustment reflection", "phản ánh điều chỉnh", "調整反映", "调整反射", "調整反射", "reflexión de ajuste", "reflexão de ajuste", "réflexion d'ajustement", "Anpassungsreflexion", "отражение корректировки"), "adjustment reflection", "phản ánh điều chỉnh", "調整反映", "调整反射", "調整反射", "reflexión de ajuste", "reflexão de ajuste", "réflexion d'ajustement", "Anpassungsreflexion", "отражение корректировки"), "adjustment reflection", "phản ánh điều chỉnh", "調整反映", "调整反射", "調整反射", "reflexión de ajuste", "reflexão de ajuste", "réflexion d'ajustement", "Anpassungsreflexion", "отражение корректировки")}</strong>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "을 누르세요.", "Press .", "Nhấn .", "を押してください。", "按 。", "按 。", "Prensa .", "Imprensa .", "Presse .", "Drücken Sie .", "Нажимать ."), "Press .", "Nhấn .", "を押してください。", "按 。", "按 。", "Prensa .", "Imprensa .", "Presse .", "Drücken Sie .", "Нажимать ."), "Press .", "Nhấn .", "を押してください。", "按 。", "按 。", "Prensa .", "Imprensa .", "Presse .", "Drücken Sie .", "Нажимать ."), "Press .", "Nhấn .", "を押してください。", "按 。", "按 。", "Prensa .", "Imprensa .", "Presse .", "Drücken Sie .", "Нажимать .")}
                  </p>
                )}
                {statement?.memo && (
                  <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                    {statement.memo}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">
                     {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "연장·야간 수당 (주 40h 초과 자동)", "Overtime/overtime allowance (automatic for over 40h a week)", "Phụ cấp làm thêm giờ/làm thêm giờ (tự động trên 40h/tuần)", "延長・夜間手当（週40h超自動）", "加班/加班津贴（每周超过40小时自动）", "加班/加班津貼（每週超過40小時自動）", "Horas extras/asignación de horas extras (automáticas para más de 40 horas a la semana)", "Subsídio de horas extras/horas extras (automático para mais de 40h semanais)", "Heures supplémentaires/indemnité d'heures supplémentaires (automatique au-delà de 40h par semaine)", "Überstunden/Überstundenvergütung (automatisch ab 40h pro Woche)", "Надбавка за сверхурочную работу/сверхурочную работу (автоматически при работе более 40 часов в неделю)"), "Overtime/overtime allowance (automatic for over 40h a week)", "Phụ cấp làm thêm giờ/làm thêm giờ (tự động trên 40h/tuần)", "延長・夜間手当（週40h超自動）", "加班/加班津贴（每周超过40小时自动）", "加班/加班津貼（每週超過40小時自動）", "Horas extras/asignación de horas extras (automáticas para más de 40 horas a la semana)", "Subsídio de horas extras/horas extras (automático para mais de 40h semanais)", "Heures supplémentaires/indemnité d'heures supplémentaires (automatique au-delà de 40h par semaine)", "Überstunden/Überstundenvergütung (automatisch ab 40h pro Woche)", "Надбавка за сверхурочную работу/сверхурочную работу (автоматически при работе более 40 часов в неделю)"), "Overtime/overtime allowance (automatic for over 40h a week)", "Phụ cấp làm thêm giờ/làm thêm giờ (tự động trên 40h/tuần)", "延長・夜間手当（週40h超自動）", "加班/加班津贴（每周超过40小时自动）", "加班/加班津貼（每週超過40小時自動）", "Horas extras/asignación de horas extras (automáticas para más de 40 horas a la semana)", "Subsídio de horas extras/horas extras (automático para mais de 40h semanais)", "Heures supplémentaires/indemnité d'heures supplémentaires (automatique au-delà de 40h par semaine)", "Überstunden/Überstundenvergütung (automatisch ab 40h pro Woche)", "Надбавка за сверхурочную работу/сверхурочную работу (автоматически при работе более 40 часов в неделю)"), "Overtime/overtime allowance (automatic for over 40h a week)", "Phụ cấp làm thêm giờ/làm thêm giờ (tự động trên 40h/tuần)", "延長・夜間手当（週40h超自動）", "加班/加班津贴（每周超过40小时自动）", "加班/加班津貼（每週超過40小時自動）", "Horas extras/asignación de horas extras (automáticas para más de 40 horas a la semana)", "Subsídio de horas extras/horas extras (automático para mais de 40h semanais)", "Heures supplémentaires/indemnité d'heures supplémentaires (automatique au-delà de 40h par semaine)", "Überstunden/Überstundenvergütung (automatisch ab 40h pro Woche)", "Надбавка за сверхурочную работу/сверхурочную работу (автоматически при работе более 40 часов в неделю)")})
                    </label>
                    <Input
                      type="number"
                      value={overtimePay || ""}
                      onChange={(e) => setOvertimePay(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "기타 수당", "Other allowances", "Các khoản phụ cấp khác", "その他の手当", "其他津贴", "其他津貼", "Otras asignaciones", "Outros subsídios", "Autres allocations", "Sonstige Zulagen", "Другие надбавки"), "Other allowances", "Các khoản phụ cấp khác", "その他の手当", "其他津贴", "其他津貼", "Otras asignaciones", "Outros subsídios", "Autres allocations", "Sonstige Zulagen", "Другие надбавки"), "Other allowances", "Các khoản phụ cấp khác", "その他の手当", "其他津贴", "其他津貼", "Otras asignaciones", "Outros subsídios", "Autres allocations", "Sonstige Zulagen", "Другие надбавки"), "Other allowances", "Các khoản phụ cấp khác", "その他の手当", "其他津贴", "其他津貼", "Otras asignaciones", "Outros subsídios", "Autres allocations", "Sonstige Zulagen", "Другие надбавки")}</label>
                    <Input
                      type="number"
                      value={otherAllowance || ""}
                      onChange={(e) => setOtherAllowance(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">
                      소득세 (원천징수
                      {payroll.payrollMode === "auto" ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, ", 간이세액 자동·수정 가능", ", Simple tax amount can be automatically modified", ", Số tiền thuế đơn giản có thể được sửa đổi tự động", "、簡易税額自動・修正可能", ",简单税额可自动修改", ",簡單稅額可自動修改", ", El monto del impuesto simple se puede modificar automáticamente", ", O valor do imposto simples pode ser modificado automaticamente", ", Le montant de la taxe simple peut être automatiquement modifié", ", Der einfache Steuerbetrag kann automatisch geändert werden", ", Сумма простого налога может быть автоматически изменена"), ", Simple tax amount can be automatically modified", ", Số tiền thuế đơn giản có thể được sửa đổi tự động", "、簡易税額自動・修正可能", ",简单税额可自动修改", ",簡單稅額可自動修改", ", El monto del impuesto simple se puede modificar automáticamente", ", O valor do imposto simples pode ser modificado automaticamente", ", Le montant de la taxe simple peut être automatiquement modifié", ", Der einfache Steuerbetrag kann automatisch geändert werden", ", Сумма простого налога может быть автоматически изменена"), ", Simple tax amount can be automatically modified", ", Số tiền thuế đơn giản có thể được sửa đổi tự động", "、簡易税額自動・修正可能", ",简单税额可自动修改", ",簡單稅額可自動修改", ", El monto del impuesto simple se puede modificar automáticamente", ", O valor do imposto simples pode ser modificado automaticamente", ", Le montant de la taxe simple peut être automatiquement modifié", ", Der einfache Steuerbetrag kann automatisch geändert werden", ", Сумма простого налога может быть автоматически изменена"), ", Simple tax amount can be automatically modified", ", Số tiền thuế đơn giản có thể được sửa đổi tự động", "、簡易税額自動・修正可能", ",简单税额可自动修改", ",簡單稅額可自動修改", ", El monto del impuesto simple se puede modificar automáticamente", ", O valor do imposto simples pode ser modificado automaticamente", ", Le montant de la taxe simple peut être automatiquement modifié", ", Der einfache Steuerbetrag kann automatisch geändert werden", ", Сумма простого налога может быть автоматически изменена") : ""})
                    </label>
                    <Input
                      type="number"
                      value={
                        (payroll.payrollMode === "manual"
                          ? manualIncomeTax
                          : incomeTaxManual) || ""
                      }
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (payroll.payrollMode === "manual") setManualIncomeTax(v);
                        else setIncomeTaxManual(v);
                      }}
                    />
                  </div>
                  {payroll.payrollMode === "manual" ? (
                    <>
                      <div>
                        <label className="text-xs text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "지방소득세 (원천징수, 소득세의 10%)", "Local income tax (withholding tax, 10% of income tax)", "Thuế thu nhập địa phương (thuế khấu trừ, 10% thuế thu nhập)", "地方所得税（源泉徴収、所得税の10％）", "地方所得税（预扣税，所得税的10%）", "地方所得稅（預扣稅，所得稅的10%）", "Impuesto local sobre la renta (retención en origen, 10% del impuesto sobre la renta)", "Imposto de renda local (imposto retido na fonte, 10% do imposto de renda)", "Impôt local sur le revenu (prélèvement à la source, 10% de l'impôt sur le revenu)", "Kommunale Einkommensteuer (Quellensteuer, 10 % der Einkommensteuer)", "Местный подоходный налог (налог у источника, 10% от подоходного налога)"), "Local income tax (withholding tax, 10% of income tax)", "Thuế thu nhập địa phương (thuế khấu trừ, 10% thuế thu nhập)", "地方所得税（源泉徴収、所得税の10％）", "地方所得税（预扣税，所得税的10%）", "地方所得稅（預扣稅，所得稅的10%）", "Impuesto local sobre la renta (retención en origen, 10% del impuesto sobre la renta)", "Imposto de renda local (imposto retido na fonte, 10% do imposto de renda)", "Impôt local sur le revenu (prélèvement à la source, 10% de l'impôt sur le revenu)", "Kommunale Einkommensteuer (Quellensteuer, 10 % der Einkommensteuer)", "Местный подоходный налог (налог у источника, 10% от подоходного налога)"), "Local income tax (withholding tax, 10% of income tax)", "Thuế thu nhập địa phương (thuế khấu trừ, 10% thuế thu nhập)", "地方所得税（源泉徴収、所得税の10％）", "地方所得税（预扣税，所得税的10%）", "地方所得稅（預扣稅，所得稅的10%）", "Impuesto local sobre la renta (retención en origen, 10% del impuesto sobre la renta)", "Imposto de renda local (imposto retido na fonte, 10% do imposto de renda)", "Impôt local sur le revenu (prélèvement à la source, 10% de l'impôt sur le revenu)", "Kommunale Einkommensteuer (Quellensteuer, 10 % der Einkommensteuer)", "Местный подоходный налог (налог у источника, 10% от подоходного налога)"), "Local income tax (withholding tax, 10% of income tax)", "Thuế thu nhập địa phương (thuế khấu trừ, 10% thuế thu nhập)", "地方所得税（源泉徴収、所得税の10％）", "地方所得税（预扣税，所得税的10%）", "地方所得稅（預扣稅，所得稅的10%）", "Impuesto local sobre la renta (retención en origen, 10% del impuesto sobre la renta)", "Imposto de renda local (imposto retido na fonte, 10% do imposto de renda)", "Impôt local sur le revenu (prélèvement à la source, 10% de l'impôt sur le revenu)", "Kommunale Einkommensteuer (Quellensteuer, 10 % der Einkommensteuer)", "Местный подоходный налог (налог у источника, 10% от подоходного налога)")}</label>
                        <Input
                          type="number"
                          value={manualLocalTax || ""}
                          onChange={(e) => setManualLocalTax(Number(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "4대보험 합계 (근로자 부담)", "Total of 4 major insurances (employee’s burden)", "Tổng cộng 4 loại bảo hiểm chính (gánh nặng của người lao động)", "4大保険合計（労働者負担）", "4大险种合计（员工负担）", "4大險種合計（員工負擔）", "Total de 4 seguros mayores (carga del empleado)", "Total de 4 grandes seguros (ônus do funcionário)", "Total de 4 assurances majeures (charge du salarié)", "Insgesamt 4 große Versicherungen (Mitarbeiterbelastung)", "Всего 4 основных страховки (бремя работника)"), "Total of 4 major insurances (employee’s burden)", "Tổng cộng 4 loại bảo hiểm chính (gánh nặng của người lao động)", "4大保険合計（労働者負担）", "4大险种合计（员工负担）", "4大險種合計（員工負擔）", "Total de 4 seguros mayores (carga del empleado)", "Total de 4 grandes seguros (ônus do funcionário)", "Total de 4 assurances majeures (charge du salarié)", "Insgesamt 4 große Versicherungen (Mitarbeiterbelastung)", "Всего 4 основных страховки (бремя работника)"), "Total of 4 major insurances (employee’s burden)", "Tổng cộng 4 loại bảo hiểm chính (gánh nặng của người lao động)", "4大保険合計（労働者負担）", "4大险种合计（员工负担）", "4大險種合計（員工負擔）", "Total de 4 seguros mayores (carga del empleado)", "Total de 4 grandes seguros (ônus do funcionário)", "Total de 4 assurances majeures (charge du salarié)", "Insgesamt 4 große Versicherungen (Mitarbeiterbelastung)", "Всего 4 основных страховки (бремя работника)"), "Total of 4 major insurances (employee’s burden)", "Tổng cộng 4 loại bảo hiểm chính (gánh nặng của người lao động)", "4大保険合計（労働者負担）", "4大险种合计（员工负担）", "4大險種合計（員工負擔）", "Total de 4 seguros mayores (carga del empleado)", "Total de 4 grandes seguros (ônus do funcionário)", "Total de 4 assurances majeures (charge du salarié)", "Insgesamt 4 große Versicherungen (Mitarbeiterbelastung)", "Всего 4 основных страховки (бремя работника)")}</label>
                        <Input
                          type="number"
                          value={manualInsurance || ""}
                          onChange={(e) => setManualInsurance(Number(e.target.value) || 0)}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 self-end pb-2">
                     {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "지방소득세는 소득세의 10%로 자동 계산됩니다.", "Local income tax is automatically calculated as 10% of income tax.", "Thuế thu nhập địa phương được tự động tính là 10% thuế thu nhập.", "地方所得税は所得税の10％として自動的に計算されます。", "地方所得税自动计算为所得税的10%。", "地方所得稅自動計算為所得稅的10%。", "El impuesto local sobre la renta se calcula automáticamente como el 10% del impuesto sobre la renta.", "O imposto de renda local é calculado automaticamente como 10% do imposto de renda.", "L'impôt local sur le revenu est automatiquement calculé à 10 % de l'impôt sur le revenu.", "Die lokale Einkommensteuer wird automatisch mit 10 % der Einkommensteuer berechnet.", "Местный подоходный налог автоматически рассчитывается как 10% от подоходного налога."), "Local income tax is automatically calculated as 10% of income tax.", "Thuế thu nhập địa phương được tự động tính là 10% thuế thu nhập.", "地方所得税は所得税の10％として自動的に計算されます。", "地方所得税自动计算为所得税的10%。", "地方所得稅自動計算為所得稅的10%。", "El impuesto local sobre la renta se calcula automáticamente como el 10% del impuesto sobre la renta.", "O imposto de renda local é calculado automaticamente como 10% do imposto de renda.", "L'impôt local sur le revenu est automatiquement calculé à 10 % de l'impôt sur le revenu.", "Die lokale Einkommensteuer wird automatisch mit 10 % der Einkommensteuer berechnet.", "Местный подоходный налог автоматически рассчитывается как 10% от подоходного налога."), "Local income tax is automatically calculated as 10% of income tax.", "Thuế thu nhập địa phương được tự động tính là 10% thuế thu nhập.", "地方所得税は所得税の10％として自動的に計算されます。", "地方所得税自动计算为所得税的10%。", "地方所得稅自動計算為所得稅的10%。", "El impuesto local sobre la renta se calcula automáticamente como el 10% del impuesto sobre la renta.", "O imposto de renda local é calculado automaticamente como 10% do imposto de renda.", "L'impôt local sur le revenu est automatiquement calculé à 10 % de l'impôt sur le revenu.", "Die lokale Einkommensteuer wird automatisch mit 10 % der Einkommensteuer berechnet.", "Местный подоходный налог автоматически рассчитывается как 10% от подоходного налога."), "Local income tax is automatically calculated as 10% of income tax.", "Thuế thu nhập địa phương được tự động tính là 10% thuế thu nhập.", "地方所得税は所得税の10％として自動的に計算されます。", "地方所得税自动计算为所得税的10%。", "地方所得稅自動計算為所得稅的10%。", "El impuesto local sobre la renta se calcula automáticamente como el 10% del impuesto sobre la renta.", "O imposto de renda local é calculado automaticamente como 10% do imposto de renda.", "L'impôt local sur le revenu est automatiquement calculé à 10 % de l'impôt sur le revenu.", "Die lokale Einkommensteuer wird automatisch mit 10 % der Einkommensteuer berechnet.", "Местный подоходный налог автоматически рассчитывается как 10% от подоходного налога.")}.
                    </p>
                  )}
                </div>

                {loading ? (
                  <p className="text-slate-500 text-sm">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "불러오는 중...", "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка...")}</p>
                ) : statement ? (
                  <StaffPayslipBreakdown statement={statement} />
                ) : (
                  <p className="text-slate-500 text-sm">
                    계약 정보 저장 후 &quot;재계산&quot;을 눌러 명세서를 생성하세요.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여명세서 이메일 발송", "Send pay stubs by email", "Gửi cuống phiếu lương qua email", "給与明細書メール送信", "通过电子邮件发送工资单", "透過電子郵件發送薪資單", "Enviar recibos de pago por correo electrónico", "Enviar recibos de pagamento por e-mail", "Envoyer les fiches de paie par email", "Versenden Sie Gehaltsabrechnungen per E-Mail", "Отправлять квитанции о заработной плате по электронной почте"), "Send pay stubs by email", "Gửi cuống phiếu lương qua email", "給与明細書メール送信", "通过电子邮件发送工资单", "透過電子郵件發送薪資單", "Enviar recibos de pago por correo electrónico", "Enviar recibos de pagamento por e-mail", "Envoyer les fiches de paie par email", "Versenden Sie Gehaltsabrechnungen per E-Mail", "Отправлять квитанции о заработной плате по электронной почте"), "Send pay stubs by email", "Gửi cuống phiếu lương qua email", "給与明細書メール送信", "通过电子邮件发送工资单", "透過電子郵件發送薪資單", "Enviar recibos de pago por correo electrónico", "Enviar recibos de pagamento por e-mail", "Envoyer les fiches de paie par email", "Versenden Sie Gehaltsabrechnungen per E-Mail", "Отправлять квитанции о заработной плате по электронной почте"), "Send pay stubs by email", "Gửi cuống phiếu lương qua email", "給与明細書メール送信", "通过电子邮件发送工资单", "透過電子郵件發送薪資單", "Enviar recibos de pago por correo electrónico", "Enviar recibos de pagamento por e-mail", "Envoyer les fiches de paie par email", "Versenden Sie Gehaltsabrechnungen per E-Mail", "Отправлять квитанции о заработной плате по электронной почте")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "수신 이메일", "incoming email", "email đến", "受信メール", "收到的电子邮件", "收到的電子郵件", "correo electrónico entrante", "e-mail recebido", "email entrant", "eingehende E-Mail", "входящее электронное письмо"), "incoming email", "email đến", "受信メール", "收到的电子邮件", "收到的電子郵件", "correo electrónico entrante", "e-mail recebido", "email entrant", "eingehende E-Mail", "входящее электронное письмо"), "incoming email", "email đến", "受信メール", "收到的电子邮件", "收到的電子郵件", "correo electrónico entrante", "e-mail recebido", "email entrant", "eingehende E-Mail", "входящее электронное письмо"), "incoming email", "email đến", "受信メール", "收到的电子邮件", "收到的電子郵件", "correo electrónico entrante", "e-mail recebido", "email entrant", "eingehende E-Mail", "входящее электронное письмо")}</label>
            <Input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="staff@example.com"
            />
            <p className="text-xs text-slate-500">
              환경설정 &gt; 이메일 SMTP가 설정되어 있어야 발송됩니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "취소", "cancellation", "hủy bỏ", "キャンセル", "消除", "消除", "cancelación", "cancelamento", "annulation", "Stornierung", "отмена"), "cancellation", "hủy bỏ", "キャンセル", "消除", "消除", "cancelación", "cancelamento", "annulation", "Stornierung", "отмена"), "cancellation", "hủy bỏ", "キャンセル", "消除", "消除", "cancelación", "cancelamento", "annulation", "Stornierung", "отмена"), "cancellation", "hủy bỏ", "キャンセル", "消除", "消除", "cancelación", "cancelamento", "annulation", "Stornierung", "отмена")}</Button>
            <Button onClick={() => void sendEmail()} disabled={emailSending || !emailTo}>
              {emailSending ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "발송 중...", "Shipping...", "Vận chuyển...", "発送中...", "船运...", "船運...", "Envío...", "Envio...", "Expédition...", "Versand...", "Перевозки..."), "Shipping...", "Vận chuyển...", "発送中...", "船运...", "船運...", "Envío...", "Envio...", "Expédition...", "Versand...", "Перевозки..."), "Shipping...", "Vận chuyển...", "発送中...", "船运...", "船運...", "Envío...", "Envio...", "Expédition...", "Versand...", "Перевозки..."), "Shipping...", "Vận chuyển...", "発送中...", "船运...", "船運...", "Envío...", "Envio...", "Expédition...", "Versand...", "Перевозки...") : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "발송", "Shipping", "vận chuyển", "発送", "船运", "船運", "Envío", "Envio", "Expédition", "Versand", "Перевозки"), "Shipping", "vận chuyển", "発送", "船运", "船運", "Envío", "Envio", "Expédition", "Versand", "Перевозки"), "Shipping", "vận chuyển", "発送", "船运", "船運", "Envío", "Envio", "Expédition", "Versand", "Перевозки"), "Shipping", "vận chuyển", "発送", "船运", "船運", "Envío", "Envio", "Expédition", "Versand", "Перевозки")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {statement?.id && (
        <PayslipPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          statementId={statement.id}
          title={`${selectedStaff?.name ?? ""} ${yearMonth} 급여명세서`}
        />
      )}
    </div>
  );
}
