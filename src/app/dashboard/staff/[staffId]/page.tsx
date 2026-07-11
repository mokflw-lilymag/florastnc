"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { StaffSubNav } from "@/app/dashboard/staff/components/staff-sub-nav";
import { StaffHrFieldsForm } from "@/app/dashboard/settings/components/StaffHrFieldsForm";
import { StaffFinancialForm } from "@/app/dashboard/staff/components/StaffFinancialForm";
import { StaffSeveranceCard } from "@/app/dashboard/staff/components/StaffSeveranceCard";
import { resolvePayrollConfig } from "@/lib/payroll/types";
import { syncFinancialFromAnnual } from "@/lib/payroll/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayslipPreviewDialog } from "@/app/dashboard/staff/components/PayslipPreviewDialog";
import { ArrowLeft, Eye, Save, Wallet, CalendarOff, Clock } from "lucide-react";
import {
  TENANT_STAFF_HR_SELECT,
  type TenantStaffHrInput,
  type TenantStaffHrProfile,
} from "@/types/tenant-staff";
import type { StaffFinancial, StaffLeaveRequest, StaffSalaryStatement } from "@/types/staff-salary";
import { formatKrw } from "@/lib/staff-salary-calc";
import { formatWorkHours, summarizeStaffWorkHours, buildDailyAttendanceRows } from "@/lib/staff-attendance-hours";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

