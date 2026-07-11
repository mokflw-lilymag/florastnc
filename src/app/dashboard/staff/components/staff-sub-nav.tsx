"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Clock, Wallet, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export function StaffSubNav() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);

  const ITEMS = [
    { href: "/dashboard/staff", label: pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원·PIN·권한", "Employee/PIN/Authority", "Nhân viên/PIN/Cơ quan có thẩm quyền", "職員・PIN・権限", "员工/PIN/权限", "員工/PIN/權限", "Empleado/PIN/Autoridad", "Funcionário/PIN/Autoridade", "Employé/PIN/autorité", "Mitarbeiter/PIN/Autorität", "Сотрудник/ПИН-код/Организация"), "Employee/PIN/Authority", "Nhân viên/PIN/Cơ quan có thẩm quyền", "職員・PIN・権限", "员工/PIN/权限", "員工/PIN/權限", "Empleado/PIN/Autoridad", "Funcionário/PIN/Autoridade", "Employé/PIN/autorité", "Mitarbeiter/PIN/Autorität", "Сотрудник/ПИН-код/Организация"), "Employee/PIN/Authority", "Nhân viên/PIN/Cơ quan có thẩm quyền", "職員・PIN・権限", "员工/PIN/权限", "員工/PIN/權限", "Empleado/PIN/Autoridad", "Funcionário/PIN/Autoridade", "Employé/PIN/autorité", "Mitarbeiter/PIN/Autorität", "Сотрудник/ПИН-код/Организация"), "Employee/PIN/Authority", "Nhân viên/PIN/Cơ quan có thẩm quyền", "職員・PIN・権限", "员工/PIN/权限", "員工/PIN/權限", "Empleado/PIN/Autoridad", "Funcionário/PIN/Autoridade", "Employé/PIN/autorité", "Mitarbeiter/PIN/Autorität", "Сотрудник/ПИН-код/Организация"), icon: Users, exact: true },
    { href: "/dashboard/staff/attendance", label: pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "출퇴근", "commute", "đi lại", "出退勤", "通勤", "通勤", "desplazarse", "trajeto", "navette", "pendeln", "добираться"), "commute", "đi lại", "出退勤", "通勤", "通勤", "desplazarse", "trajeto", "navette", "pendeln", "добираться"), "commute", "đi lại", "出退勤", "通勤", "通勤", "desplazarse", "trajeto", "navette", "pendeln", "добираться"), "commute", "đi lại", "出退勤", "通勤", "通勤", "desplazarse", "trajeto", "navette", "pendeln", "добираться"), icon: Clock, exact: false },
    { href: "/dashboard/staff/salary", label: pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "급여", "salary", "lương", "給与", "薪水", "薪水", "salario", "salário", "salaire", "Gehalt", "зарплата"), "salary", "lương", "給与", "薪水", "薪水", "salario", "salário", "salaire", "Gehalt", "зарплата"), "salary", "lương", "給与", "薪水", "薪水", "salario", "salário", "salaire", "Gehalt", "зарплата"), "salary", "lương", "給与", "薪水", "薪水", "salario", "salário", "salaire", "Gehalt", "зарплата"), icon: Wallet, exact: false },
    { href: "/dashboard/staff/leave", label: pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "휴가", "vacation", "kì nghỉ", "休暇", "假期", "假期", "vacaciones", "férias", "vacances", "Urlaub", "отпуск"), "vacation", "kì nghỉ", "休暇", "假期", "假期", "vacaciones", "férias", "vacances", "Urlaub", "отпуск"), "vacation", "kì nghỉ", "休暇", "假期", "假期", "vacaciones", "férias", "vacances", "Urlaub", "отпуск"), "vacation", "kì nghỉ", "休暇", "假期", "假期", "vacaciones", "férias", "vacances", "Urlaub", "отпуск"), icon: CalendarOff, exact: false },
  ];

  const pathname = usePathname() ?? "";

  return (
    <nav className="flex flex-wrap gap-2 mb-6" aria-label={pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원 HR 메뉴", "Employee HR Menu", "Menu nhân sự nhân viên", "スタッフHRメニュー", "员工人力资源菜单", "員工人力資源菜單", "Menú de recursos humanos para empleados", "Menu de RH do funcionário", "Menu RH des employés", "Mitarbeiter-HR-Menü", "Меню управления персоналом сотрудников"), "Employee HR Menu", "Menu nhân sự nhân viên", "スタッフHRメニュー", "员工人力资源菜单", "員工人力資源菜單", "Menú de recursos humanos para empleados", "Menu de RH do funcionário", "Menu RH des employés", "Mitarbeiter-HR-Menü", "Меню управления персоналом сотрудников"), "Employee HR Menu", "Menu nhân sự nhân viên", "スタッフHRメニュー", "员工人力资源菜单", "員工人力資源菜單", "Menú de recursos humanos para empleados", "Menu de RH do funcionário", "Menu RH des employés", "Mitarbeiter-HR-Menü", "Меню управления персоналом сотрудников"), "Employee HR Menu", "Menu nhân sự nhân viên", "スタッフHRメニュー", "员工人力资源菜单", "員工人力資源菜單", "Menú de recursos humanos para empleados", "Menu de RH do funcionário", "Menu RH des employés", "Mitarbeiter-HR-Menü", "Меню управления персоналом сотрудников")}>
      {ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors",
              isActive
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
