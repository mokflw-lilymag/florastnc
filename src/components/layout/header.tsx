"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { differenceInCalendarDays, format } from "date-fns";
import { User, LogOut, Settings, Bell, BookOpen, Wifi, WifiOff, Globe } from "lucide-react";
import { MobileSidebar } from "./mobile-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppLocale, LOCALE_COOKIE, resolveLocale, toBaseLocale } from "@/i18n/config";
import {
  DASHBOARD_LOCALE_SELECT_OPTIONS,
  resolveDashboardSelectLocale,
} from "@/i18n/ui-locale-options";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { getMessages } from "@/i18n/getMessages";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

interface HeaderProps {
  userEmail: string;
  isSuperAdmin: boolean;
  plan: string;
  isExpired?: boolean;
  isSuspended?: boolean;
  logoUrl?: string;
  storeName?: string;
  subscriptionEnd?: string | null;
  /** 매장 구독 없이 본사 전용 계정 */
  isOrgOnly?: boolean;
  /** 본사 전용이면서 지점 업무 모드가 아닐 때(HQ 메뉴만) */
  hqMenuOnly?: boolean;
  /** 조직 멤버(매장+본사 메뉴 병행 시 true) */
  isOrgUser?: boolean;
  showOrgBoardLink?: boolean;
  showBranchMaterialRequestLink?: boolean;
}

function planBadgeLabel(plan: string) {
  const map: Record<string, string> = {
    free: "FREE",
    pro: "PRO",
    erp_only: "ERP",
    ribbon_only: "PRINT",
  };
  return map[plan] ?? plan.toUpperCase();
}

