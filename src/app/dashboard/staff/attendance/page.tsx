"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StaffSubNav } from "@/app/dashboard/staff/components/staff-sub-nav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, RefreshCw, Clock, UserCheck, Plus, Trash2, Timer, FileDown } from "lucide-react";
import { exportStaffAttendanceToExcel } from "@/lib/staff-hr-excel";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import {
  buildDailyAttendanceRows,
  formatTimeLabel,
  formatWorkHours,
  summarizeStaffWorkHours,
  type AttendanceLogDetail,
} from "@/lib/staff-attendance-hours";

export default function StaffAttendancePage() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);

  const { tenantId, canManageStaff, isLoading: authLoading } = useAuth();
  const { settings, saveSettings } = useSettings();
  const [logs, setLogs] = useState<AttendanceLogDetail[]>([]);
  const [hoursLogs, setHoursLogs] = useState<AttendanceLogDetail[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [breakSavingKey, setBreakSavingKey] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(today);
  const [selectedStaff, setSelectedStaff] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [addStaffId, setAddStaffId] = useState("");
  const [addType, setAddType] = useState<"clock_in" | "clock_out">("clock_in");
  const [addDate, setAddDate] = useState(today);
  const [addTime, setAddTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [addSaving, setAddSaving] = useState(false);

  const fetchHoursLogs = async () => {
    if (!tenantId) return;
    try {
      const supabase = createClient();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const { data, error } = await supabase
        .from("staff_attendance_logs")
        .select("id, staff_id, type, recorded_at")
        .eq("tenant_id", tenantId)
        .gte("recorded_at", monthStart.toISOString())
        .order("recorded_at", { ascending: true })
        .limit(2000);
      if (error) throw error;
      setHoursLogs((data || []) as AttendanceLogDetail[]);
    } catch {
      // ignore
    }
  };

  const fetchLogs = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: staffData } = await supabase
        .from("tenant_staff")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .order("name");
      setStaffList(staffData || []);

      const fromTs = new Date(dateFrom + "T00:00:00").toISOString();
      const toTs = new Date(dateTo + "T23:59:59").toISOString();
      let query = supabase
        .from("staff_attendance_logs")
        .select(`id, staff_id, type, recorded_at, tenant_staff ( name )`)
        .eq("tenant_id", tenantId)
        .gte("recorded_at", fromTs)
        .lte("recorded_at", toTs)
        .order("recorded_at", { ascending: false })
        .limit(500);
      if (selectedStaff !== "all") query = query.eq("staff_id", selectedStaff);
      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []) as unknown as AttendanceLogDetail[]);
    } catch {
      toast.error(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "근태 기록을 불러오지 못했습니다.", "Failed to load attendance record.", "Không thể tải hồ sơ điểm danh.", "勤怠記録を読み込めませんでした。", "加载考勤记录失败。", "加載考勤記錄失敗。", "No se pudo cargar el registro de asistencia.", "Falha ao carregar registro de presença.", "Échec du chargement des enregistrements de présence.", "Anwesenheitsdatensatz konnte nicht geladen werden.", "Не удалось загрузить запись посещаемости."), "Failed to load attendance record.", "Không thể tải hồ sơ điểm danh.", "勤怠記録を読み込めませんでした。", "加载考勤记录失败。", "加載考勤記錄失敗。", "No se pudo cargar el registro de asistencia.", "Falha ao carregar registro de presença.", "Échec du chargement des enregistrements de présence.", "Anwesenheitsdatensatz konnte nicht geladen werden.", "Не удалось загрузить запись посещаемости."), "Failed to load attendance record.", "Không thể tải hồ sơ điểm danh.", "勤怠記録を読み込めませんでした。", "加载考勤记录失败。", "加載考勤記錄失敗。", "No se pudo cargar el registro de asistencia.", "Falha ao carregar registro de presença.", "Échec du chargement des enregistrements de présence.", "Anwesenheitsdatensatz konnte nicht geladen werden.", "Не удалось загрузить запись посещаемости."), "Failed to load attendance record.", "Không thể tải hồ sơ điểm danh.", "勤怠記録を読み込めませんでした。", "加载考勤记录失败。", "加載考勤記錄失敗。", "No se pudo cargar el registro de asistencia.", "Falha ao carregar registro de presença.", "Échec du chargement des enregistrements de présence.", "Anwesenheitsdatensatz konnte nicht geladen werden.", "Не удалось загрузить запись посещаемости."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      void fetchLogs();
      void fetchHoursLogs();
    }
  }, [tenantId]);

  const dayBreaks = settings?.attendanceDayBreaks ?? {};
  const monthDailyRows = useMemo(
    () => buildDailyAttendanceRows(hoursLogs, { dayBreaks }),
    [hoursLogs, dayBreaks],
  );
  const dailyRows = useMemo(
    () => buildDailyAttendanceRows(logs, { dayBreaks }),
    [logs, dayBreaks],
  );

  const staffHoursCards = useMemo(() => {
    const hoursByStaff = new Map(
      summarizeStaffWorkHours(monthDailyRows, hoursLogs).map((item) => [item.staffId, item]),
    );
    return staffList.map((staff) => {
      const hours = hoursByStaff.get(staff.id);
      return {
        staffId: staff.id,
        name: staff.name,
        todayMinutes: hours?.todayMinutes ?? 0,
        weekMinutes: hours?.weekMinutes ?? 0,
        monthMinutes: hours?.monthMinutes ?? 0,
        clockIns: hours?.clockIns ?? 0,
        clockOuts: hours?.clockOuts ?? 0,
        openShift: hours?.openShift ?? false,
      };
    });
  }, [monthDailyRows, hoursLogs, staffList]);

  const handleBreakToggle = async (
    rowKey: string,
    field: "tookLunch" | "tookDinner",
    checked: boolean,
  ) => {
    if (!settings) return;
    setBreakSavingKey(`${rowKey}:${field}`);
    try {
      const current = { ...(settings.attendanceDayBreaks ?? {}) };
      const prev = current[rowKey] ?? { tookLunch: false, tookDinner: false };
      const nextFlags = { ...prev, [field]: checked };
      if (!nextFlags.tookLunch && !nextFlags.tookDinner) delete current[rowKey];
      else current[rowKey] = nextFlags;
      await saveSettings({ ...settings, attendanceDayBreaks: current });
    } catch {
      toast.error(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "휴게 시간 저장에 실패했습니다.", "Failed to save break time.", "Không lưu được thời gian giải lao.", "休憩時間の保存に失敗しました。", "未能节省休息时间。", "未能節省休息時間。", "No se pudo ahorrar el tiempo de descanso.", "Falha ao salvar o tempo de intervalo.", "Échec de la sauvegarde du temps de pause.", "Pausenzeit konnte nicht gespeichert werden.", "Не удалось сохранить время перерыва."), "Failed to save break time.", "Không lưu được thời gian giải lao.", "休憩時間の保存に失敗しました。", "未能节省休息时间。", "未能節省休息時間。", "No se pudo ahorrar el tiempo de descanso.", "Falha ao salvar o tempo de intervalo.", "Échec de la sauvegarde du temps de pause.", "Pausenzeit konnte nicht gespeichert werden.", "Не удалось сохранить время перерыва."), "Failed to save break time.", "Không lưu được thời gian giải lao.", "休憩時間の保存に失敗しました。", "未能节省休息时间。", "未能節省休息時間。", "No se pudo ahorrar el tiempo de descanso.", "Falha ao salvar o tempo de intervalo.", "Échec de la sauvegarde du temps de pause.", "Pausenzeit konnte nicht gespeichert werden.", "Не удалось сохранить время перерыва."), "Failed to save break time.", "Không lưu được thời gian giải lao.", "休憩時間の保存に失敗しました。", "未能节省休息时间。", "未能節省休息時間。", "No se pudo ahorrar el tiempo de descanso.", "Falha ao salvar o tempo de intervalo.", "Échec de la sauvegarde du temps de pause.", "Pausenzeit konnte nicht gespeichert werden.", "Не удалось сохранить время перерыва."));
    } finally {
      setBreakSavingKey(null);
    }
  };

  const handleAddRecord = async () => {
    if (!addStaffId || !addDate || !addTime) {
      toast.error(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원, 날짜, 시간을 모두 입력해주세요.", "Please enter the employee, date, and time.", "Vui lòng nhập nhân viên, ngày và giờ.", "スタッフ、日付、時刻をすべて入力してください。", "请输入员工、日期和时间。", "請輸入員工、日期和時間。", "Por favor ingrese el empleado, fecha y hora.", "Insira o funcionário, data e hora.", "Veuillez saisir l'employé, la date et l'heure.", "Bitte geben Sie den Mitarbeiter, Datum und Uhrzeit ein.", "Укажите сотрудника, дату и время."), "Please enter the employee, date, and time.", "Vui lòng nhập nhân viên, ngày và giờ.", "スタッフ、日付、時刻をすべて入力してください。", "请输入员工、日期和时间。", "請輸入員工、日期和時間。", "Por favor ingrese el empleado, fecha y hora.", "Insira o funcionário, data e hora.", "Veuillez saisir l'employé, la date et l'heure.", "Bitte geben Sie den Mitarbeiter, Datum und Uhrzeit ein.", "Укажите сотрудника, дату и время."), "Please enter the employee, date, and time.", "Vui lòng nhập nhân viên, ngày và giờ.", "スタッフ、日付、時刻をすべて入力してください。", "请输入员工、日期和时间。", "請輸入員工、日期和時間。", "Por favor ingrese el empleado, fecha y hora.", "Insira o funcionário, data e hora.", "Veuillez saisir l'employé, la date et l'heure.", "Bitte geben Sie den Mitarbeiter, Datum und Uhrzeit ein.", "Укажите сотрудника, дату и время."), "Please enter the employee, date, and time.", "Vui lòng nhập nhân viên, ngày và giờ.", "スタッフ、日付、時刻をすべて入力してください。", "请输入员工、日期和时间。", "請輸入員工、日期和時間。", "Por favor ingrese el empleado, fecha y hora.", "Insira o funcionário, data e hora.", "Veuillez saisir l'employé, la date et l'heure.", "Bitte geben Sie den Mitarbeiter, Datum und Uhrzeit ein.", "Укажите сотрудника, дату и время."));
      return;
    }
    setAddSaving(true);
    try {
      const supabase = createClient();
      const recorded_at = new Date(`${addDate}T${addTime}:00`).toISOString();
      const { error } = await supabase.from("staff_attendance_logs").insert({
        tenant_id: tenantId,
        staff_id: addStaffId,
        type: addType,
        recorded_at,
      });
      if (error) throw error;
      toast.success(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "기록이 추가되었습니다.", "A record has been added.", "Một bản ghi đã được thêm vào.", "履歴が追加されました。", "已添加一条记录。", "已新增一筆記錄。", "Se ha agregado un registro.", "Um registro foi adicionado.", "Un enregistrement a été ajouté.", "Ein Datensatz wurde hinzugefügt.", "Запись добавлена."), "A record has been added.", "Một bản ghi đã được thêm vào.", "履歴が追加されました。", "已添加一条记录。", "已新增一筆記錄。", "Se ha agregado un registro.", "Um registro foi adicionado.", "Un enregistrement a été ajouté.", "Ein Datensatz wurde hinzugefügt.", "Запись добавлена."), "A record has been added.", "Một bản ghi đã được thêm vào.", "履歴が追加されました。", "已添加一条记录。", "已新增一筆記錄。", "Se ha agregado un registro.", "Um registro foi adicionado.", "Un enregistrement a été ajouté.", "Ein Datensatz wurde hinzugefügt.", "Запись добавлена."), "A record has been added.", "Một bản ghi đã được thêm vào.", "履歴が追加されました。", "已添加一条记录。", "已新增一筆記錄。", "Se ha agregado un registro.", "Um registro foi adicionado.", "Un enregistrement a été ajouté.", "Ein Datensatz wurde hinzugefügt.", "Запись добавлена."));
      setAddOpen(false);
      void fetchLogs();
      void fetchHoursLogs();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "추가에 실패했습니다.", "Addition failed.", "Việc bổ sung không thành công.", "追加に失敗しました。", "添加失败。", "新增失敗。", "La suma falló.", "Falha na adição.", "L'ajout a échoué.", "Das Hinzufügen ist fehlgeschlagen.", "Добавление не удалось."), "Addition failed.", "Việc bổ sung không thành công.", "追加に失敗しました。", "添加失败。", "新增失敗。", "La suma falló.", "Falha na adição.", "L'ajout a échoué.", "Das Hinzufügen ist fehlgeschlagen.", "Добавление не удалось."), "Addition failed.", "Việc bổ sung không thành công.", "追加に失敗しました。", "添加失败。", "新增失敗。", "La suma falló.", "Falha na adição.", "L'ajout a échoué.", "Das Hinzufügen ist fehlgeschlagen.", "Добавление не удалось."), "Addition failed.", "Việc bổ sung không thành công.", "追加に失敗しました。", "添加失败。", "新增失敗。", "La suma falló.", "Falha na adição.", "L'ajout a échoué.", "Das Hinzufügen ist fehlgeschlagen.", "Добавление не удалось.");
      toast.error(message);
    } finally {
      setAddSaving(false);
    }
  };

  const handleDeleteDay = async (logIds: string[]) => {
    if (!confirm(`이 날짜의 출퇴근 기록 ${logIds.length}건을 삭제하시겠습니까?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("staff_attendance_logs").delete().in("id", logIds);
      if (error) throw error;
      toast.success(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "기록이 삭제되었습니다.", "The record has been deleted.", "Bản ghi đã bị xóa.", "履歴が削除されました。", "该记录已被删除。", "該記錄已被刪除。", "El registro ha sido eliminado.", "O registro foi excluído.", "L'enregistrement a été supprimé.", "Der Datensatz wurde gelöscht.", "Запись удалена."), "The record has been deleted.", "Bản ghi đã bị xóa.", "履歴が削除されました。", "该记录已被删除。", "該記錄已被刪除。", "El registro ha sido eliminado.", "O registro foi excluído.", "L'enregistrement a été supprimé.", "Der Datensatz wurde gelöscht.", "Запись удалена."), "The record has been deleted.", "Bản ghi đã bị xóa.", "履歴が削除されました。", "该记录已被删除。", "該記錄已被刪除。", "El registro ha sido eliminado.", "O registro foi excluído.", "L'enregistrement a été supprimé.", "Der Datensatz wurde gelöscht.", "Запись удалена."), "The record has been deleted.", "Bản ghi đã bị xóa.", "履歴が削除されました。", "该记录已被删除。", "該記錄已被刪除。", "El registro ha sido eliminado.", "O registro foi excluído.", "L'enregistrement a été supprimé.", "Der Datensatz wurde gelöscht.", "Запись удалена."));
      void fetchLogs();
      void fetchHoursLogs();
    } catch {
      toast.error(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "삭제에 실패했습니다.", "Deletion failed.", "Xóa không thành công.", "削除に失敗しました。", "删除失败。", "刪除失敗。", "La eliminación falló.", "Falha na exclusão.", "La suppression a échoué.", "Das Löschen ist fehlgeschlagen.", "Удаление не удалось."), "Deletion failed.", "Xóa không thành công.", "削除に失敗しました。", "删除失败。", "刪除失敗。", "La eliminación falló.", "Falha na exclusão.", "La suppression a échoué.", "Das Löschen ist fehlgeschlagen.", "Удаление не удалось."), "Deletion failed.", "Xóa không thành công.", "削除に失敗しました。", "删除失败。", "刪除失敗。", "La eliminación falló.", "Falha na exclusão.", "La suppression a échoué.", "Das Löschen ist fehlgeschlagen.", "Удаление не удалось."), "Deletion failed.", "Xóa không thành công.", "削除に失敗しました。", "删除失败。", "刪除失敗。", "La eliminación falló.", "Falha na exclusão.", "La suppression a échoué.", "Das Löschen ist fehlgeschlagen.", "Удаление не удалось."));
    }
  };

  if (authLoading) return <div className="p-8 text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "불러오는 중...", "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка...")}</div>;
  if (!canManageStaff) {
    return <div className="p-8 text-slate-600">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "접근 권한이 없습니다. 점주 계정으로 로그인했는지 확인해주세요.", "You do not have access permission. Please make sure you are logged in with your store owner account.", "Bạn không có quyền truy cập. Vui lòng đảm bảo rằng bạn đã đăng nhập bằng tài khoản chủ cửa hàng của mình.", "アクセス権がありません。 店主アカウントでログインしていることを確認してください。", "您没有访问权限。 请确保您使用店主帐户登录。", "您沒有存取權限。 請確保您使用店主帳號登入。", "No tienes permiso de acceso. Asegúrese de haber iniciado sesión con su cuenta de propietario de tienda.", "Você não tem permissão de acesso. Certifique-se de estar conectado com sua conta de proprietário da loja.", "Vous n'avez pas d'autorisation d'accès. Veuillez vous assurer que vous êtes connecté avec votre compte de propriétaire de magasin.", "Sie haben keine Zugriffsberechtigung. Bitte stellen Sie sicher, dass Sie mit Ihrem Shop-Inhaberkonto angemeldet sind.", "У вас нет разрешения на доступ. Пожалуйста, убедитесь, что вы вошли в свою учетную запись владельца магазина."), "You do not have access permission. Please make sure you are logged in with your store owner account.", "Bạn không có quyền truy cập. Vui lòng đảm bảo rằng bạn đã đăng nhập bằng tài khoản chủ cửa hàng của mình.", "アクセス権がありません。 店主アカウントでログインしていることを確認してください。", "您没有访问权限。 请确保您使用店主帐户登录。", "您沒有存取權限。 請確保您使用店主帳號登入。", "No tienes permiso de acceso. Asegúrese de haber iniciado sesión con su cuenta de propietario de tienda.", "Você não tem permissão de acesso. Certifique-se de estar conectado com sua conta de proprietário da loja.", "Vous n'avez pas d'autorisation d'accès. Veuillez vous assurer que vous êtes connecté avec votre compte de propriétaire de magasin.", "Sie haben keine Zugriffsberechtigung. Bitte stellen Sie sicher, dass Sie mit Ihrem Shop-Inhaberkonto angemeldet sind.", "У вас нет разрешения на доступ. Пожалуйста, убедитесь, что вы вошли в свою учетную запись владельца магазина."), "You do not have access permission. Please make sure you are logged in with your store owner account.", "Bạn không có quyền truy cập. Vui lòng đảm bảo rằng bạn đã đăng nhập bằng tài khoản chủ cửa hàng của mình.", "アクセス権がありません。 店主アカウントでログインしていることを確認してください。", "您没有访问权限。 请确保您使用店主帐户登录。", "您沒有存取權限。 請確保您使用店主帳號登入。", "No tienes permiso de acceso. Asegúrese de haber iniciado sesión con su cuenta de propietario de tienda.", "Você não tem permissão de acesso. Certifique-se de estar conectado com sua conta de proprietário da loja.", "Vous n'avez pas d'autorisation d'accès. Veuillez vous assurer que vous êtes connecté avec votre compte de propriétaire de magasin.", "Sie haben keine Zugriffsberechtigung. Bitte stellen Sie sicher, dass Sie mit Ihrem Shop-Inhaberkonto angemeldet sind.", "У вас нет разрешения на доступ. Пожалуйста, убедитесь, что вы вошли в свою учетную запись владельца магазина."), "You do not have access permission. Please make sure you are logged in with your store owner account.", "Bạn không có quyền truy cập. Vui lòng đảm bảo rằng bạn đã đăng nhập bằng tài khoản chủ cửa hàng của mình.", "アクセス権がありません。 店主アカウントでログインしていることを確認してください。", "您没有访问权限。 请确保您使用店主帐户登录。", "您沒有存取權限。 請確保您使用店主帳號登入。", "No tienes permiso de acceso. Asegúrese de haber iniciado sesión con su cuenta de propietario de tienda.", "Você não tem permissão de acesso. Certifique-se de estar conectado com sua conta de proprietário da loja.", "Vous n'avez pas d'autorisation d'accès. Veuillez vous assurer que vous êtes connecté avec votre compte de propriétaire de magasin.", "Sie haben keine Zugriffsberechtigung. Bitte stellen Sie sicher, dass Sie mit Ihrem Shop-Inhaberkonto angemeldet sind.", "У вас нет разрешения на доступ. Пожалуйста, убедитесь, что вы вошли в свою учетную запись владельца магазина.")}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "출퇴근 기록", "attendance record", "kỷ lục tham dự", "出退勤記録", "出勤记录", "出勤記錄", "registro de asistencia", "recorde de presença", "relevé de présence", "Anwesenheitsliste", "запись посещаемости"), "attendance record", "kỷ lục tham dự", "出退勤記録", "出勤记录", "出勤記錄", "registro de asistencia", "recorde de presença", "relevé de présence", "Anwesenheitsliste", "запись посещаемости"), "attendance record", "kỷ lục tham dự", "出退勤記録", "出勤记录", "出勤記錄", "registro de asistencia", "recorde de presença", "relevé de présence", "Anwesenheitsliste", "запись посещаемости"), "attendance record", "kỷ lục tham dự", "出退勤記録", "出勤记录", "出勤記錄", "registro de asistencia", "recorde de presença", "relevé de présence", "Anwesenheitsliste", "запись посещаемости")}</h1>
        <p className="text-sm text-slate-500 mt-1">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "일별 근무시간·휴게 관리", "Daily working hours and break management", "Quản lý giờ làm việc và nghỉ giải lao hàng ngày", "日別勤務時間・休憩管理", "每日工作时间及休息管理", "每日工作時間及休息管理", "Jornada laboral diaria y gestión de descansos.", "Horário de trabalho diário e gerenciamento de intervalos", "Horaires de travail quotidiens et gestion des pauses", "Tägliche Arbeitszeiten und Pausenmanagement", "Ежедневное рабочее время и управление перерывами"), "Daily working hours and break management", "Quản lý giờ làm việc và nghỉ giải lao hàng ngày", "日別勤務時間・休憩管理", "每日工作时间及休息管理", "每日工作時間及休息管理", "Jornada laboral diaria y gestión de descansos.", "Horário de trabalho diário e gerenciamento de intervalos", "Horaires de travail quotidiens et gestion des pauses", "Tägliche Arbeitszeiten und Pausenmanagement", "Ежедневное рабочее время и управление перерывами"), "Daily working hours and break management", "Quản lý giờ làm việc và nghỉ giải lao hàng ngày", "日別勤務時間・休憩管理", "每日工作时间及休息管理", "每日工作時間及休息管理", "Jornada laboral diaria y gestión de descansos.", "Horário de trabalho diário e gerenciamento de intervalos", "Horaires de travail quotidiens et gestion des pauses", "Tägliche Arbeitszeiten und Pausenmanagement", "Ежедневное рабочее время и управление перерывами"), "Daily working hours and break management", "Quản lý giờ làm việc và nghỉ giải lao hàng ngày", "日別勤務時間・休憩管理", "每日工作时间及休息管理", "每日工作時間及休息管理", "Jornada laboral diaria y gestión de descansos.", "Horário de trabalho diário e gerenciamento de intervalos", "Horaires de travail quotidiens et gestion des pauses", "Tägliche Arbeitszeiten und Pausenmanagement", "Ежедневное рабочее время и управление перерывами")}</p>
      </div>

      <div className="p-4 md:p-6 space-y-4 flex-1 overflow-auto">
        <StaffSubNav />

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "시작일", "start date", "ngày bắt đầu", "開始日", "开始日期", "開始日期", "fecha de inicio", "data de início", "date de début", "Startdatum", "Дата начала"), "start date", "ngày bắt đầu", "開始日", "开始日期", "開始日期", "fecha de inicio", "data de início", "date de début", "Startdatum", "Дата начала"), "start date", "ngày bắt đầu", "開始日", "开始日期", "開始日期", "fecha de inicio", "data de início", "date de début", "Startdatum", "Дата начала"), "start date", "ngày bắt đầu", "開始日", "开始日期", "開始日期", "fecha de inicio", "data de início", "date de début", "Startdatum", "Дата начала")}</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-36 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "종료일", "End date", "Ngày kết thúc", "終了日", "结束日期", "結束日期", "Fecha de finalización", "Data de término", "Date de fin", "Enddatum", "Дата окончания"), "End date", "Ngày kết thúc", "終了日", "结束日期", "結束日期", "Fecha de finalización", "Data de término", "Date de fin", "Enddatum", "Дата окончания"), "End date", "Ngày kết thúc", "終了日", "结束日期", "結束日期", "Fecha de finalización", "Data de término", "Date de fin", "Enddatum", "Дата окончания"), "End date", "Ngày kết thúc", "終了日", "结束日期", "結束日期", "Fecha de finalización", "Data de término", "Date de fin", "Enddatum", "Дата окончания")}</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-36 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원", "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник")}</label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="all">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "전체 직원", "total staff", "tổng số nhân viên", "全従業員", "员工总数", "員工總數", "personal total", "pessoal total", "effectif total", "Gesamtpersonal", "общий персонал"), "total staff", "tổng số nhân viên", "全従業員", "员工总数", "員工總數", "personal total", "pessoal total", "effectif total", "Gesamtpersonal", "общий персонал"), "total staff", "tổng số nhân viên", "全従業員", "员工总数", "員工總數", "personal total", "pessoal total", "effectif total", "Gesamtpersonal", "общий персонал"), "total staff", "tổng số nhân viên", "全従業員", "员工总数", "員工總數", "personal total", "pessoal total", "effectif total", "Gesamtpersonal", "общий персонал")}</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <Button onClick={() => void fetchLogs()} disabled={loading} className="h-9 gap-2">
                <Search className="w-4 h-4" />
                {loading ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "검색 중...", "Searching...", "Đang tìm kiếm...", "検索中...", "正在寻找...", "正在尋找...", "Búsqueda...", "Procurando...", "Recherche...", "Suche...", "Идет поиск..."), "Searching...", "Đang tìm kiếm...", "検索中...", "正在寻找...", "正在尋找...", "Búsqueda...", "Procurando...", "Recherche...", "Suche...", "Идет поиск..."), "Searching...", "Đang tìm kiếm...", "検索中...", "正在寻找...", "正在尋找...", "Búsqueda...", "Procurando...", "Recherche...", "Suche...", "Идет поиск..."), "Searching...", "Đang tìm kiếm...", "検索中...", "正在寻找...", "正在尋找...", "Búsqueda...", "Procurando...", "Recherche...", "Suche...", "Идет поиск...") : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "검색", "search", "tìm kiếm", "検索", "搜索", "搜尋", "buscar", "procurar", "recherche", "suchen", "поиск"), "search", "tìm kiếm", "検索", "搜索", "搜尋", "buscar", "procurar", "recherche", "suchen", "поиск"), "search", "tìm kiếm", "検索", "搜索", "搜尋", "buscar", "procurar", "recherche", "suchen", "поиск"), "search", "tìm kiếm", "検索", "搜索", "搜尋", "buscar", "procurar", "recherche", "suchen", "поиск")}
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-2"
                disabled={dailyRows.length === 0}
                onClick={() =>
                  void exportStaffAttendanceToExcel(dailyRows, dateFrom, dateTo)
                }
              >
                <FileDown className="w-4 h-4" />
               {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "엑셀", "excel", "vượt trội", "エクセル", "卓越", "卓越", "sobresalir", "excel", "exceller", "übertreffen", "превосходить"), "excel", "vượt trội", "エクセル", "卓越", "卓越", "sobresalir", "excel", "exceller", "übertreffen", "превосходить"), "excel", "vượt trội", "エクセル", "卓越", "卓越", "sobresalir", "excel", "exceller", "übertreffen", "превосходить"), "excel", "vượt trội", "エクセル", "卓越", "卓越", "sobresalir", "excel", "exceller", "übertreffen", "превосходить")}셀
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-2 ml-auto border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                onClick={() => {
                  setAddStaffId(staffList[0]?.id || "");
                  setAddDate(today);
                  setAddTime(new Date().toTimeString().slice(0, 5));
                  setAddType("clock_in");
                  setAddOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
               {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "수동 기록 추가", "Add manual records", "Thêm bản ghi thủ công", "手動履歴の追加", "添加手动记录", "新增手動記錄", "Agregar registros manuales", "Adicionar registros manuais", "Ajouter des enregistrements manuels", "Fügen Sie manuelle Datensätze hinzu", "Добавить записи вручную"), "Add manual records", "Thêm bản ghi thủ công", "手動履歴の追加", "添加手动记录", "新增手動記錄", "Agregar registros manuales", "Adicionar registros manuais", "Ajouter des enregistrements manuels", "Fügen Sie manuelle Datensätze hinzu", "Добавить записи вручную"), "Add manual records", "Thêm bản ghi thủ công", "手動履歴の追加", "添加手动记录", "新增手動記錄", "Agregar registros manuales", "Adicionar registros manuais", "Ajouter des enregistrements manuels", "Fügen Sie manuelle Datensätze hinzu", "Добавить записи вручную"), "Add manual records", "Thêm bản ghi thủ công", "手動履歴の追加", "添加手动记录", "新增手動記錄", "Agregar registros manuales", "Adicionar registros manuais", "Ajouter des enregistrements manuels", "Fügen Sie manuelle Datensätze hinzu", "Добавить записи вручную")}가
              </Button>
            </div>
          </CardContent>
        </Card>

        {staffHoursCards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffHoursCards.map((staff) => (
              <Card key={staff.staffId} className={`border shadow-sm ${staff.openShift ? "border-orange-200 bg-orange-50/40" : "border-slate-200"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-sm truncate">{staff.name}</span>
                    </div>
                    {staff.openShift && <Badge className="bg-orange-100 text-orange-700 border-none text-xs">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "근무 중", "working", "đang làm việc", "勤務中", "在职的", "在職的", "laboral", "trabalhando", "fonctionnement", "Arbeiten", "работающий"), "working", "đang làm việc", "勤務中", "在职的", "在職的", "laboral", "trabalhando", "fonctionnement", "Arbeiten", "работающий"), "working", "đang làm việc", "勤務中", "在职的", "在職的", "laboral", "trabalhando", "fonctionnement", "Arbeiten", "работающий"), "working", "đang làm việc", "勤務中", "在职的", "在職的", "laboral", "trabalhando", "fonctionnement", "Arbeiten", "работающий")}</Badge>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "오늘", "today", "Hôm nay", "今日", "今天", "今天", "hoy", "hoje", "aujourd'hui", "Heute", "сегодня"), "today", "Hôm nay", "今日", "今天", "今天", "hoy", "hoje", "aujourd'hui", "Heute", "сегодня"), "today", "Hôm nay", "今日", "今天", "今天", "hoy", "hoje", "aujourd'hui", "Heute", "сегодня"), "today", "Hôm nay", "今日", "今天", "今天", "hoy", "hoje", "aujourd'hui", "Heute", "сегодня"), minutes: staff.todayMinutes },
                      { label: pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "이번 주", "this week", "tuần này", "今週", "本星期", "本星期", "esta semana", "essa semana", "cette semaine", "diese Woche", "На этой неделе"), "this week", "tuần này", "今週", "本星期", "本星期", "esta semana", "essa semana", "cette semaine", "diese Woche", "На этой неделе"), "this week", "tuần này", "今週", "本星期", "本星期", "esta semana", "essa semana", "cette semaine", "diese Woche", "На этой неделе"), "this week", "tuần này", "今週", "本星期", "本星期", "esta semana", "essa semana", "cette semaine", "diese Woche", "На этой неделе"), minutes: staff.weekMinutes },
                      { label: pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "이번 달", "this month", "tháng này", "今月", "本月", "本月", "este mes", "este mês", "ce mois-ci", "diesen Monat", "в этом месяце"), "this month", "tháng này", "今月", "本月", "本月", "este mes", "este mês", "ce mois-ci", "diesen Monat", "в этом месяце"), "this month", "tháng này", "今月", "本月", "本月", "este mes", "este mês", "ce mois-ci", "diesen Monat", "в этом месяце"), "this month", "tháng này", "今月", "本月", "本月", "este mes", "este mês", "ce mois-ci", "diesen Monat", "в этом месяце"), minutes: staff.monthMinutes },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-2 text-center">
                        <p className="text-[10px] font-medium text-slate-500">{item.label}</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5 flex items-center justify-center gap-1">
                          <Timer className="w-3 h-3 text-indigo-400" />
                          {formatWorkHours(item.minutes)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
               {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "일별 근무 기록", "daily work record", "hồ sơ công việc hàng ngày", "毎日の勤務履歴", "每日工作记录", "每日工作記錄", "registro de trabajo diario", "registro diário de trabalho", "relevé de travail quotidien", "tägliche Arbeitsaufzeichnung", "ежедневная запись о работе"), "daily work record", "hồ sơ công việc hàng ngày", "毎日の勤務履歴", "每日工作记录", "每日工作記錄", "registro de trabajo diario", "registro diário de trabalho", "relevé de travail quotidien", "tägliche Arbeitsaufzeichnung", "ежедневная запись о работе"), "daily work record", "hồ sơ công việc hàng ngày", "毎日の勤務履歴", "每日工作记录", "每日工作記錄", "registro de trabajo diario", "registro diário de trabalho", "relevé de travail quotidien", "tägliche Arbeitsaufzeichnung", "ежедневная запись о работе"), "daily work record", "hồ sơ công việc hàng ngày", "毎日の勤務履歴", "每日工作记录", "每日工作記錄", "registro de trabajo diario", "registro diário de trabalho", "relevé de travail quotidien", "tägliche Arbeitsaufzeichnung", "ежедневная запись о работе")}록
                <span className="text-slate-400 font-normal text-sm">({dailyRows.length}일)</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "점심·저녁 휴게 체크 시 각 1시간 차감 (미체크 = 전체 근무시간)", "1 hour deducted each time lunch and dinner breaks are checked (unchecked = total working hours)", "Trừ 1 giờ mỗi lần đánh dấu thời gian nghỉ trưa và ăn tối (không đánh dấu = tổng số giờ làm việc)", "ランチ・ディナー休憩チェック時各1時間差し引き（ミチェック＝全体勤務時間）", "每次勾选午餐和晚餐时间扣1小时（不勾选=总工作时间）", "每次勾選午餐和晚餐時間扣1小時（不勾選=總工作時間）", "Se deduce 1 hora cada vez que se marcan los descansos para el almuerzo y la cena (sin marcar = horas laborales totales)", "1 hora deduzida cada vez que os intervalos para almoço e jantar são marcados (desmarcado = total de horas de trabalho)", "1 heure déduite à chaque fois que les pauses déjeuner et dîner sont cochées (non cochée = heures totales de travail)", "Bei jeder Überprüfung der Mittags- und Abendpausen wird jeweils 1 Stunde abgezogen (nicht überprüft = Gesamtarbeitszeit)", "1 час вычитается каждый раз, когда отмечаются перерывы на обед и ужин (не отмечено = общее количество рабочих часов)"), "1 hour deducted each time lunch and dinner breaks are checked (unchecked = total working hours)", "Trừ 1 giờ mỗi lần đánh dấu thời gian nghỉ trưa và ăn tối (không đánh dấu = tổng số giờ làm việc)", "ランチ・ディナー休憩チェック時各1時間差し引き（ミチェック＝全体勤務時間）", "每次勾选午餐和晚餐时间扣1小时（不勾选=总工作时间）", "每次勾選午餐和晚餐時間扣1小時（不勾選=總工作時間）", "Se deduce 1 hora cada vez que se marcan los descansos para el almuerzo y la cena (sin marcar = horas laborales totales)", "1 hora deduzida cada vez que os intervalos para almoço e jantar são marcados (desmarcado = total de horas de trabalho)", "1 heure déduite à chaque fois que les pauses déjeuner et dîner sont cochées (non cochée = heures totales de travail)", "Bei jeder Überprüfung der Mittags- und Abendpausen wird jeweils 1 Stunde abgezogen (nicht überprüft = Gesamtarbeitszeit)", "1 час вычитается каждый раз, когда отмечаются перерывы на обед и ужин (не отмечено = общее количество рабочих часов)"), "1 hour deducted each time lunch and dinner breaks are checked (unchecked = total working hours)", "Trừ 1 giờ mỗi lần đánh dấu thời gian nghỉ trưa và ăn tối (không đánh dấu = tổng số giờ làm việc)", "ランチ・ディナー休憩チェック時各1時間差し引き（ミチェック＝全体勤務時間）", "每次勾选午餐和晚餐时间扣1小时（不勾选=总工作时间）", "每次勾選午餐和晚餐時間扣1小時（不勾選=總工作時間）", "Se deduce 1 hora cada vez que se marcan los descansos para el almuerzo y la cena (sin marcar = horas laborales totales)", "1 hora deduzida cada vez que os intervalos para almoço e jantar são marcados (desmarcado = total de horas de trabalho)", "1 heure déduite à chaque fois que les pauses déjeuner et dîner sont cochées (non cochée = heures totales de travail)", "Bei jeder Überprüfung der Mittags- und Abendpausen wird jeweils 1 Stunde abgezogen (nicht überprüft = Gesamtarbeitszeit)", "1 час вычитается каждый раз, когда отмечаются перерывы на обед и ужин (не отмечено = общее количество рабочих часов)"), "1 hour deducted each time lunch and dinner breaks are checked (unchecked = total working hours)", "Trừ 1 giờ mỗi lần đánh dấu thời gian nghỉ trưa và ăn tối (không đánh dấu = tổng số giờ làm việc)", "ランチ・ディナー休憩チェック時各1時間差し引き（ミチェック＝全体勤務時間）", "每次勾选午餐和晚餐时间扣1小时（不勾选=总工作时间）", "每次勾選午餐和晚餐時間扣1小時（不勾選=總工作時間）", "Se deduce 1 hora cada vez que se marcan los descansos para el almuerzo y la cena (sin marcar = horas laborales totales)", "1 hora deduzida cada vez que os intervalos para almoço e jantar são marcados (desmarcado = total de horas de trabalho)", "1 heure déduite à chaque fois que les pauses déjeuner et dîner sont cochées (non cochée = heures totales de travail)", "Bei jeder Überprüfung der Mittags- und Abendpausen wird jeweils 1 Stunde abgezogen (nicht überprüft = Gesamtarbeitszeit)", "1 час вычитается каждый раз, когда отмечаются перерывы на обед и ужин (не отмечено = общее количество рабочих часов)")}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { void fetchLogs(); void fetchHoursLogs(); }} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "불러오는 중...", "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка...")}</div>
            ) : dailyRows.length === 0 ? (
              <div className="p-8 text-center text-gray-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "해당 기간에 출퇴근 기록이 없습니다.", "There are no attendance records during that period.", "Không có hồ sơ tham dự trong thời gian đó.", "その期間に出退勤記録はありません。", "期间没有出勤记录。", "期間沒有出勤記錄。", "No existen registros de asistencia durante ese período.", "Não há registros de presença nesse período.", "Il n’y a aucun relevé de présence pendant cette période.", "In diesem Zeitraum liegen keine Anwesenheitslisten vor.", "Записей о посещаемости за этот период нет."), "There are no attendance records during that period.", "Không có hồ sơ tham dự trong thời gian đó.", "その期間に出退勤記録はありません。", "期间没有出勤记录。", "期間沒有出勤記錄。", "No existen registros de asistencia durante ese período.", "Não há registros de presença nesse período.", "Il n’y a aucun relevé de présence pendant cette période.", "In diesem Zeitraum liegen keine Anwesenheitslisten vor.", "Записей о посещаемости за этот период нет."), "There are no attendance records during that period.", "Không có hồ sơ tham dự trong thời gian đó.", "その期間に出退勤記録はありません。", "期间没有出勤记录。", "期間沒有出勤記錄。", "No existen registros de asistencia durante ese período.", "Não há registros de presença nesse período.", "Il n’y a aucun relevé de présence pendant cette période.", "In diesem Zeitraum liegen keine Anwesenheitslisten vor.", "Записей о посещаемости за этот период нет."), "There are no attendance records during that period.", "Không có hồ sơ tham dự trong thời gian đó.", "その期間に出退勤記録はありません。", "期间没有出勤记录。", "期間沒有出勤記錄。", "No existen registros de asistencia durante ese período.", "Não há registros de presença nesse período.", "Il n’y a aucun relevé de présence pendant cette période.", "In diesem Zeitraum liegen keine Anwesenheitslisten vor.", "Записей о посещаемости за этот период нет.")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "날짜", "date", "ngày", "日付", "日期", "日期", "fecha", "data", "date", "Datum", "дата"), "date", "ngày", "日付", "日期", "日期", "fecha", "data", "date", "Datum", "дата"), "date", "ngày", "日付", "日期", "日期", "fecha", "data", "date", "Datum", "дата"), "date", "ngày", "日付", "日期", "日期", "fecha", "data", "date", "Datum", "дата")}</th>
                      <th className="px-4 py-3 font-medium">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원", "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник")}</th>
                      <th className="px-4 py-3 font-medium">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "출근", "go to work", "đi làm", "出勤", "上班", "上班", "ir a trabajar", "ir trabalhar", "aller travailler", "geh zur Arbeit", "идти на работу"), "go to work", "đi làm", "出勤", "上班", "上班", "ir a trabajar", "ir trabalhar", "aller travailler", "geh zur Arbeit", "идти на работу"), "go to work", "đi làm", "出勤", "上班", "上班", "ir a trabajar", "ir trabalhar", "aller travailler", "geh zur Arbeit", "идти на работу"), "go to work", "đi làm", "出勤", "上班", "上班", "ir a trabajar", "ir trabalhar", "aller travailler", "geh zur Arbeit", "идти на работу")}</th>
                      <th className="px-4 py-3 font-medium">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "퇴근", "leave work", "nghỉ làm", "退勤", "下班", "下班", "dejar el trabajo", "sair do trabalho", "quitter le travail", "Arbeit verlassen", "уйти с работы"), "leave work", "nghỉ làm", "退勤", "下班", "下班", "dejar el trabajo", "sair do trabalho", "quitter le travail", "Arbeit verlassen", "уйти с работы"), "leave work", "nghỉ làm", "退勤", "下班", "下班", "dejar el trabajo", "sair do trabalho", "quitter le travail", "Arbeit verlassen", "уйти с работы"), "leave work", "nghỉ làm", "退勤", "下班", "下班", "dejar el trabajo", "sair do trabalho", "quitter le travail", "Arbeit verlassen", "уйти с работы")}</th>
                      <th className="px-4 py-3 font-medium text-center w-16">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "점심(1h)", "Lunch (1h)", "Bữa trưa (1h)", "ランチ（1h）", "午餐（1小时）", "午餐（1小時）", "Almuerzo (1h)", "Almoço (1h)", "Déjeuner (1h)", "Mittagessen (1h)", "Обед (1 час)"), "Lunch (1h)", "Bữa trưa (1h)", "ランチ（1h）", "午餐（1小时）", "午餐（1小時）", "Almuerzo (1h)", "Almoço (1h)", "Déjeuner (1h)", "Mittagessen (1h)", "Обед (1 час)"), "Lunch (1h)", "Bữa trưa (1h)", "ランチ（1h）", "午餐（1小时）", "午餐（1小時）", "Almuerzo (1h)", "Almoço (1h)", "Déjeuner (1h)", "Mittagessen (1h)", "Обед (1 час)"), "Lunch (1h)", "Bữa trưa (1h)", "ランチ（1h）", "午餐（1小时）", "午餐（1小時）", "Almuerzo (1h)", "Almoço (1h)", "Déjeuner (1h)", "Mittagessen (1h)", "Обед (1 час)")}</th>
                      <th className="px-4 py-3 font-medium text-center w-16">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "저녁(1h)", "Evening (1h)", "Buổi tối (1h)", "夕方(1h)", "晚上（1小时）", "晚上（1小時）", "Tarde (1h)", "Noite (1h)", "Soirée (1h)", "Abend (1h)", "Вечер (1 час)"), "Evening (1h)", "Buổi tối (1h)", "夕方(1h)", "晚上（1小时）", "晚上（1小時）", "Tarde (1h)", "Noite (1h)", "Soirée (1h)", "Abend (1h)", "Вечер (1 час)"), "Evening (1h)", "Buổi tối (1h)", "夕方(1h)", "晚上（1小时）", "晚上（1小時）", "Tarde (1h)", "Noite (1h)", "Soirée (1h)", "Abend (1h)", "Вечер (1 час)"), "Evening (1h)", "Buổi tối (1h)", "夕方(1h)", "晚上（1小时）", "晚上（1小時）", "Tarde (1h)", "Noite (1h)", "Soirée (1h)", "Abend (1h)", "Вечер (1 час)")}</th>
                      <th className="px-4 py-3 font-medium">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "실근무", "actual work", "công việc thực tế", "実務", "实际工作", "實際工作", "trabajo real", "trabalho real", "travail réel", "eigentliche Arbeit", "реальная работа"), "actual work", "công việc thực tế", "実務", "实际工作", "實際工作", "trabajo real", "trabalho real", "travail réel", "eigentliche Arbeit", "реальная работа"), "actual work", "công việc thực tế", "実務", "实际工作", "實際工作", "trabajo real", "trabalho real", "travail réel", "eigentliche Arbeit", "реальная работа"), "actual work", "công việc thực tế", "実務", "实际工作", "實際工作", "trabajo real", "trabalho real", "travail réel", "eigentliche Arbeit", "реальная работа")}</th>
                      <th className="px-4 py-3 font-medium">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "근무시간", "Working hours", "Giờ làm việc", "勤務時間", "工作时间", "工作時間", "Horas de trabajo", "Horas de trabalho", "Horaires de travail", "Arbeitszeit", "Рабочее время"), "Working hours", "Giờ làm việc", "勤務時間", "工作时间", "工作時間", "Horas de trabajo", "Horas de trabalho", "Horaires de travail", "Arbeitszeit", "Рабочее время"), "Working hours", "Giờ làm việc", "勤務時間", "工作时间", "工作時間", "Horas de trabajo", "Horas de trabalho", "Horaires de travail", "Arbeitszeit", "Рабочее время"), "Working hours", "Giờ làm việc", "勤務時間", "工作时间", "工作時間", "Horas de trabajo", "Horas de trabalho", "Horaires de travail", "Arbeitszeit", "Рабочее время")}</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyRows.map((row) => {
                      const date = new Date(row.dateKey + "T12:00:00");
                      const breakDisabled = !!breakSavingKey?.startsWith(row.key);
                      return (
                        <tr key={row.key} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", weekday: "short" })}
                          </td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{row.staffName}</td>
                          <td className="px-4 py-3 font-mono">{formatTimeLabel(row.clockIn)}</td>
                          <td className="px-4 py-3 font-mono">{row.openShift ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "근무 중", "working", "đang làm việc", "勤務中", "在职的", "在職的", "laboral", "trabalhando", "fonctionnement", "Arbeiten", "работающий"), "working", "đang làm việc", "勤務中", "在职的", "在職的", "laboral", "trabalhando", "fonctionnement", "Arbeiten", "работающий"), "working", "đang làm việc", "勤務中", "在职的", "在職的", "laboral", "trabalhando", "fonctionnement", "Arbeiten", "работающий"), "working", "đang làm việc", "勤務中", "在职的", "在職的", "laboral", "trabalhando", "fonctionnement", "Arbeiten", "работающий") : formatTimeLabel(row.clockOut)}</td>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center justify-center min-h-10 min-w-10 cursor-pointer rounded-lg hover:bg-slate-100">
                              <Checkbox
                                checked={row.tookLunch}
                                disabled={breakDisabled}
                                onCheckedChange={(v) => void handleBreakToggle(row.key, "tookLunch", v === true)}
                                className="size-6 rounded-md border-2 border-slate-500 bg-white shadow-sm data-checked:border-emerald-600 data-checked:bg-emerald-600 data-checked:text-white"
                              />
                            </label>
                          </td>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center justify-center min-h-10 min-w-10 cursor-pointer rounded-lg hover:bg-slate-100">
                              <Checkbox
                                checked={row.tookDinner}
                                disabled={breakDisabled}
                                onCheckedChange={(v) => void handleBreakToggle(row.key, "tookDinner", v === true)}
                                className="size-6 rounded-md border-2 border-slate-500 bg-white shadow-sm data-checked:border-indigo-600 data-checked:bg-indigo-600 data-checked:text-white"
                              />
                            </label>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{formatWorkHours(row.rawMinutes)}</td>
                          <td className="px-4 py-3 font-semibold text-indigo-700">{formatWorkHours(row.paidMinutes)}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => void handleDeleteDay(row.logIds)} className="text-slate-300 hover:text-red-500" title={pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "삭제", "delete", "xóa bỏ", "削除", "删除", "刪除", "borrar", "excluir", "supprimer", "löschen", "удалить"), "delete", "xóa bỏ", "削除", "删除", "刪除", "borrar", "excluir", "supprimer", "löschen", "удалить"), "delete", "xóa bỏ", "削除", "删除", "刪除", "borrar", "excluir", "supprimer", "löschen", "удалить"), "delete", "xóa bỏ", "削除", "删除", "刪除", "borrar", "excluir", "supprimer", "löschen", "удалить")}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "수동 출퇴근 기록 추가", "Add manual attendance log", "Thêm nhật ký tham dự thủ công", "手動通勤履歴を追加", "添加手动考勤记录", "新增手動考勤記錄", "Agregar registro de asistencia manual", "Adicionar registro de presença manual", "Ajouter un journal de présence manuel", "Manuelles Anwesenheitsprotokoll hinzufügen", "Добавить журнал посещаемости вручную"), "Add manual attendance log", "Thêm nhật ký tham dự thủ công", "手動通勤履歴を追加", "添加手动考勤记录", "新增手動考勤記錄", "Agregar registro de asistencia manual", "Adicionar registro de presença manual", "Ajouter un journal de présence manuel", "Manuelles Anwesenheitsprotokoll hinzufügen", "Добавить журнал посещаемости вручную"), "Add manual attendance log", "Thêm nhật ký tham dự thủ công", "手動通勤履歴を追加", "添加手动考勤记录", "新增手動考勤記錄", "Agregar registro de asistencia manual", "Adicionar registro de presença manual", "Ajouter un journal de présence manuel", "Manuelles Anwesenheitsprotokoll hinzufügen", "Добавить журнал посещаемости вручную"), "Add manual attendance log", "Thêm nhật ký tham dự thủ công", "手動通勤履歴を追加", "添加手动考勤记录", "新增手動考勤記錄", "Agregar registro de asistencia manual", "Adicionar registro de presença manual", "Ajouter un journal de présence manuel", "Manuelles Anwesenheitsprotokoll hinzufügen", "Добавить журнал посещаемости вручную")}</DialogTitle>
            <DialogDescription>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "누락된 기록을 사장님이 직접 추가합니다.", "The boss himself adds missing records.", "Chính ông chủ bổ sung hồ sơ còn thiếu.", "不足しているレコードを上司が直接追加します。", "老板亲自添加了缺失的记录。", "老闆親自添加了缺少的記錄。", "El propio jefe añade los registros faltantes.", "O próprio chefe adiciona os registros ausentes.", "Le patron ajoute lui-même les enregistrements manquants.", "Der Chef selbst ergänzt fehlende Datensätze.", "Начальник сам добавляет недостающие записи."), "The boss himself adds missing records.", "Chính ông chủ bổ sung hồ sơ còn thiếu.", "不足しているレコードを上司が直接追加します。", "老板亲自添加了缺失的记录。", "老闆親自添加了缺少的記錄。", "El propio jefe añade los registros faltantes.", "O próprio chefe adiciona os registros ausentes.", "Le patron ajoute lui-même les enregistrements manquants.", "Der Chef selbst ergänzt fehlende Datensätze.", "Начальник сам добавляет недостающие записи."), "The boss himself adds missing records.", "Chính ông chủ bổ sung hồ sơ còn thiếu.", "不足しているレコードを上司が直接追加します。", "老板亲自添加了缺失的记录。", "老闆親自添加了缺少的記錄。", "El propio jefe añade los registros faltantes.", "O próprio chefe adiciona os registros ausentes.", "Le patron ajoute lui-même les enregistrements manquants.", "Der Chef selbst ergänzt fehlende Datensätze.", "Начальник сам добавляет недостающие записи."), "The boss himself adds missing records.", "Chính ông chủ bổ sung hồ sơ còn thiếu.", "不足しているレコードを上司が直接追加します。", "老板亲自添加了缺失的记录。", "老闆親自添加了缺少的記錄。", "El propio jefe añade los registros faltantes.", "O próprio chefe adiciona os registros ausentes.", "Le patron ajoute lui-même les enregistrements manquants.", "Der Chef selbst ergänzt fehlende Datensätze.", "Начальник сам добавляет недостающие записи.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <select value={addStaffId} onChange={(e) => setAddStaffId(e.target.value)} className="w-full h-9 rounded-md border px-3 text-sm">
              <option value="">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원 선택", "employee selection", "lựa chọn nhân viên", "従業員の選択", "员工选拔", "員工選拔", "selección de empleados", "seleção de funcionários", "sélection des employés", "Mitarbeiterauswahl", "подбор сотрудников"), "employee selection", "lựa chọn nhân viên", "従業員の選択", "员工选拔", "員工選拔", "selección de empleados", "seleção de funcionários", "sélection des employés", "Mitarbeiterauswahl", "подбор сотрудников"), "employee selection", "lựa chọn nhân viên", "従業員の選択", "员工选拔", "員工選拔", "selección de empleados", "seleção de funcionários", "sélection des employés", "Mitarbeiterauswahl", "подбор сотрудников"), "employee selection", "lựa chọn nhân viên", "従業員の選択", "员工选拔", "員工選拔", "selección de empleados", "seleção de funcionários", "sélection des employés", "Mitarbeiterauswahl", "подбор сотрудников")}</option>
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="h-9 text-sm" />
              <Input type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "취소", "cancellation", "hủy bỏ", "キャンセル", "消除", "消除", "cancelación", "cancelamento", "annulation", "Stornierung", "отмена"), "cancellation", "hủy bỏ", "キャンセル", "消除", "消除", "cancelación", "cancelamento", "annulation", "Stornierung", "отмена"), "cancellation", "hủy bỏ", "キャンセル", "消除", "消除", "cancelación", "cancelamento", "annulation", "Stornierung", "отмена"), "cancellation", "hủy bỏ", "キャンセル", "消除", "消除", "cancelación", "cancelamento", "annulation", "Stornierung", "отмена")}</Button>
            <Button onClick={() => void handleAddRecord()} disabled={addSaving}>{addSaving ? pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "저장 중...", "Saving...", "Đang lưu...", "保存中...", "保存...", "儲存...", "Ahorro...", "Salvando...", "Économie...", "Sparen...", "Сохранение..."), "Saving...", "Đang lưu...", "保存中...", "保存...", "儲存...", "Ahorro...", "Salvando...", "Économie...", "Sparen...", "Сохранение..."), "Saving...", "Đang lưu...", "保存中...", "保存...", "儲存...", "Ahorro...", "Salvando...", "Économie...", "Sparen...", "Сохранение..."), "Saving...", "Đang lưu...", "保存中...", "保存...", "儲存...", "Ahorro...", "Salvando...", "Économie...", "Sparen...", "Сохранение...") : pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "기록 추가", "add record", "thêm bản ghi", "履歴を追加", "添加记录", "新增記錄", "agregar registro", "adicionar registro", "ajouter un enregistrement", "Datensatz hinzufügen", "добавить запись"), "add record", "thêm bản ghi", "履歴を追加", "添加记录", "新增記錄", "agregar registro", "adicionar registro", "ajouter un enregistrement", "Datensatz hinzufügen", "добавить запись"), "add record", "thêm bản ghi", "履歴を追加", "添加记录", "新增記錄", "agregar registro", "adicionar registro", "ajouter un enregistrement", "Datensatz hinzufügen", "добавить запись"), "add record", "thêm bản ghi", "履歴を追加", "添加记录", "新增記錄", "agregar registro", "adicionar registro", "ajouter un enregistrement", "Datensatz hinzufügen", "добавить запись")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
