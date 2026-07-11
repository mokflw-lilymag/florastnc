"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { StaffSubNav } from "@/app/dashboard/staff/components/staff-sub-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FileDown, Plus, Check, X } from "lucide-react";
import type { LeaveType, StaffLeaveRequest } from "@/types/staff-salary";
import { exportStaffLeaveToExcel } from "@/lib/staff-hr-excel";
import { StaffLeaveCalendar } from "@/app/dashboard/staff/components/StaffLeaveCalendar";
import { createClient } from "@/utils/supabase/client";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

const LEAVE_TYPES: LeaveType[] = ["연차", "반차", "병가", "무급", "기타"];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export default function StaffLeavePage() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);

  const { canManageStaff, isLoading: authLoading, tenantId } = useAuth();
  const [requests, setRequests] = useState<StaffLeaveRequest[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    staffId: "",
    leaveType: pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "연차", "annual leave", "nghỉ phép hàng năm", "年次", "年假", "年假", "vacaciones anuales", "Banco de horas", "congé annuel", "Jahresurlaub", "ежегодный отпуск"), "annual leave", "nghỉ phép hàng năm", "年次", "年假", "年假", "vacaciones anuales", "Banco de horas", "congé annuel", "Jahresurlaub", "ежегодный отпуск"), "annual leave", "nghỉ phép hàng năm", "年次", "年假", "年假", "vacaciones anuales", "Banco de horas", "congé annuel", "Jahresurlaub", "ежегодный отпуск"), "annual leave", "nghỉ phép hàng năm", "年次", "年假", "年假", "vacaciones anuales", "Banco de horas", "congé annuel", "Jahresurlaub", "ежегодный отпуск") as LeaveType,
    startDate: "",
    endDate: "",
    reason: "",
    contact: "",
  });
  const [saving, setSaving] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  const fetchRequests = useCallback(async () => {
    const q = filter === "all" ? "" : `?status=${filter}`;
    const res = await fetch(`/api/staff/leave${q}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setRequests(json.requests || []);
  }, [filter]);

  const fetchStaff = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("tenant_staff")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("name");
    setStaffList(data || []);
    if (data?.[0]) setForm((f) => ({ ...f, staffId: f.staffId || data[0].id }));
  }, [tenantId]);

  useEffect(() => {
    if (canManageStaff) {
      setLoading(true);
      Promise.all([fetchRequests(), fetchStaff()])
        .catch((e) => toast.error(e.message))
        .finally(() => setLoading(false));
    }
  }, [canManageStaff, fetchRequests, fetchStaff]);

  const openLeaveDialog = (dateYmd: string) => {
    setForm((f) => ({
      ...f,
      startDate: dateYmd,
      endDate: f.endDate && f.endDate >= dateYmd ? f.endDate : dateYmd,
    }));
    setOpen(true);
  };

  const submitLeave = async () => {
    if (!form.staffId || !form.startDate || !form.endDate) {
      toast.error(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "필수 항목을 입력해주세요.", "Please enter the required fields.", "Vui lòng nhập các trường bắt buộc.", "必須項目を入力してください。", "请输入必填字段。", "請輸入必填欄位。", "Por favor ingrese los campos requeridos.", "Por favor insira os campos obrigatórios.", "Veuillez saisir les champs obligatoires.", "Bitte füllen Sie die erforderlichen Felder aus.", "Пожалуйста, введите необходимые поля."), "Please enter the required fields.", "Vui lòng nhập các trường bắt buộc.", "必須項目を入力してください。", "请输入必填字段。", "請輸入必填欄位。", "Por favor ingrese los campos requeridos.", "Por favor insira os campos obrigatórios.", "Veuillez saisir les champs obligatoires.", "Bitte füllen Sie die erforderlichen Felder aus.", "Пожалуйста, введите необходимые поля."), "Please enter the required fields.", "Vui lòng nhập các trường bắt buộc.", "必須項目を入力してください。", "请输入必填字段。", "請輸入必填欄位。", "Por favor ingrese los campos requeridos.", "Por favor insira os campos obrigatórios.", "Veuillez saisir les champs obligatoires.", "Bitte füllen Sie die erforderlichen Felder aus.", "Пожалуйста, введите необходимые поля."), "Please enter the required fields.", "Vui lòng nhập các trường bắt buộc.", "必須項目を入力してください。", "请输入必填字段。", "請輸入必填欄位。", "Por favor ingrese los campos requeridos.", "Por favor insira os campos obrigatórios.", "Veuillez saisir les champs obligatoires.", "Bitte füllen Sie die erforderlichen Felder aus.", "Пожалуйста, введите необходимые поля."));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/staff/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: form.staffId,
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason,
          contact: form.contact,
          autoApprove: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "휴가 신청이 등록되었습니다.", "Your leave request has been registered.", "Yêu cầu nghỉ phép của bạn đã được đăng ký.", "休暇申請が登録されました。", "您的休假申请已登记。", "您的休假申請已登記。", "Su solicitud de permiso ha sido registrada.", "Seu pedido de licença foi registrado.", "Votre demande de congé a été enregistrée.", "Ihr Urlaubsantrag wurde registriert.", "Ваше заявление об отпуске зарегистрировано."), "Your leave request has been registered.", "Yêu cầu nghỉ phép của bạn đã được đăng ký.", "休暇申請が登録されました。", "您的休假申请已登记。", "您的休假申請已登記。", "Su solicitud de permiso ha sido registrada.", "Seu pedido de licença foi registrado.", "Votre demande de congé a été enregistrée.", "Ihr Urlaubsantrag wurde registriert.", "Ваше заявление об отпуске зарегистрировано."), "Your leave request has been registered.", "Yêu cầu nghỉ phép của bạn đã được đăng ký.", "休暇申請が登録されました。", "您的休假申请已登记。", "您的休假申請已登記。", "Su solicitud de permiso ha sido registrada.", "Seu pedido de licença foi registrado.", "Votre demande de congé a été enregistrée.", "Ihr Urlaubsantrag wurde registriert.", "Ваше заявление об отпуске зарегистрировано."), "Your leave request has been registered.", "Yêu cầu nghỉ phép của bạn đã được đăng ký.", "休暇申請が登録されました。", "您的休假申请已登记。", "您的休假申請已登記。", "Su solicitud de permiso ha sido registrada.", "Seu pedido de licença foi registrado.", "Votre demande de congé a été enregistrée.", "Ihr Urlaubsantrag wurde registriert.", "Ваше заявление об отпуске зарегистрировано."));
      setOpen(false);
      void fetchRequests();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "등록 실패", "Registration failed", "Đăng ký không thành công", "登録失敗", "注册失败", "註冊失敗", "Registro fallido", "Falha no registro", "L'inscription a échoué", "Die Registrierung ist fehlgeschlagen", "Регистрация не удалась"), "Registration failed", "Đăng ký không thành công", "登録失敗", "注册失败", "註冊失敗", "Registro fallido", "Falha no registro", "L'inscription a échoué", "Die Registrierung ist fehlgeschlagen", "Регистрация не удалась"), "Registration failed", "Đăng ký không thành công", "登録失敗", "注册失败", "註冊失敗", "Registro fallido", "Falha no registro", "L'inscription a échoué", "Die Registrierung ist fehlgeschlagen", "Регистрация не удалась"), "Registration failed", "Đăng ký không thành công", "登録失敗", "注册失败", "註冊失敗", "Registro fallido", "Falha no registro", "L'inscription a échoué", "Die Registrierung ist fehlgeschlagen", "Регистрация не удалась"));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    let rejectReason: string | undefined;
    if (status === "rejected") {
      rejectReason = prompt(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "반려 사유를 입력하세요.", "Please enter the reason for rejection.", "Vui lòng nhập lý do từ chối.", "ペットの理由を入力してください。", "请输入拒绝原因。", "請輸入拒絕原因。", "Por favor ingrese el motivo del rechazo.", "Por favor, insira o motivo da rejeição.", "Veuillez saisir le motif du refus.", "Bitte geben Sie den Grund für die Ablehnung ein.", "Пожалуйста, укажите причину отклонения."), "Please enter the reason for rejection.", "Vui lòng nhập lý do từ chối.", "ペットの理由を入力してください。", "请输入拒绝原因。", "請輸入拒絕原因。", "Por favor ingrese el motivo del rechazo.", "Por favor, insira o motivo da rejeição.", "Veuillez saisir le motif du refus.", "Bitte geben Sie den Grund für die Ablehnung ein.", "Пожалуйста, укажите причину отклонения."), "Please enter the reason for rejection.", "Vui lòng nhập lý do từ chối.", "ペットの理由を入力してください。", "请输入拒绝原因。", "請輸入拒絕原因。", "Por favor ingrese el motivo del rechazo.", "Por favor, insira o motivo da rejeição.", "Veuillez saisir le motif du refus.", "Bitte geben Sie den Grund für die Ablehnung ein.", "Пожалуйста, укажите причину отклонения."), "Please enter the reason for rejection.", "Vui lòng nhập lý do từ chối.", "ペットの理由を入力してください。", "请输入拒绝原因。", "請輸入拒絕原因。", "Por favor ingrese el motivo del rechazo.", "Por favor, insira o motivo da rejeição.", "Veuillez saisir le motif du refus.", "Bitte geben Sie den Grund für die Ablehnung ein.", "Пожалуйста, укажите причину отклонения.")) ?? undefined;
      if (!rejectReason) return;
    }
    try {
      const res = await fetch(`/api/staff/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(status === "approved" ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "승인되었습니다.", "Approved.", "Tán thành.", "承認されました。", "得到正式认可的。", "得到正式認可的。", "Aprobado.", "Aprovado.", "Approuvé.", "Genehmigt.", "Одобренный."), "Approved.", "Tán thành.", "承認されました。", "得到正式认可的。", "得到正式認可的。", "Aprobado.", "Aprovado.", "Approuvé.", "Genehmigt.", "Одобренный."), "Approved.", "Tán thành.", "承認されました。", "得到正式认可的。", "得到正式認可的。", "Aprobado.", "Aprovado.", "Approuvé.", "Genehmigt.", "Одобренный."), "Approved.", "Tán thành.", "承認されました。", "得到正式认可的。", "得到正式認可的。", "Aprobado.", "Aprovado.", "Approuvé.", "Genehmigt.", "Одобренный.") : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "반려되었습니다.", "It has been rejected.", "Nó đã bị từ chối.", "お返しいたしました。", "已被拒绝。", "已被拒絕。", "Ha sido rechazado.", "Foi rejeitado.", "Il a été rejeté.", "Es wurde abgelehnt.", "Оно было отклонено."), "It has been rejected.", "Nó đã bị từ chối.", "お返しいたしました。", "已被拒绝。", "已被拒絕。", "Ha sido rechazado.", "Foi rejeitado.", "Il a été rejeté.", "Es wurde abgelehnt.", "Оно было отклонено."), "It has been rejected.", "Nó đã bị từ chối.", "お返しいたしました。", "已被拒绝。", "已被拒絕。", "Ha sido rechazado.", "Foi rejeitado.", "Il a été rejeté.", "Es wurde abgelehnt.", "Оно было отклонено."), "It has been rejected.", "Nó đã bị từ chối.", "お返しいたしました。", "已被拒绝。", "已被拒絕。", "Ha sido rechazado.", "Foi rejeitado.", "Il a été rejeté.", "Es wurde abgelehnt.", "Оно было отклонено."));
      void fetchRequests();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "처리 실패", "Processing failed", "Xử lý không thành công", "処理失敗", "处理失败", "處理失敗", "Error de procesamiento", "Falha no processamento", "Échec du traitement", "Die Verarbeitung ist fehlgeschlagen", "Обработка не удалась"), "Processing failed", "Xử lý không thành công", "処理失敗", "处理失败", "處理失敗", "Error de procesamiento", "Falha no processamento", "Échec du traitement", "Die Verarbeitung ist fehlgeschlagen", "Обработка не удалась"), "Processing failed", "Xử lý không thành công", "処理失敗", "处理失败", "處理失敗", "Error de procesamiento", "Falha no processamento", "Échec du traitement", "Die Verarbeitung ist fehlgeschlagen", "Обработка не удалась"), "Processing failed", "Xử lý không thành công", "処理失敗", "处理失败", "處理失敗", "Error de procesamiento", "Falha no processamento", "Échec du traitement", "Die Verarbeitung ist fehlgeschlagen", "Обработка не удалась"));
    }
  };

  if (authLoading) return <div className="p-8 text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "불러오는 중...", "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка...")}</div>;
  if (!canManageStaff) return <div className="p-8 text-slate-600">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "접근 권한이 없습니다.", "You do not have access permission.", "Bạn không có quyền truy cập.", "アクセス権がありません。", "您没有访问权限。", "您沒有存取權限。", "No tienes permiso de acceso.", "Você não tem permissão de acesso.", "Vous n'avez pas d'autorisation d'accès.", "Sie haben keine Zugriffsberechtigung.", "У вас нет разрешения на доступ."), "You do not have access permission.", "Bạn không có quyền truy cập.", "アクセス権がありません。", "您没有访问权限。", "您沒有存取權限。", "No tienes permiso de acceso.", "Você não tem permissão de acesso.", "Vous n'avez pas d'autorisation d'accès.", "Sie haben keine Zugriffsberechtigung.", "У вас нет разрешения на доступ."), "You do not have access permission.", "Bạn không có quyền truy cập.", "アクセス権がありません。", "您没有访问权限。", "您沒有存取權限。", "No tienes permiso de acceso.", "Você não tem permissão de acesso.", "Vous n'avez pas d'autorisation d'accès.", "Sie haben keine Zugriffsberechtigung.", "У вас нет разрешения на доступ."), "You do not have access permission.", "Bạn không có quyền truy cập.", "アクセス権がありません。", "您没有访问权限。", "您沒有存取權限。", "No tienes permiso de acceso.", "Você não tem permissão de acesso.", "Vous n'avez pas d'autorisation d'accès.", "Sie haben keine Zugriffsberechtigung.", "У вас нет разрешения на доступ.")}</div>;

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "휴가 관리", "vacation management", "quản lý kỳ nghỉ", "休暇管理", "假期管理", "假期管理", "gestión de vacaciones", "gestão de férias", "gestion des vacances", "Urlaubsmanagement", "управление отпуском"), "vacation management", "quản lý kỳ nghỉ", "休暇管理", "假期管理", "假期管理", "gestión de vacaciones", "gestão de férias", "gestion des vacances", "Urlaubsmanagement", "управление отпуском"), "vacation management", "quản lý kỳ nghỉ", "休暇管理", "假期管理", "假期管理", "gestión de vacaciones", "gestão de férias", "gestion des vacances", "Urlaubsmanagement", "управление отпуском"), "vacation management", "quản lý kỳ nghỉ", "休暇管理", "假期管理", "假期管理", "gestión de vacaciones", "gestão de férias", "gestion des vacances", "Urlaubsmanagement", "управление отпуском")}</h1>
        <p className="text-sm text-slate-500 mt-1">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "연차·반차·병가 신청 및 승인", "Annual leave, half-day leave, sick leave application and approval", "Nghỉ phép hàng năm, nghỉ nửa ngày, xin nghỉ ốm và được phê duyệt", "年次・半次・病気の申請及び承認", "年假、半天假、病假申请及审批", "年假、半天假、病假申請及審批", "Solicitud y aprobación de vacaciones anuales, vacaciones de media jornada, licencia por enfermedad", "Férias anuais, licença de meio dia, pedido e aprovação de licença médica", "Congé annuel, congé d'une demi-journée, demande et approbation d'un congé de maladie", "Jahresurlaub, halbtägiger Urlaub, Beantragung und Genehmigung von Krankheitsurlaub", "Ежегодный отпуск, отпуск на полдня, заявление и одобрение отпуска по болезни"), "Annual leave, half-day leave, sick leave application and approval", "Nghỉ phép hàng năm, nghỉ nửa ngày, xin nghỉ ốm và được phê duyệt", "年次・半次・病気の申請及び承認", "年假、半天假、病假申请及审批", "年假、半天假、病假申請及審批", "Solicitud y aprobación de vacaciones anuales, vacaciones de media jornada, licencia por enfermedad", "Férias anuais, licença de meio dia, pedido e aprovação de licença médica", "Congé annuel, congé d'une demi-journée, demande et approbation d'un congé de maladie", "Jahresurlaub, halbtägiger Urlaub, Beantragung und Genehmigung von Krankheitsurlaub", "Ежегодный отпуск, отпуск на полдня, заявление и одобрение отпуска по болезни"), "Annual leave, half-day leave, sick leave application and approval", "Nghỉ phép hàng năm, nghỉ nửa ngày, xin nghỉ ốm và được phê duyệt", "年次・半次・病気の申請及び承認", "年假、半天假、病假申请及审批", "年假、半天假、病假申請及審批", "Solicitud y aprobación de vacaciones anuales, vacaciones de media jornada, licencia por enfermedad", "Férias anuais, licença de meio dia, pedido e aprovação de licença médica", "Congé annuel, congé d'une demi-journée, demande et approbation d'un congé de maladie", "Jahresurlaub, halbtägiger Urlaub, Beantragung und Genehmigung von Krankheitsurlaub", "Ежегодный отпуск, отпуск на полдня, заявление и одобрение отпуска по болезни"), "Annual leave, half-day leave, sick leave application and approval", "Nghỉ phép hàng năm, nghỉ nửa ngày, xin nghỉ ốm và được phê duyệt", "年次・半次・病気の申請及び承認", "年假、半天假、病假申请及审批", "年假、半天假、病假申請及審批", "Solicitud y aprobación de vacaciones anuales, vacaciones de media jornada, licencia por enfermedad", "Férias anuais, licença de meio dia, pedido e aprovação de licença médica", "Congé annuel, congé d'une demi-journée, demande et approbation d'un congé de maladie", "Jahresurlaub, halbtägiger Urlaub, Beantragung und Genehmigung von Krankheitsurlaub", "Ежегодный отпуск, отпуск на полдня, заявление и одобрение отпуска по болезни")}</p>
      </div>

      <div className="p-4 md:p-6 space-y-4 flex-1 overflow-auto">
        <StaffSubNav />

        <div className="flex flex-wrap gap-2 items-center">
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
            >
              {s === "all" ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "전체", "entire", "toàn bộ", "全体", "全部的", "全部的", "completo", "inteiro", "entier", "gesamte", "весь"), "entire", "toàn bộ", "全体", "全部的", "全部的", "completo", "inteiro", "entier", "gesamte", "весь"), "entire", "toàn bộ", "全体", "全部的", "全部的", "completo", "inteiro", "entier", "gesamte", "весь"), "entire", "toàn bộ", "全体", "全部的", "全部的", "completo", "inteiro", "entier", "gesamte", "весь") : s === "pending" ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "대기", "atmosphere", "bầu không khí", "大気", "气氛", "氣氛", "atmósfera", "atmosfera", "atmosphère", "Atmosphäre", "атмосфера"), "atmosphere", "bầu không khí", "大気", "气氛", "氣氛", "atmósfera", "atmosfera", "atmosphère", "Atmosphäre", "атмосфера"), "atmosphere", "bầu không khí", "大気", "气氛", "氣氛", "atmósfera", "atmosfera", "atmosphère", "Atmosphäre", "атмосфера"), "atmosphere", "bầu không khí", "大気", "气氛", "氣氛", "atmósfera", "atmosfera", "atmosphère", "Atmosphäre", "атмосфера") : s === "approved" ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "승인", "approval", "sự chấp thuận", "承認", "赞同", "贊同", "aprobación", "aprovação", "approbation", "Genehmigung", "одобрение"), "approval", "sự chấp thuận", "承認", "赞同", "贊同", "aprobación", "aprovação", "approbation", "Genehmigung", "одобрение"), "approval", "sự chấp thuận", "承認", "赞同", "贊同", "aprobación", "aprovação", "approbation", "Genehmigung", "одобрение"), "approval", "sự chấp thuận", "承認", "赞同", "贊同", "aprobación", "aprovação", "approbation", "Genehmigung", "одобрение") : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "반려", "companion", "bạn đồng hành", "ペット", "伴侣", "伴侶", "compañero", "companheiro", "compagnon", "Begleiter", "компаньон"), "companion", "bạn đồng hành", "ペット", "伴侣", "伴侶", "compañero", "companheiro", "compagnon", "Begleiter", "компаньон"), "companion", "bạn đồng hành", "ペット", "伴侣", "伴侶", "compañero", "companheiro", "compagnon", "Begleiter", "компаньон"), "companion", "bạn đồng hành", "ペット", "伴侣", "伴侶", "compañero", "companheiro", "compagnon", "Begleiter", "компаньон")}
            </Button>
          ))}
          <Button size="sm" variant="outline" className="ml-auto gap-1" onClick={() => void exportStaffLeaveToExcel(requests)}>
            <FileDown className="w-4 h-4" />
           {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "엑셀", "excel", "vượt trội", "エクセル", "卓越", "卓越", "sobresalir", "excel", "exceller", "übertreffen", "превосходить"), "excel", "vượt trội", "エクセル", "卓越", "卓越", "sobresalir", "excel", "exceller", "übertreffen", "превосходить"), "excel", "vượt trội", "エクセル", "卓越", "卓越", "sobresalir", "excel", "exceller", "übertreffen", "превосходить"), "excel", "vượt trội", "エクセル", "卓越", "卓越", "sobresalir", "excel", "exceller", "übertreffen", "превосходить")}셀
          </Button>
          <Button size="sm" className="gap-1 bg-indigo-600" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" />
           {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "휴가 등록", "leave registration", "nghỉ đăng ký", "休暇登録", "请假登记", "請假登記", "dejar registro", "deixar registro", "quitter l'enregistrement", "Anmeldung verlassen", "покинуть регистрацию"), "leave registration", "nghỉ đăng ký", "休暇登録", "请假登记", "請假登記", "dejar registro", "deixar registro", "quitter l'enregistrement", "Anmeldung verlassen", "покинуть регистрацию"), "leave registration", "nghỉ đăng ký", "休暇登録", "请假登记", "請假登記", "dejar registro", "deixar registro", "quitter l'enregistrement", "Anmeldung verlassen", "покинуть регистрацию"), "leave registration", "nghỉ đăng ký", "休暇登録", "请假登记", "請假登記", "dejar registro", "deixar registro", "quitter l'enregistrement", "Anmeldung verlassen", "покинуть регистрацию")}록
          </Button>
        </div>

        <StaffLeaveCalendar
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          requests={requests}
          onDayClick={openLeaveDialog}
        />

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">신청 목록 ({requests.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-8 text-center text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "불러오는 중...", "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка...")}</p>
            ) : requests.length === 0 ? (
              <p className="p-8 text-center text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "신청 내역이 없습니다.", "There is no application history.", "Không có lịch sử ứng dụng.", "申請履歴はありません。", "没有申请历史。", "沒有申請歷史。", "No hay historial de aplicaciones.", "Não há histórico de aplicativos.", "Il n'y a pas d'historique de candidature.", "Es gibt keine Bewerbungshistorie.", "Истории заявок нет."), "There is no application history.", "Không có lịch sử ứng dụng.", "申請履歴はありません。", "没有申请历史。", "沒有申請歷史。", "No hay historial de aplicaciones.", "Não há histórico de aplicativos.", "Il n'y a pas d'historique de candidature.", "Es gibt keine Bewerbungshistorie.", "Истории заявок нет."), "There is no application history.", "Không có lịch sử ứng dụng.", "申請履歴はありません。", "没有申请历史。", "沒有申請歷史。", "No hay historial de aplicaciones.", "Não há histórico de aplicativos.", "Il n'y a pas d'historique de candidature.", "Es gibt keine Bewerbungshistorie.", "Истории заявок нет."), "There is no application history.", "Không có lịch sử ứng dụng.", "申請履歴はありません。", "没有申请历史。", "沒有申請歷史。", "No hay historial de aplicaciones.", "Não há histórico de aplicativos.", "Il n'y a pas d'historique de candidature.", "Es gibt keine Bewerbungshistorie.", "Истории заявок нет.")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원", "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник")}</th>
                      <th className="px-4 py-3 text-left">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "유형", "category", "loại", "タイプ", "类别", "類別", "categoría", "categoria", "catégorie", "Kategorie", "категория"), "category", "loại", "タイプ", "类别", "類別", "categoría", "categoria", "catégorie", "Kategorie", "категория"), "category", "loại", "タイプ", "类别", "類別", "categoría", "categoria", "catégorie", "Kategorie", "категория"), "category", "loại", "タイプ", "类别", "類別", "categoría", "categoria", "catégorie", "Kategorie", "категория")}</th>
                      <th className="px-4 py-3 text-left">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "기간", "period", "Giai đoạn", "期間", "时期", "時期", "período", "período", "période", "Zeitraum", "период"), "period", "Giai đoạn", "期間", "时期", "時期", "período", "período", "période", "Zeitraum", "период"), "period", "Giai đoạn", "期間", "时期", "時期", "período", "período", "période", "Zeitraum", "период"), "period", "Giai đoạn", "期間", "时期", "時期", "período", "período", "période", "Zeitraum", "период")}</th>
                      <th className="px-4 py-3 text-left">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "사유", "reason", "lý do", "理由", "原因", "原因", "razón", "razão", "raison", "Grund", "причина"), "reason", "lý do", "理由", "原因", "原因", "razón", "razão", "raison", "Grund", "причина"), "reason", "lý do", "理由", "原因", "原因", "razón", "razão", "raison", "Grund", "причина"), "reason", "lý do", "理由", "原因", "原因", "razón", "razão", "raison", "Grund", "причина")}</th>
                      <th className="px-4 py-3 text-left">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "상태", "situation", "tình huống", "状態", "情况", "情況", "situación", "situação", "situation", "Situation", "ситуация"), "situation", "tình huống", "状態", "情况", "情況", "situación", "situação", "situation", "Situation", "ситуация"), "situation", "tình huống", "状態", "情况", "情況", "situación", "situação", "situation", "Situation", "ситуация"), "situation", "tình huống", "状態", "情况", "情況", "situación", "situação", "situation", "Situation", "ситуация")}</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{r.tenant_staff?.name}</td>
                        <td className="px-4 py-3">{r.leave_type}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.start_date} ~ {r.end_date}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{r.reason}</td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_BADGE[r.status] || ""}>
                            {r.status === "pending" ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "대기", "atmosphere", "bầu không khí", "大気", "气氛", "氣氛", "atmósfera", "atmosfera", "atmosphère", "Atmosphäre", "атмосфера"), "atmosphere", "bầu không khí", "大気", "气氛", "氣氛", "atmósfera", "atmosfera", "atmosphère", "Atmosphäre", "атмосфера"), "atmosphere", "bầu không khí", "大気", "气氛", "氣氛", "atmósfera", "atmosfera", "atmosphère", "Atmosphäre", "атмосфера"), "atmosphere", "bầu không khí", "大気", "气氛", "氣氛", "atmósfera", "atmosfera", "atmosphère", "Atmosphäre", "атмосфера") : r.status === "approved" ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "승인", "approval", "sự chấp thuận", "承認", "赞同", "贊同", "aprobación", "aprovação", "approbation", "Genehmigung", "одобрение"), "approval", "sự chấp thuận", "承認", "赞同", "贊同", "aprobación", "aprovação", "approbation", "Genehmigung", "одобрение"), "approval", "sự chấp thuận", "承認", "赞同", "贊同", "aprobación", "aprovação", "approbation", "Genehmigung", "одобрение"), "approval", "sự chấp thuận", "承認", "赞同", "贊同", "aprobación", "aprovação", "approbation", "Genehmigung", "одобрение") : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "반려", "companion", "bạn đồng hành", "ペット", "伴侣", "伴侶", "compañero", "companheiro", "compagnon", "Begleiter", "компаньон"), "companion", "bạn đồng hành", "ペット", "伴侣", "伴侶", "compañero", "companheiro", "compagnon", "Begleiter", "компаньон"), "companion", "bạn đồng hành", "ペット", "伴侣", "伴侶", "compañero", "companheiro", "compagnon", "Begleiter", "компаньон"), "companion", "bạn đồng hành", "ペット", "伴侣", "伴侶", "compañero", "companheiro", "compagnon", "Begleiter", "компаньон")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {r.status === "pending" && (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => void updateStatus(r.id, "approved")}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => void updateStatus(r.id, "rejected")}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "휴가 등록", "leave registration", "nghỉ đăng ký", "休暇登録", "请假登记", "請假登記", "dejar registro", "deixar registro", "quitter l'enregistrement", "Anmeldung verlassen", "покинуть регистрацию"), "leave registration", "nghỉ đăng ký", "休暇登録", "请假登记", "請假登記", "dejar registro", "deixar registro", "quitter l'enregistrement", "Anmeldung verlassen", "покинуть регистрацию"), "leave registration", "nghỉ đăng ký", "休暇登録", "请假登记", "請假登記", "dejar registro", "deixar registro", "quitter l'enregistrement", "Anmeldung verlassen", "покинуть регистрацию"), "leave registration", "nghỉ đăng ký", "休暇登録", "请假登记", "請假登記", "dejar registro", "deixar registro", "quitter l'enregistrement", "Anmeldung verlassen", "покинуть регистрацию")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <select
              className="w-full h-9 border rounded-md px-3 text-sm"
              value={form.staffId}
              onChange={(e) => setForm({ ...form, staffId: e.target.value })}
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              className="w-full h-9 border rounded-md px-3 text-sm"
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value as LeaveType })}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <Input placeholder={pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "사유", "reason", "lý do", "理由", "原因", "原因", "razón", "razão", "raison", "Grund", "причина"), "reason", "lý do", "理由", "原因", "原因", "razón", "razão", "raison", "Grund", "причина"), "reason", "lý do", "理由", "原因", "原因", "razón", "razão", "raison", "Grund", "причина"), "reason", "lý do", "理由", "原因", "原因", "razón", "razão", "raison", "Grund", "причина")} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <Input placeholder={pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "비상 연락처", "emergency contact information", "thông tin liên lạc khẩn cấp", "緊急連絡先", "紧急联系信息", "緊急聯絡資訊", "información de contacto de emergencia", "informações de contato de emergência", "coordonnées d'urgence", "Kontaktinformationen für den Notfall", "контактная информация для экстренных случаев"), "emergency contact information", "thông tin liên lạc khẩn cấp", "緊急連絡先", "紧急联系信息", "緊急聯絡資訊", "información de contacto de emergencia", "informações de contato de emergência", "coordonnées d'urgence", "Kontaktinformationen für den Notfall", "контактная информация для экстренных случаев"), "emergency contact information", "thông tin liên lạc khẩn cấp", "緊急連絡先", "紧急联系信息", "緊急聯絡資訊", "información de contacto de emergencia", "informações de contato de emergência", "coordonnées d'urgence", "Kontaktinformationen für den Notfall", "контактная информация для экстренных случаев"), "emergency contact information", "thông tin liên lạc khẩn cấp", "緊急連絡先", "紧急联系信息", "緊急聯絡資訊", "información de contacto de emergencia", "informações de contato de emergência", "coordonnées d'urgence", "Kontaktinformationen für den Notfall", "контактная информация для экстренных случаев")} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "취소", "cancellation", "hủy bỏ", "キャンセル", "消除", "消除", "cancelación", "cancelamento", "annulation", "Stornierung", "отмена"), "cancellation", "hủy bỏ", "キャンセル", "消除", "消除", "cancelación", "cancelamento", "annulation", "Stornierung", "отмена"), "cancellation", "hủy bỏ", "キャンセル", "消除", "消除", "cancelación", "cancelamento", "annulation", "Stornierung", "отмена"), "cancellation", "hủy bỏ", "キャンセル", "消除", "消除", "cancelación", "cancelamento", "annulation", "Stornierung", "отмена")}</Button>
            <Button onClick={() => void submitLeave()} disabled={saving}>
              {saving ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "등록 중...", "Registering...", "Đang đăng ký...", "登録中...", "注册...", "註冊...", "Registrando...", "Registrando...", "Enregistrement...", "Registrieren...", "Регистрация..."), "Registering...", "Đang đăng ký...", "登録中...", "注册...", "註冊...", "Registrando...", "Registrando...", "Enregistrement...", "Registrieren...", "Регистрация..."), "Registering...", "Đang đăng ký...", "登録中...", "注册...", "註冊...", "Registrando...", "Registrando...", "Enregistrement...", "Registrieren...", "Регистрация..."), "Registering...", "Đang đăng ký...", "登録中...", "注册...", "註冊...", "Registrando...", "Registrando...", "Enregistrement...", "Registrieren...", "Регистрация...") : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "등록", "registration", "sự đăng ký", "登録", "登记", "登記", "registro", "registro", "inscription", "Anmeldung", "регистрация"), "registration", "sự đăng ký", "登録", "登记", "登記", "registro", "registro", "inscription", "Anmeldung", "регистрация"), "registration", "sự đăng ký", "登録", "登记", "登記", "registro", "registro", "inscription", "Anmeldung", "регистрация"), "registration", "sự đăng ký", "登録", "登记", "登記", "registro", "registro", "inscription", "Anmeldung", "регистрация")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