export function Header({
  userEmail,
  isSuperAdmin,
  plan,
  isExpired,
  isSuspended,
  logoUrl,
  storeName,
  subscriptionEnd,
  isOrgOnly = false,
  hqMenuOnly,
  isOrgUser = false,
  showOrgBoardLink = false,
  showBranchMaterialRequestLink = false,
}: HeaderProps) {
  const sidebarHqOnly = hqMenuOnly ?? isOrgOnly;
  const router = useRouter();
  const supabase = createClient();
  const [isBridgeOnline, setIsBridgeOnline] = useState(false);
  const [isPPBridgeOnline, setIsPPBridgeOnline] = useState(false);
  const [bridgeVersion, setBridgeVersion] = useState("");
  const preferredLocale = usePreferredLocale();
  const messages = getMessages(preferredLocale);
  const t = messages.dashboardCommon;
  const dh = messages.dashboardHeader;
  const [uiLocale, setUiLocale] = useState<AppLocale>("ko");
  const selectLocale = resolveDashboardSelectLocale(uiLocale);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
      ?.split("=")[1];
    setUiLocale(resolveLocale(cookieValue));
  }, []);

  const handleLocaleChange = (nextLocale: AppLocale) => {
    setUiLocale(nextLocale);
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.dispatchEvent(new Event("preferred-locale-changed"));
    toast.success(t.header.localeChanged);
  };

  useEffect(() => {
    const checkBridge = async () => {
      // 1. 구형 POS 브릿지 (8002) - 레거시 호환
      try {
        const res = await fetch('http://127.0.0.1:8002/api/version', { 
          signal: AbortSignal.timeout(2000),
          mode: 'cors',
          credentials: 'omit'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setIsBridgeOnline(data.status === 'success' || data.status === 'ok');
      } catch (err) {
        setIsBridgeOnline(false);
      }

      // 2. 신형 범용 프린트 브릿지 (8003) - 브라우저 자동 페어링 (Hot-swap & 영구저장)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const currentTenantId = user?.id || '';
        
        const endpoint = currentTenantId 
          ? `http://127.0.0.1:8003/set_tenant?id=${currentTenantId}` 
          : 'http://127.0.0.1:8003/api/version';

        const resPP = await fetch(endpoint, { 
          signal: AbortSignal.timeout(2000),
          mode: 'cors',
          credentials: 'omit'
        });
        if (!resPP.ok) throw new Error(`HTTP ${resPP.status}`);
        const dataPP = await resPP.json();
        setIsPPBridgeOnline(dataPP.status === 'success' || dataPP.status === 'ok');
        if (dataPP.version) setBridgeVersion(dataPP.version);
      } catch (err) {
        setIsPPBridgeOnline(false);
      }
    };
    checkBridge();
    const timer = setInterval(checkBridge, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t.header.logoutSuccess);
    router.push("/login");
  };

  const subscriptionLine = (() => {
    if (isSuperAdmin) return null;
    if (sidebarHqOnly) return t.header.hqAccount;
    const label = planBadgeLabel(plan);
    if (!subscriptionEnd) {
      return `${label} · ${t.header.subscriptionMissing}`;
    }
    const end = new Date(subscriptionEnd);
    const dateStr = format(end, "P", { locale: dateFnsLocaleForBase(toBaseLocale(resolveLocale(preferredLocale))) });
    if (isExpired) {
      return `${label} · ${dateStr}(${t.header.subscriptionExpired}) · ${t.header.subscriptionRenew}`;
    }
    const daysLeft = differenceInCalendarDays(end, new Date());
    if (daysLeft <= 0) {
      return `${label} · ${t.header.subscriptionToday}`;
    }
    return t.header.subscriptionActiveCountdown
      .replace(/\{\{label\}\}/g, label)
      .replace(/\{\{date\}\}/g, dateStr)
      .replace(/\{\{days\}\}/g, String(daysLeft));
  })();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Toggle */}
        <MobileSidebar 
          isSuperAdmin={isSuperAdmin} 
          plan={plan} 
          isExpired={isExpired}
          isSuspended={isSuspended}
          logoUrl={logoUrl} 
          storeName={storeName}
          isOrgUser={isOrgUser}
          isOrgOnly={isOrgOnly}
          hqMenuOnly={sidebarHqOnly}
          showOrgBoardLink={showOrgBoardLink}
          showBranchMaterialRequestLink={showBranchMaterialRequestLink}
        />
        {storeName && !isSuperAdmin && (
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 md:flex-initial md:gap-4">
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
              <span className="hidden h-4 w-px bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden />
              {logoUrl && (
                <Image
                  src={logoUrl}
                  alt=""
                  width={160}
                  height={40}
                  unoptimized
                  className="h-6 w-auto max-w-[120px] shrink-0 object-contain md:h-7 md:max-w-none"
                />
              )}
              <h1 className="truncate text-xs font-bold text-slate-800 dark:text-slate-100 md:text-sm">
                {storeName}
              </h1>
            </div>
            {subscriptionLine && (
              <Link
                href="/dashboard/subscription"
                title={t.header.subscriptionTitle}
                className={cn(
                  "inline-flex max-w-full items-center rounded-lg border px-2 py-1 text-[10px] font-semibold leading-tight transition-colors sm:shrink-0 md:text-[11px]",
                  isExpired || isSuspended
                    ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                )}
              >
                <span className="truncate">{subscriptionLine}</span>
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">

        <div className="hidden md:flex items-center gap-2">
          {/* PP Bridge Status Indicator */}
          <div 
            onClick={() => router.push('/dashboard/settings')}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800",
              isPPBridgeOnline 
                ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400" 
                : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500"
            )}
          >
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isPPBridgeOnline ? "bg-blue-500 animate-pulse shadow-[0_0_6px_rgba(59,130,246,0.5)]" : "bg-slate-400"
            )} />
            <span className="text-[9px] font-bold uppercase tracking-tight">
              PP {isPPBridgeOnline ? "ON" : "OFF"} <span className="opacity-60 font-mono tracking-tighter">{bridgeVersion || 'v1'}</span>
            </span>
          </div>

          {/* RP Bridge Status Indicator (v25.0) */}
          <div 
            onClick={() => router.push('/dashboard/printer')}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800",
              isBridgeOnline 
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400" 
                : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500"
            )}
          >
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isBridgeOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-slate-400"
            )} />
            <span className="text-[9px] font-bold uppercase tracking-tight">
              RP {isBridgeOnline ? "ON" : "OFF"} <span className="opacity-60 font-mono tracking-tighter">v25.0</span>
            </span>
          </div>

          <span className="h-3 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1"></span>
          <span className="text-[9px] font-bold uppercase tracking-tight opacity-80">
            {isSuperAdmin ? 'HQ ADMIN' : plan.toUpperCase()}
          </span>
        </div>

        {/* Quick Manual Link */}
        <Link
          href="/docs/manual"
          title={dh.manualTitle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-indigo-200 bg-white text-lg hover:bg-indigo-50 transition-colors shadow-sm"
          aria-label={dh.manualOpenAria}
        >
          📘
        </Link>

        {/* HQ Manual Button - Only for Super Admins */}
        {isSuperAdmin && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all rounded-full"
            onClick={() => router.push("/dashboard/admin/manual/guide")}
            title={dh.hqManualTitle}
          >
            <BookOpen className="h-5 w-5" />
          </Button>
        )}

        {/* Notification Bell */}
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all rounded-full">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></span>
        </Button>

        {/* User Dropdown Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-slate-100 dark:ring-slate-800 transition-all focus:ring-blue-500 outline-none hover:bg-slate-100 dark:hover:bg-slate-800">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-normal text-xs ring-1 ring-white dark:ring-slate-900">
                {userEmail.substring(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-normal leading-none text-slate-900 dark:text-white">{isSuperAdmin ? t.header.admin : t.header.partner}</p>
                  <p className="text-xs leading-none text-slate-500 dark:text-slate-400 truncate">
                    {userEmail}
                  </p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4 text-slate-400" />
              <span>{t.header.profile}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer" 
              onClick={() => router.push("/dashboard/settings")}
            >
              <Settings className="mr-2 h-4 w-4 text-slate-400" />
              <span>{t.header.settings}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-600 dark:focus:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t.header.logout}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
