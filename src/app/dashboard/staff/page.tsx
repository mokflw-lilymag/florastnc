"use client";

import { useAuth } from "@/hooks/use-auth";
import { StaffSubNav } from "./components/staff-sub-nav";
import { OwnerPinSettingsCard } from "@/app/dashboard/settings/components/OwnerPinSettingsCard";
import { PosDeviceSettingsCard } from "@/app/dashboard/settings/components/PosDeviceSettingsCard";
import { StaffPermissionsCard } from "@/app/dashboard/settings/components/StaffPermissionsCard";
import { StaffSettingsCard } from "@/app/dashboard/settings/components/StaffSettingsCard";
import { PayrollSettingsCard } from "@/app/dashboard/staff/components/PayrollSettingsCard";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export default function StaffHrPage() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);

  const { canManageStaff, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "불러오는 중...", "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка..."), "Loading...", "Đang tải...", "読み込み中...", "加载中...", "載入中...", "Cargando...", "Carregando...", "Chargement...", "Laden...", "Загрузка...")}</div>;
  }

  if (!canManageStaff) {
    return (
      <div className="p-8 text-slate-600">
       {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "접근 권한이 없습니다. 점주 계정으로 로그인했는지 확인해주세요.", "You do not have access permission. Please make sure you are logged in with your store owner account.", "Bạn không có quyền truy cập. Vui lòng đảm bảo rằng bạn đã đăng nhập bằng tài khoản chủ cửa hàng của mình.", "アクセス権がありません。 店主アカウントでログインしていることを確認してください。", "您没有访问权限。 请确保您使用店主帐户登录。", "您沒有存取權限。 請確保您使用店主帳號登入。", "No tienes permiso de acceso. Asegúrese de haber iniciado sesión con su cuenta de propietario de tienda.", "Você não tem permissão de acesso. Certifique-se de estar conectado com sua conta de proprietário da loja.", "Vous n'avez pas d'autorisation d'accès. Veuillez vous assurer que vous êtes connecté avec votre compte de propriétaire de magasin.", "Sie haben keine Zugriffsberechtigung. Bitte stellen Sie sicher, dass Sie mit Ihrem Shop-Inhaberkonto angemeldet sind.", "У вас нет разрешения на доступ. Пожалуйста, убедитесь, что вы вошли в свою учетную запись владельца магазина."), "You do not have access permission. Please make sure you are logged in with your store owner account.", "Bạn không có quyền truy cập. Vui lòng đảm bảo rằng bạn đã đăng nhập bằng tài khoản chủ cửa hàng của mình.", "アクセス権がありません。 店主アカウントでログインしていることを確認してください。", "您没有访问权限。 请确保您使用店主帐户登录。", "您沒有存取權限。 請確保您使用店主帳號登入。", "No tienes permiso de acceso. Asegúrese de haber iniciado sesión con su cuenta de propietario de tienda.", "Você não tem permissão de acesso. Certifique-se de estar conectado com sua conta de proprietário da loja.", "Vous n'avez pas d'autorisation d'accès. Veuillez vous assurer que vous êtes connecté avec votre compte de propriétaire de magasin.", "Sie haben keine Zugriffsberechtigung. Bitte stellen Sie sicher, dass Sie mit Ihrem Shop-Inhaberkonto angemeldet sind.", "У вас нет разрешения на доступ. Пожалуйста, убедитесь, что вы вошли в свою учетную запись владельца магазина."), "You do not have access permission. Please make sure you are logged in with your store owner account.", "Bạn không có quyền truy cập. Vui lòng đảm bảo rằng bạn đã đăng nhập bằng tài khoản chủ cửa hàng của mình.", "アクセス権がありません。 店主アカウントでログインしていることを確認してください。", "您没有访问权限。 请确保您使用店主帐户登录。", "您沒有存取權限。 請確保您使用店主帳號登入。", "No tienes permiso de acceso. Asegúrese de haber iniciado sesión con su cuenta de propietario de tienda.", "Você não tem permissão de acesso. Certifique-se de estar conectado com sua conta de proprietário da loja.", "Vous n'avez pas d'autorisation d'accès. Veuillez vous assurer que vous êtes connecté avec votre compte de propriétaire de magasin.", "Sie haben keine Zugriffsberechtigung. Bitte stellen Sie sicher, dass Sie mit Ihrem Shop-Inhaberkonto angemeldet sind.", "У вас нет разрешения на доступ. Пожалуйста, убедитесь, что вы вошли в свою учетную запись владельца магазина."), "You do not have access permission. Please make sure you are logged in with your store owner account.", "Bạn không có quyền truy cập. Vui lòng đảm bảo rằng bạn đã đăng nhập bằng tài khoản chủ cửa hàng của mình.", "アクセス権がありません。 店主アカウントでログインしていることを確認してください。", "您没有访问权限。 请确保您使用店主帐户登录。", "您沒有存取權限。 請確保您使用店主帳號登入。", "No tienes permiso de acceso. Asegúrese de haber iniciado sesión con su cuenta de propietario de tienda.", "Você não tem permissão de acesso. Certifique-se de estar conectado com sua conta de proprietário da loja.", "Vous n'avez pas d'autorisation d'accès. Veuillez vous assurer que vous êtes connecté avec votre compte de propriétaire de magasin.", "Sie haben keine Zugriffsberechtigung. Bitte stellen Sie sicher, dass Sie mit Ihrem Shop-Inhaberkonto angemeldet sind.", "У вас нет разрешения на доступ. Пожалуйста, убедитесь, что вы вошли в свою учетную запись владельца магазина.")}.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원 · HR", "Employees · HR", "Nhân viên · Nhân sự", "スタッフ・HR", "员工·人力资源", "員工·人力資源", "Empleados · RRHH", "Funcionários · RH", "Employés · RH", "Mitarbeiter · HR", "Сотрудники · HR"), "Employees · HR", "Nhân viên · Nhân sự", "スタッフ・HR", "员工·人力资源", "員工·人力資源", "Empleados · RRHH", "Funcionários · RH", "Employés · RH", "Mitarbeiter · HR", "Сотрудники · HR"), "Employees · HR", "Nhân viên · Nhân sự", "スタッフ・HR", "员工·人力资源", "員工·人力資源", "Empleados · RRHH", "Funcionários · RH", "Employés · RH", "Mitarbeiter · HR", "Сотрудники · HR"), "Employees · HR", "Nhân viên · Nhân sự", "スタッフ・HR", "员工·人力资源", "員工·人力資源", "Empleados · RRHH", "Funcionários · RH", "Employés · RH", "Mitarbeiter · HR", "Сотрудники · HR")}</h1>
        <p className="text-sm text-slate-500 mt-1">
         {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원 인사 정보, PIN·권한, 출퇴근 POS를 관리합니다.", "Manage employee personnel information, PIN/permissions, and attendance POS.", "Quản lý thông tin nhân sự của nhân viên, mã PIN/quyền và POS chấm công.", "従業員人事情報、PIN・権限、出退勤POSを管理します。", "管理员工人事信息、PIN/权限和考勤 POS。", "管理員工人事資訊、PIN/權限和考勤 POS。", "Administre la información del personal de los empleados, PIN/permisos y POS de asistencia.", "Gerencie informações de pessoal de funcionários, PIN/permissões e PDV de atendimento.", "Gérez les informations sur le personnel des employés, les codes PIN/autorisations et les points de vente de présence.", "Verwalten Sie Personalinformationen, PINs/Berechtigungen und Anwesenheits-POS der Mitarbeiter.", "Управляйте информацией о персонале сотрудников, PIN-кодами/разрешениями и POS-терминалами посещаемости."), "Manage employee personnel information, PIN/permissions, and attendance POS.", "Quản lý thông tin nhân sự của nhân viên, mã PIN/quyền và POS chấm công.", "従業員人事情報、PIN・権限、出退勤POSを管理します。", "管理员工人事信息、PIN/权限和考勤 POS。", "管理員工人事資訊、PIN/權限和考勤 POS。", "Administre la información del personal de los empleados, PIN/permisos y POS de asistencia.", "Gerencie informações de pessoal de funcionários, PIN/permissões e PDV de atendimento.", "Gérez les informations sur le personnel des employés, les codes PIN/autorisations et les points de vente de présence.", "Verwalten Sie Personalinformationen, PINs/Berechtigungen und Anwesenheits-POS der Mitarbeiter.", "Управляйте информацией о персонале сотрудников, PIN-кодами/разрешениями и POS-терминалами посещаемости."), "Manage employee personnel information, PIN/permissions, and attendance POS.", "Quản lý thông tin nhân sự của nhân viên, mã PIN/quyền và POS chấm công.", "従業員人事情報、PIN・権限、出退勤POSを管理します。", "管理员工人事信息、PIN/权限和考勤 POS。", "管理員工人事資訊、PIN/權限和考勤 POS。", "Administre la información del personal de los empleados, PIN/permisos y POS de asistencia.", "Gerencie informações de pessoal de funcionários, PIN/permissões e PDV de atendimento.", "Gérez les informations sur le personnel des employés, les codes PIN/autorisations et les points de vente de présence.", "Verwalten Sie Personalinformationen, PINs/Berechtigungen und Anwesenheits-POS der Mitarbeiter.", "Управляйте информацией о персонале сотрудников, PIN-кодами/разрешениями и POS-терминалами посещаемости."), "Manage employee personnel information, PIN/permissions, and attendance POS.", "Quản lý thông tin nhân sự của nhân viên, mã PIN/quyền và POS chấm công.", "従業員人事情報、PIN・権限、出退勤POSを管理します。", "管理员工人事信息、PIN/权限和考勤 POS。", "管理員工人事資訊、PIN/權限和考勤 POS。", "Administre la información del personal de los empleados, PIN/permisos y POS de asistencia.", "Gerencie informações de pessoal de funcionários, PIN/permissões e PDV de atendimento.", "Gérez les informations sur le personnel des employés, les codes PIN/autorisations et les points de vente de présence.", "Verwalten Sie Personalinformationen, PINs/Berechtigungen und Anwesenheits-POS der Mitarbeiter.", "Управляйте информацией о персонале сотрудников, PIN-кодами/разрешениями и POS-терминалами посещаемости.")}.
        </p>
      </div>

      <div className="p-4 md:p-6 space-y-4 flex-1 overflow-auto">
        <StaffSubNav />
        <PayrollSettingsCard />
        <OwnerPinSettingsCard />
        <PosDeviceSettingsCard />
        <StaffPermissionsCard />
        <StaffSettingsCard />
      </div>
    </div>
  );
}