const EMPTY_HR: TenantStaffHrInput = {
  name: "",
  phone: "",
  email: "",
  address: "",
  birth_date: "",
  hire_date: "",
  position: "",
  memo: "",
  emergency_contact: "",
  emergency_phone: "",
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

export default function StaffDetailPage() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);

  const params = useParams();
  const staffId = params.staffId as string;
  const { canManageStaff, isLoading: authLoading, tenantId } = useAuth();
  const { settings } = useSettings();
  const payroll = resolvePayrollConfig(settings ?? {});
  const [profile, setProfile] = useState<TenantStaffHrProfile | null>(null);
  const [hrForm, setHrForm] = useState<TenantStaffHrInput>(EMPTY_HR);
  const [financial, setFinancial] = useState<StaffFinancial>(EMPTY_FIN);
  const [leaves, setLeaves] = useState<StaffLeaveRequest[]>([]);
  const [statements, setStatements] = useState<StaffSalaryStatement[]>([]);
  const [monthMinutes, setMonthMinutes] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewStatementId, setPreviewStatementId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId || !staffId) return;
    const supabase = createClient();

    const { data: staff, error } = await supabase
      .from("tenant_staff")
      .select(TENANT_STAFF_HR_SELECT)
      .eq("id", staffId)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !staff) {
      toast.error(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원 정보를 찾을 수 없습니다.", "Employee information not found.", "Không tìm thấy thông tin nhân viên.", "従業員情報が見つかりません。", "未找到员工信息。", "未找到員工資料。", "No se encontró la información del empleado.", "Informações do funcionário não encontradas.", "Informations sur les employés introuvables.", "Mitarbeiterinformationen nicht gefunden.", "Информация о сотруднике не найдена."), "Employee information not found.", "Không tìm thấy thông tin nhân viên.", "従業員情報が見つかりません。", "未找到员工信息。", "未找到員工資料。", "No se encontró la información del empleado.", "Informações do funcionário não encontradas.", "Informations sur les employés introuvables.", "Mitarbeiterinformationen nicht gefunden.", "Информация о сотруднике не найдена."), "Employee information not found.", "Không tìm thấy thông tin nhân viên.", "従業員情報が見つかりません。", "未找到员工信息。", "未找到員工資料。", "No se encontró la información del empleado.", "Informações do funcionário não encontradas.", "Informations sur les employés introuvables.", "Mitarbeiterinformationen nicht gefunden.", "Информация о сотруднике не найдена."), "Employee information not found.", "Không tìm thấy thông tin nhân viên.", "従業員情報が見つかりません。", "未找到员工信息。", "未找到員工資料。", "No se encontró la información del empleado.", "Informações do funcionário não encontradas.", "Informations sur les employés introuvables.", "Mitarbeiterinformationen nicht gefunden.", "Информация о сотруднике не найдена."));
      return;
    }

    setProfile(staff);
    setHrForm({
      name: staff.name,
      phone: staff.phone || "",
      email: staff.email || "",
      address: staff.address || "",
      birth_date: staff.birth_date || "",
      hire_date: staff.hire_date || "",
      position: staff.position || "",
      memo: staff.memo || "",
      emergency_contact: staff.emergency_contact || "",
      emergency_phone: staff.emergency_phone || "",
    });

    const finRes = await fetch(`/api/staff/financials?staffId=${staffId}`);
    const finJson = await finRes.json();
    if (finRes.ok && finJson.financials?.[0]) {
      setFinancial(finJson.financials[0]);
    } else {
      setFinancial({ ...EMPTY_FIN, staff_id: staffId });
    }

    const leaveRes = await fetch(`/api/staff/leave?staffId=${staffId}`);
    const leaveJson = await leaveRes.json();
    if (leaveRes.ok) setLeaves(leaveJson.requests || []);

    const salRes = await fetch(`/api/staff/salary?staffId=${staffId}`);
    const salJson = await salRes.json();
    if (salRes.ok) setStatements(salJson.statements || []);

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const { data: logs } = await supabase
      .from("staff_attendance_logs")
      .select("id, staff_id, type, recorded_at")
      .eq("staff_id", staffId)
      .gte("recorded_at", monthStart.toISOString());

    const rows = buildDailyAttendanceRows((logs || []) as never);
    const summary = summarizeStaffWorkHours(rows, logs || []);
    setMonthMinutes(summary[0]?.monthMinutes ?? 0);
  }, [tenantId, staffId]);

  useEffect(() => {
    if (canManageStaff) void load();
  }, [canManageStaff, load]);

  const saveHr = async () => {
    if (!staffId || !hrForm.name?.trim()) {
      toast.error(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "이름을 입력해주세요.", "Please enter your name.", "Vui lòng nhập tên của bạn.", "名前を入力してください。", "请输入您的姓名。", "請輸入您的姓名。", "Por favor ingrese su nombre.", "Por favor, digite seu nome.", "Veuillez entrer votre nom.", "Bitte geben Sie Ihren Namen ein.", "Пожалуйста, введите свое имя."), "Please enter your name.", "Vui lòng nhập tên của bạn.", "名前を入力してください。", "请输入您的姓名。", "請輸入您的姓名。", "Por favor ingrese su nombre.", "Por favor, digite seu nome.", "Veuillez entrer votre nom.", "Bitte geben Sie Ihren Namen ein.", "Пожалуйста, введите свое имя."), "Please enter your name.", "Vui lòng nhập tên của bạn.", "名前を入力してください。", "请输入您的姓名。", "請輸入您的姓名。", "Por favor ingrese su nombre.", "Por favor, digite seu nome.", "Veuillez entrer votre nom.", "Bitte geben Sie Ihren Namen ein.", "Пожалуйста, введите свое имя."), "Please enter your name.", "Vui lòng nhập tên của bạn.", "名前を入力してください。", "请输入您的姓名。", "請輸入您的姓名。", "Por favor ingrese su nombre.", "Por favor, digite seu nome.", "Veuillez entrer votre nom.", "Bitte geben Sie Ihren Namen ein.", "Пожалуйста, введите свое имя."));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: staffId, ...hrForm, name: hrForm.name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "인사 정보가 저장되었습니다.", "Your personnel information has been saved.", "Thông tin nhân sự của bạn đã được lưu.", "人事情報が保存されました。", "您的人事信息已保存。", "您的人事資訊已儲存。", "Su información personal ha sido guardada.", "Suas informações pessoais foram salvas.", "Vos informations personnelles ont été enregistrées.", "Ihre Personaldaten wurden gespeichert.", "Ваша персональная информация сохранена."), "Your personnel information has been saved.", "Thông tin nhân sự của bạn đã được lưu.", "人事情報が保存されました。", "您的人事信息已保存。", "您的人事資訊已儲存。", "Su información personal ha sido guardada.", "Suas informações pessoais foram salvas.", "Vos informations personnelles ont été enregistrées.", "Ihre Personaldaten wurden gespeichert.", "Ваша персональная информация сохранена."), "Your personnel information has been saved.", "Thông tin nhân sự của bạn đã được lưu.", "人事情報が保存されました。", "您的人事信息已保存。", "您的人事資訊已儲存。", "Su información personal ha sido guardada.", "Suas informações pessoais foram salvas.", "Vos informations personnelles ont été enregistrées.", "Ihre Personaldaten wurden gespeichert.", "Ваша персональная информация сохранена."), "Your personnel information has been saved.", "Thông tin nhân sự của bạn đã được lưu.", "人事情報が保存されました。", "您的人事信息已保存。", "您的人事資訊已儲存。", "Su información personal ha sido guardada.", "Suas informações pessoais foram salvas.", "Vos informations personnelles ont été enregistrées.", "Ihre Personaldaten wurden gespeichert.", "Ваша персональная информация сохранена."));
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "저장 실패", "save failed", "lưu không thành công", "保存失敗", "保存失败", "保存失敗", "guardar falló", "falha ao salvar", "échec de la sauvegarde", "Speichern fehlgeschlagen", "сохранить не удалось"), "save failed", "lưu không thành công", "保存失敗", "保存失败", "保存失敗", "guardar falló", "falha ao salvar", "échec de la sauvegarde", "Speichern fehlgeschlagen", "сохранить не удалось"), "save failed", "lưu không thành công", "保存失敗", "保存失败", "保存失敗", "guardar falló", "falha ao salvar", "échec de la sauvegarde", "Speichern fehlgeschlagen", "сохранить не удалось"), "save failed", "lưu không thành công", "保存失敗", "保存失败", "保存失敗", "guardar falló", "falha ao salvar", "échec de la sauvegarde", "Speichern fehlgeschlagen", "сохранить не удалось"));
    } finally {
      setSaving(false);
    }
  };

  const saveFin = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/staff/financials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(syncFinancialFromAnnual({ ...financial, staff_id: staffId })),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setFinancial(json.financial);
      toast.success(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여 계약이 저장되었습니다.", "Your salary contract has been saved.", "Hợp đồng tiền lương của bạn đã được lưu.", "給与契約が保存されました。", "您的工资合同已保存。", "您的工資合約已保存。", "Tu contrato salarial ha sido guardado.", "Seu contrato salarial foi salvo.", "Votre contrat salarial a été sauvegardé.", "Ihr Gehaltsvertrag wurde gespeichert.", "Ваш договор о зарплате сохранен."), "Your salary contract has been saved.", "Hợp đồng tiền lương của bạn đã được lưu.", "給与契約が保存されました。", "您的工资合同已保存。", "您的工資合約已保存。", "Tu contrato salarial ha sido guardado.", "Seu contrato salarial foi salvo.", "Votre contrat salarial a été sauvegardé.", "Ihr Gehaltsvertrag wurde gespeichert.", "Ваш договор о зарплате сохранен."), "Your salary contract has been saved.", "Hợp đồng tiền lương của bạn đã được lưu.", "給与契約が保存されました。", "您的工资合同已保存。", "您的工資合約已保存。", "Tu contrato salarial ha sido guardado.", "Seu contrato salarial foi salvo.", "Votre contrat salarial a été sauvegardé.", "Ihr Gehaltsvertrag wurde gespeichert.", "Ваш договор о зарплате сохранен."), "Your salary contract has been saved.", "Hợp đồng tiền lương của bạn đã được lưu.", "給与契約が保存されました。", "您的工资合同已保存。", "您的工資合約已保存。", "Tu contrato salarial ha sido guardado.", "Seu contrato salarial foi salvo.", "Votre contrat salarial a été sauvegardé.", "Ihr Gehaltsvertrag wurde gespeichert.", "Ваш договор о зарплате сохранен."));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "저장 실패", "save failed", "lưu không thành công", "保存失敗", "保存失败", "保存失敗", "guardar falló", "falha ao salvar", "échec de la sauvegarde", "Speichern fehlgeschlagen", "сохранить не удалось"), "save failed", "lưu không thành công", "保存失敗", "保存失败", "保存失敗", "guardar falló", "falha ao salvar", "échec de la sauvegarde", "Speichern fehlgeschlagen", "сохранить не удалось"), "save failed", "lưu không thành công", "保存失敗", "保存失败", "保存失敗", "guardar falló", "falha ao salvar", "échec de la sauvegarde", "Speichern fehlgeschlagen", "сохранить не удалось"), "save failed", "lưu không thành công", "保存失敗", "保存失败", "保存失敗", "guardar falló", "falha ao salvar", "échec de la sauvegarde", "Speichern fehlgeschlagen", "сохранить не удалось"));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="p-8 text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "불러오는 중...", "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка...")}</div>;
  if (!canManageStaff) return <div className="p-8 text-slate-600">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "접근 권한이 없습니다.", "You do not have access permission.", "Bạn không có quyền truy cập.", "アクセス権がありません。", "您没有访问权限。", "您沒有存取權限。", "No tienes permiso de acceso.", "Você não tem permissão de acesso.", "Vous n'avez pas d'autorisation d'accès.", "Sie haben keine Zugriffsberechtigung.", "У вас нет разрешения на доступ."), "You do not have access permission.", "Bạn không có quyền truy cập.", "アクセス権がありません。", "您没有访问权限。", "您沒有存取權限。", "No tienes permiso de acceso.", "Você não tem permissão de acesso.", "Vous n'avez pas d'autorisation d'accès.", "Sie haben keine Zugriffsberechtigung.", "У вас нет разрешения на доступ."), "You do not have access permission.", "Bạn không có quyền truy cập.", "アクセス権がありません。", "您没有访问权限。", "您沒有存取權限。", "No tienes permiso de acceso.", "Você não tem permissão de acesso.", "Vous n'avez pas d'autorisation d'accès.", "Sie haben keine Zugriffsberechtigung.", "У вас нет разрешения на доступ."), "You do not have access permission.", "Bạn không có quyền truy cập.", "アクセス権がありません。", "您没有访问权限。", "您沒有存取權限。", "No tienes permiso de acceso.", "Você não tem permissão de acesso.", "Vous n'avez pas d'autorisation d'accès.", "Sie haben keine Zugriffsberechtigung.", "У вас нет разрешения на доступ.")}</div>;
  if (!profile) return <div className="p-8 text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "불러오는 중...", "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка...")}</div>;

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="p-6 pb-2 flex items-center gap-3">
        <Link href="/dashboard/staff" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="text-sm text-slate-500">{profile.position || pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원 상세", "staff details", "chi tiết nhân viên", "スタッフ詳細", "员工详细信息", "員工詳細資訊", "detalles del personal", "detalhes da equipe", "détails du personnel", "Angaben zum Personal", "данные о персонале"), "staff details", "chi tiết nhân viên", "スタッフ詳細", "员工详细信息", "員工詳細資訊", "detalles del personal", "detalhes da equipe", "détails du personnel", "Angaben zum Personal", "данные о персонале"), "staff details", "chi tiết nhân viên", "スタッフ詳細", "员工详细信息", "員工詳細資訊", "detalles del personal", "detalhes da equipe", "détails du personnel", "Angaben zum Personal", "данные о персонале"), "staff details", "chi tiết nhân viên", "スタッフ詳細", "员工详细信息", "員工詳細資訊", "detalles del personal", "detalhes da equipe", "détails du personnel", "Angaben zum Personal", "данные о персонале")}</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 flex-1 overflow-auto">
        <StaffSubNav />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-indigo-400" />
              <div>
                <p className="text-xs text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "이번 달 근무", "working this month", "làm việc trong tháng này", "今月の勤務", "这个月工作", "這個月工作", "trabajando este mes", "trabalhando este mês", "je travaille ce mois-ci", "Ich arbeite diesen Monat", "работаю в этом месяце"), "working this month", "làm việc trong tháng này", "今月の勤務", "这个月工作", "這個月工作", "trabajando este mes", "trabalhando este mês", "je travaille ce mois-ci", "Ich arbeite diesen Monat", "работаю в этом месяце"), "working this month", "làm việc trong tháng này", "今月の勤務", "这个月工作", "這個月工作", "trabajando este mes", "trabalhando este mês", "je travaille ce mois-ci", "Ich arbeite diesen Monat", "работаю в этом месяце"), "working this month", "làm việc trong tháng này", "今月の勤務", "这个月工作", "這個月工作", "trabajando este mes", "trabalhando este mês", "je travaille ce mois-ci", "Ich arbeite diesen Monat", "работаю в этом месяце")}</p>
                <p className="font-bold">{formatWorkHours(monthMinutes)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "고용 형태", "employment type", "loại việc làm", "雇用形態", "就业类型", "就業類型", "tipo de empleo", "tipo de emprego", "type d'emploi", "Beschäftigungsart", "тип занятости"), "employment type", "loại việc làm", "雇用形態", "就业类型", "就業類型", "tipo de empleo", "tipo de emprego", "type d'emploi", "Beschäftigungsart", "тип занятости"), "employment type", "loại việc làm", "雇用形態", "就业类型", "就業類型", "tipo de empleo", "tipo de emprego", "type d'emploi", "Beschäftigungsart", "тип занятости"), "employment type", "loại việc làm", "雇用形態", "就业类型", "就業類型", "tipo de empleo", "tipo de emprego", "type d'emploi", "Beschäftigungsart", "тип занятости")}</p>
                <p className="font-bold">{financial.employment_type}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <CalendarOff className="w-8 h-8 text-amber-400" />
              <div>
                <p className="text-xs text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "휴가 신청", "leave application", "rời khỏi ứng dụng", "休暇申請", "请假申请", "請假申請", "dejar la solicitud", "deixar o aplicativo", "demande de congé", "Antrag verlassen", "оставить заявку"), "leave application", "rời khỏi ứng dụng", "休暇申請", "请假申请", "請假申請", "dejar la solicitud", "deixar o aplicativo", "demande de congé", "Antrag verlassen", "оставить заявку"), "leave application", "rời khỏi ứng dụng", "休暇申請", "请假申请", "請假申請", "dejar la solicitud", "deixar o aplicativo", "demande de congé", "Antrag verlassen", "оставить заявку"), "leave application", "rời khỏi ứng dụng", "休暇申請", "请假申请", "請假申請", "dejar la solicitud", "deixar o aplicativo", "demande de congé", "Antrag verlassen", "оставить заявку")}</p>
                <p className="font-bold">{leaves.length}건</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="hr">
          <TabsList>
            <TabsTrigger value="hr">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "인사 정보", "personnel information", "thông tin nhân sự", "人事情報", "人员信息", "人員資訊", "información del personal", "informações pessoais", "informations personnelles", "Personalinformationen", "информация о персонале"), "personnel information", "thông tin nhân sự", "人事情報", "人员信息", "人員資訊", "información del personal", "informações pessoais", "informations personnelles", "Personalinformationen", "информация о персонале"), "personnel information", "thông tin nhân sự", "人事情報", "人员信息", "人員資訊", "información del personal", "informações pessoais", "informations personnelles", "Personalinformationen", "информация о персонале"), "personnel information", "thông tin nhân sự", "人事情報", "人员信息", "人員資訊", "información del personal", "informações pessoais", "informations personnelles", "Personalinformationen", "информация о персонале")}</TabsTrigger>
            <TabsTrigger value="salary">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여·보험", "Salary/Insurance", "Lương/Bảo hiểm", "給与・保険", "薪资/保险", "薪資/保險", "Salario/Seguro", "Salário/Seguro", "Salaire/Assurance", "Gehalt/Versicherung", "Зарплата/страховка"), "Salary/Insurance", "Lương/Bảo hiểm", "給与・保険", "薪资/保险", "薪資/保險", "Salario/Seguro", "Salário/Seguro", "Salaire/Assurance", "Gehalt/Versicherung", "Зарплата/страховка"), "Salary/Insurance", "Lương/Bảo hiểm", "給与・保険", "薪资/保险", "薪資/保險", "Salario/Seguro", "Salário/Seguro", "Salaire/Assurance", "Gehalt/Versicherung", "Зарплата/страховка"), "Salary/Insurance", "Lương/Bảo hiểm", "給与・保険", "薪资/保险", "薪資/保險", "Salario/Seguro", "Salário/Seguro", "Salaire/Assurance", "Gehalt/Versicherung", "Зарплата/страховка")}</TabsTrigger>
            <TabsTrigger value="leave">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "휴가", "vacation", "kì nghỉ", "休暇", "假期", "假期", "vacaciones", "férias", "vacances", "Urlaub", "отпуск"), "vacation", "kì nghỉ", "休暇", "假期", "假期", "vacaciones", "férias", "vacances", "Urlaub", "отпуск"), "vacation", "kì nghỉ", "休暇", "假期", "假期", "vacaciones", "férias", "vacances", "Urlaub", "отпуск"), "vacation", "kì nghỉ", "休暇", "假期", "假期", "vacaciones", "férias", "vacances", "Urlaub", "отпуск")}</TabsTrigger>
            <TabsTrigger value="payslip">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여 이력", "salary history", "lịch sử tiền lương", "給与履歴", "薪资历史", "薪資歷史", "historial salarial", "histórico salarial", "historique de salaire", "Gehaltsverlauf", "история зарплат"), "salary history", "lịch sử tiền lương", "給与履歴", "薪资历史", "薪資歷史", "historial salarial", "histórico salarial", "historique de salaire", "Gehaltsverlauf", "история зарплат"), "salary history", "lịch sử tiền lương", "給与履歴", "薪资历史", "薪資歷史", "historial salarial", "histórico salarial", "historique de salaire", "Gehaltsverlauf", "история зарплат"), "salary history", "lịch sử tiền lương", "給与履歴", "薪资历史", "薪資歷史", "historial salarial", "histórico salarial", "historique de salaire", "Gehaltsverlauf", "история зарплат")}</TabsTrigger>
          </TabsList>

          <TabsContent value="hr" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row justify-between">
                <CardTitle className="text-base">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "인사 정보", "personnel information", "thông tin nhân sự", "人事情報", "人员信息", "人員資訊", "información del personal", "informações pessoais", "informations personnelles", "Personalinformationen", "информация о персонале"), "personnel information", "thông tin nhân sự", "人事情報", "人员信息", "人員資訊", "información del personal", "informações pessoais", "informations personnelles", "Personalinformationen", "информация о персонале"), "personnel information", "thông tin nhân sự", "人事情報", "人员信息", "人員資訊", "información del personal", "informações pessoais", "informations personnelles", "Personalinformationen", "информация о персонале"), "personnel information", "thông tin nhân sự", "人事情報", "人员信息", "人員資訊", "información del personal", "informações pessoais", "informations personnelles", "Personalinformationen", "информация о персонале")}</CardTitle>
                <Button size="sm" onClick={() => void saveHr()} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" />
                 {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "저장", "save", "cứu", "保存", "节省", "節省", "ahorrar", "salvar", "sauvegarder", "speichern", "сохранять"), "save", "cứu", "保存", "节省", "節省", "ahorrar", "salvar", "sauvegarder", "speichern", "сохранять"), "save", "cứu", "保存", "节省", "節省", "ahorrar", "salvar", "sauvegarder", "speichern", "сохранять"), "save", "cứu", "保存", "节省", "節省", "ahorrar", "salvar", "sauvegarder", "speichern", "сохранять")}장
                </Button>
              </CardHeader>
              <CardContent>
                <StaffHrFieldsForm value={hrForm} onChange={setHrForm} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salary" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-base">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여 계약·4대보험", "Salary contract, 4 major insurances", "Hợp đồng lương, 4 bảo hiểm chính", "給与契約・4大保険", "薪资合同、4大保险", "薪資契約、4大保險", "Contrato de sueldo, 4 seguros importantes.", "Contrato salarial, 4 grandes seguros", "Contrat salarial, 4 grandes assurances", "Gehaltsvertrag, 4 große Versicherungen", "Контракт о заработной плате, 4 основные страховки"), "Salary contract, 4 major insurances", "Hợp đồng lương, 4 bảo hiểm chính", "給与契約・4大保険", "薪资合同、4大保险", "薪資契約、4大保險", "Contrato de sueldo, 4 seguros importantes.", "Contrato salarial, 4 grandes seguros", "Contrat salarial, 4 grandes assurances", "Gehaltsvertrag, 4 große Versicherungen", "Контракт о заработной плате, 4 основные страховки"), "Salary contract, 4 major insurances", "Hợp đồng lương, 4 bảo hiểm chính", "給与契約・4大保険", "薪资合同、4大保险", "薪資契約、4大保險", "Contrato de sueldo, 4 seguros importantes.", "Contrato salarial, 4 grandes seguros", "Contrat salarial, 4 grandes assurances", "Gehaltsvertrag, 4 große Versicherungen", "Контракт о заработной плате, 4 основные страховки"), "Salary contract, 4 major insurances", "Hợp đồng lương, 4 bảo hiểm chính", "給与契約・4大保険", "薪资合同、4大保险", "薪資契約、4大保險", "Contrato de sueldo, 4 seguros importantes.", "Contrato salarial, 4 grandes seguros", "Contrat salarial, 4 grandes assurances", "Gehaltsvertrag, 4 große Versicherungen", "Контракт о заработной плате, 4 основные страховки")}</CardTitle>
                <div className="flex gap-2">
                  <Link href="/dashboard/staff/salary">
                    <Button size="sm" variant="outline">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여 정산 →", "Salary settlement →", "Quyết toán lương →", "給与決済 →", "工资结算 →", "薪資結算 →", "Liquidación de salario →", "Liquidação salarial →", "Règlement des salaires →", "Gehaltsabrechnung →", "Расчет заработной платы →"), "Salary settlement →", "Quyết toán lương →", "給与決済 →", "工资结算 →", "薪資結算 →", "Liquidación de salario →", "Liquidação salarial →", "Règlement des salaires →", "Gehaltsabrechnung →", "Расчет заработной платы →"), "Salary settlement →", "Quyết toán lương →", "給与決済 →", "工资结算 →", "薪資結算 →", "Liquidación de salario →", "Liquidação salarial →", "Règlement des salaires →", "Gehaltsabrechnung →", "Расчет заработной платы →"), "Salary settlement →", "Quyết toán lương →", "給与決済 →", "工资结算 →", "薪資結算 →", "Liquidación de salario →", "Liquidação salarial →", "Règlement des salaires →", "Gehaltsabrechnung →", "Расчет заработной платы →")}</Button>
                  </Link>
                  <Button size="sm" onClick={() => void saveFin()} disabled={saving}>
                    <Save className="w-4 h-4 mr-1" />
                   {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "저장", "save", "cứu", "保存", "节省", "節省", "ahorrar", "salvar", "sauvegarder", "speichern", "сохранять"), "save", "cứu", "保存", "节省", "節省", "ahorrar", "salvar", "sauvegarder", "speichern", "сохранять"), "save", "cứu", "保存", "节省", "節省", "ahorrar", "salvar", "sauvegarder", "speichern", "сохранять"), "save", "cứu", "保存", "节省", "節省", "ahorrar", "salvar", "sauvegarder", "speichern", "сохранять")}장
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <StaffFinancialForm
                  value={{ ...financial, staff_id: staffId }}
                  onChange={setFinancial}
                  payroll={payroll}
                />
              </CardContent>
            </Card>
            <StaffSeveranceCard staffId={staffId} />
          </TabsContent>

          <TabsContent value="leave" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row justify-between">
                <CardTitle className="text-base">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "휴가 내역", "vacation details", "chi tiết kỳ nghỉ", "休暇履歴", "假期历史", "假期詳情", "historial de vacaciones", "história de férias", "détails des vacances", "Urlaubsdetails", "история отпуска"), "vacation details", "chi tiết kỳ nghỉ", "休暇履歴", "假期历史", "假期詳情", "historial de vacaciones", "história de férias", "détails des vacances", "Urlaubsdetails", "история отпуска"), "vacation details", "chi tiết kỳ nghỉ", "休暇履歴", "假期历史", "假期詳情", "historial de vacaciones", "história de férias", "détails des vacances", "Urlaubsdetails", "история отпуска"), "vacation details", "chi tiết kỳ nghỉ", "休暇履歴", "假期历史", "假期詳情", "historial de vacaciones", "história de férias", "détails des vacances", "Urlaubsdetails", "история отпуска")}</CardTitle>
                <Link href="/dashboard/staff/leave">
                  <Button size="sm" variant="outline">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "휴가 관리 →", "Vacation Management →", "Quản lý kỳ nghỉ →", "休暇管理→", "假期管理 →", "假期管理 →", "Gestión de vacaciones →", "Gestão de férias →", "Gestion des vacances →", "Urlaubsmanagement →", "Управление отпуском →"), "Vacation Management →", "Quản lý kỳ nghỉ →", "休暇管理→", "假期管理 →", "假期管理 →", "Gestión de vacaciones →", "Gestão de férias →", "Gestion des vacances →", "Urlaubsmanagement →", "Управление отпуском →"), "Vacation Management →", "Quản lý kỳ nghỉ →", "休暇管理→", "假期管理 →", "假期管理 →", "Gestión de vacaciones →", "Gestão de férias →", "Gestion des vacances →", "Urlaubsmanagement →", "Управление отпуском →"), "Vacation Management →", "Quản lý kỳ nghỉ →", "休暇管理→", "假期管理 →", "假期管理 →", "Gestión de vacaciones →", "Gestão de férias →", "Gestion des vacances →", "Urlaubsmanagement →", "Управление отпуском →")}</Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {leaves.length === 0 ? (
                  <p className="text-slate-500 text-sm">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "휴가 신청이 없습니다.", "There are no leave requests.", "Không có yêu cầu nghỉ phép.", "休暇申請はありません。", "没有请假请求。", "沒有請假請求。", "No hay solicitudes de licencia.", "Não há pedidos de licença.", "Il n'y a aucune demande de congé.", "Es liegen keine Urlaubsanträge vor.", "Заявок на отпуск нет."), "There are no leave requests.", "Không có yêu cầu nghỉ phép.", "休暇申請はありません。", "没有请假请求。", "沒有請假請求。", "No hay solicitudes de licencia.", "Não há pedidos de licença.", "Il n'y a aucune demande de congé.", "Es liegen keine Urlaubsanträge vor.", "Заявок на отпуск нет."), "There are no leave requests.", "Không có yêu cầu nghỉ phép.", "休暇申請はありません。", "没有请假请求。", "沒有請假請求。", "No hay solicitudes de licencia.", "Não há pedidos de licença.", "Il n'y a aucune demande de congé.", "Es liegen keine Urlaubsanträge vor.", "Заявок на отпуск нет."), "There are no leave requests.", "Không có yêu cầu nghỉ phép.", "休暇申請はありません。", "没有请假请求。", "沒有請假請求。", "No hay solicitudes de licencia.", "Não há pedidos de licença.", "Il n'y a aucune demande de congé.", "Es liegen keine Urlaubsanträge vor.", "Заявок на отпуск нет.")}</p>
                ) : (
                  leaves.map((l) => (
                    <div key={l.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                      <div>
                        <span className="font-medium">{l.leave_type}</span>
                        <span className="text-slate-500 ml-2">{l.start_date} ~ {l.end_date}</span>
                      </div>
                      <Badge variant="outline">{l.status}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payslip" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여 명세 이력", "pay stub history", "lịch sử cuống phiếu lương", "給与仕様履歴", "工资单历史记录", "薪資歷史記錄", "historial de recibo de pago", "histórico de recibo de pagamento", "historique des fiches de paie", "Gehaltsabrechnungsverlauf", "история квитанций о платежах"), "pay stub history", "lịch sử cuống phiếu lương", "給与仕様履歴", "工资单历史记录", "薪資歷史記錄", "historial de recibo de pago", "histórico de recibo de pagamento", "historique des fiches de paie", "Gehaltsabrechnungsverlauf", "история квитанций о платежах"), "pay stub history", "lịch sử cuống phiếu lương", "給与仕様履歴", "工资单历史记录", "薪資歷史記錄", "historial de recibo de pago", "histórico de recibo de pagamento", "historique des fiches de paie", "Gehaltsabrechnungsverlauf", "история квитанций о платежах"), "pay stub history", "lịch sử cuống phiếu lương", "給与仕様履歴", "工资单历史记录", "薪資歷史記錄", "historial de recibo de pago", "histórico de recibo de pagamento", "historique des fiches de paie", "Gehaltsabrechnungsverlauf", "история квитанций о платежах")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {statements.length === 0 ? (
                  <p className="text-slate-500 text-sm">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여 명세가 없습니다.", "There are no pay stubs.", "Không có cuống phiếu lương.", "給与指定はありません。", "没有工资单。", "沒有薪資單。", "No hay recibos de pago.", "Não há recibos de pagamento.", "Il n’y a pas de fiches de paie.", "Es gibt keine Gehaltsabrechnungen.", "Квитанций о заработной плате нет."), "There are no pay stubs.", "Không có cuống phiếu lương.", "給与指定はありません。", "没有工资单。", "沒有薪資單。", "No hay recibos de pago.", "Não há recibos de pagamento.", "Il n’y a pas de fiches de paie.", "Es gibt keine Gehaltsabrechnungen.", "Квитанций о заработной плате нет."), "There are no pay stubs.", "Không có cuống phiếu lương.", "給与指定はありません。", "没有工资单。", "沒有薪資單。", "No hay recibos de pago.", "Não há recibos de pagamento.", "Il n’y a pas de fiches de paie.", "Es gibt keine Gehaltsabrechnungen.", "Квитанций о заработной плате нет."), "There are no pay stubs.", "Không có cuống phiếu lương.", "給与指定はありません。", "没有工资单。", "沒有薪資單。", "No hay recibos de pago.", "Não há recibos de pagamento.", "Il n’y a pas de fiches de paie.", "Es gibt keine Gehaltsabrechnungen.", "Квитанций о заработной плате нет.")}</p>
                ) : (
                  statements.map((s) => (
                    <div key={s.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                      <div>
                        <span className="font-medium">{s.payment_year_month}</span>
                        <span className="text-slate-500 ml-2">{formatKrw(s.net_pay)}</span>
                      </div>
                      {s.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewStatementId(s.id!)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                         {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "미리보기", "Preview", "Xem trước", "プレビュー", "预览", "預覽", "Avance", "Visualização", "Aperçu", "Vorschau", "Предварительный просмотр"), "Preview", "Xem trước", "プレビュー", "预览", "預覽", "Avance", "Visualização", "Aperçu", "Vorschau", "Предварительный просмотр"), "Preview", "Xem trước", "プレビュー", "预览", "預覽", "Avance", "Visualização", "Aperçu", "Vorschau", "Предварительный просмотр"), "Preview", "Xem trước", "プレビュー", "预览", "預覽", "Avance", "Visualização", "Aperçu", "Vorschau", "Предварительный просмотр")}기
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {previewStatementId && (
        <PayslipPreviewDialog
          open={!!previewStatementId}
          onOpenChange={(open) => !open && setPreviewStatementId(null)}
          statementId={previewStatementId}
          title={`${profile?.name ?? ""} 급여명세서`}
        />
      )}
    </div>
  );
}
