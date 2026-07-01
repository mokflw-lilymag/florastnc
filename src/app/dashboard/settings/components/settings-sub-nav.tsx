"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { getMessages } from "@/i18n/getMessages";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { Badge } from "@/components/ui/badge";

/** POS 연동 상세 — 환경설정 UI에서 비활성(준비중) */
const POS_INTEGRATION_ENABLED = false;

export function SettingsSubNav() {
  const pathname = usePathname() ?? "";
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const links = getMessages(locale).dashboardCommon.sidebar.links;
  const comingSoonLabel = pickUiText(
    baseLocale,
    "준비중",
    "Coming soon",
    "Sắp ra mắt",
    "準備中",
    "即将推出",
    "Próximamente",
    "Em breve",
    "Bientôt",
    "Demnächst",
    "Скоро",
  );

  const settingsItem = {
    href: "/dashboard/settings",
    label: links.settings,
    icon: Building2,
    isActive: pathname === "/dashboard/settings",
  };

  return (
    <nav
      className="flex flex-wrap gap-2 mb-6"
      aria-label={links.settings}
    >
      <Link
        href={settingsItem.href}
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors",
          settingsItem.isActive
            ? "bg-slate-900 text-white shadow-md"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200",
        )}
      >
        <settingsItem.icon className="h-4 w-4 shrink-0" />
        {settingsItem.label}
      </Link>

      <span
        role="button"
        aria-disabled="true"
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold cursor-not-allowed opacity-60",
          pathname.startsWith("/dashboard/settings/pos")
            ? "bg-slate-200 text-slate-500"
            : "bg-slate-100 text-slate-400",
        )}
      >
        <Monitor className="h-4 w-4 shrink-0" />
        {links.pos}
        <Badge
          variant="secondary"
          className="ml-0.5 bg-slate-200 text-slate-500 font-bold text-[9px] border-none shadow-none"
        >
          {comingSoonLabel}
        </Badge>
      </span>
    </nav>
  );
}

export { POS_INTEGRATION_ENABLED };
