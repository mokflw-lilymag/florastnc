"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScrollText,
  Truck,
  Users,
  Menu,
  Plus,
  BarChart3,
  CreditCard,
  Boxes,
  Share2,
  Sparkles,
  Layout,
  Monitor,
  Settings,
  Gem,
  ShieldCheck,
  Store,
  FileText,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsCapacitorAndroid } from "@/hooks/use-capacitor-android";
import { useAuth } from "@/hooks/use-auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { getMessages } from "@/i18n/getMessages";

type MoreItem = { href: string; label: string; icon: typeof BarChart3 };

export function AndroidAppChrome() {
  const locale = usePreferredLocale();
  const A = getMessages(locale).androidChrome;
  const isAndroidApp = useIsCapacitorAndroid();
  const pathname = usePathname() || "";
  const { profile, isLoading } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryNav = [
    { href: "/dashboard", label: A.home, icon: LayoutDashboard, match: (p: string) => p === "/dashboard" },
    {
      href: "/dashboard/orders",
      label: A.orders,
      icon: ScrollText,
      match: (p: string) => p.startsWith("/dashboard/orders"),
    },
    {
      href: "/dashboard/delivery",
      label: A.delivery,
      icon: Truck,
      match: (p: string) => p.startsWith("/dashboard/delivery"),
    },
    {
      href: "/dashboard/customers",
      label: A.customers,
      icon: Users,
      match: (p: string) => p.startsWith("/dashboard/customers"),
    },
  ];

  const T = A.tenant;
  const Ad = A.admin;

  const tenantMoreLinks: MoreItem[] = [
    { href: "/dashboard/org-board", label: T.orgBoard, icon: Megaphone },
    { href: "/dashboard/orders/new", label: T.newOrder, icon: Plus },
    { href: "/dashboard/reports", label: T.reports, icon: BarChart3 },
    { href: "/dashboard/analytics", label: T.analytics, icon: BarChart3 },
    { href: "/dashboard/expenses", label: T.expenses, icon: CreditCard },
    { href: "/dashboard/tax", label: T.tax, icon: FileText },
    { href: "/dashboard/inventory", label: T.inventory, icon: Boxes },
    { href: "/dashboard/products", label: T.products, icon: Boxes },
    { href: "/dashboard/external-orders", label: T.externalOrders, icon: Share2 },
    { href: "/dashboard/marketing", label: T.marketing, icon: Sparkles },
    { href: "/dashboard/design-studio", label: T.designStudio, icon: Layout },
    { href: "/dashboard/settings/pos", label: T.pos, icon: Monitor },
    { href: "/dashboard/settings", label: T.settings, icon: Settings },
    { href: "/dashboard/subscription", label: T.subscription, icon: Gem },
  ];

  const adminMoreLinks: MoreItem[] = [
    { href: "/dashboard/orders/new", label: Ad.newOrder, icon: Plus },
    { href: "/dashboard/admin/staff", label: Ad.staff, icon: Users },
    { href: "/dashboard/admin/checklist", label: Ad.checklist, icon: ShieldCheck },
    { href: "/dashboard/tenants", label: Ad.tenants, icon: Store },
    { href: "/dashboard/billing-admin", label: Ad.billing, icon: CreditCard },
    { href: "/dashboard/announcements", label: Ad.announcements, icon: FileText },
    { href: "/dashboard/admin/faq", label: Ad.faqAi, icon: FileText },
    { href: "/dashboard/marketing/admin", label: Ad.platformMarketing, icon: Sparkles },
    { href: "/dashboard/admin/design-templates", label: Ad.designTemplates, icon: Layout },
    { href: "/dashboard/system-settings", label: Ad.globalSettings, icon: Settings },
    { href: "/dashboard/settings", label: Ad.storeSettings, icon: Settings },
  ];

  if (!isAndroidApp) return null;

  const isSuperAdmin = profile?.role === "super_admin";
  const moreItems = isSuperAdmin ? adminMoreLinks : tenantMoreLinks;

  const moreActive = moreItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  const primaryActive = primaryNav.some((item) => item.match(pathname));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        aria-label={A.navAriaLabel}
      >
        <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1 pt-1">
          {primaryNav.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[3rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-xs font-semibold transition-colors active:scale-[0.97]",
                  active
                    ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                )}
              >
                <Icon className={cn("h-6 w-6", active && "text-indigo-600 dark:text-indigo-400")} aria-hidden />
                <span className="truncate max-w-full px-0.5">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex min-h-[3rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-xs font-semibold transition-colors active:scale-[0.97]",
              moreActive && !primaryActive
                ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            )}
          >
            <Menu
              className={cn(
                "h-6 w-6",
                moreActive && !primaryActive && "text-indigo-600 dark:text-indigo-400"
              )}
              aria-hidden
            />
            <span>{A.more}</span>
          </button>
        </div>
      </nav>

      <Link
        href="/dashboard/orders/new"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-[101] inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 active:scale-95"
        aria-label={A.fabNewOrderAria}
      >
        <Plus className="h-7 w-7" />
      </Link>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle>{A.sheetTitle}</SheetTitle>
            <SheetDescription className="sr-only">{A.sheetDescriptionSr}</SheetDescription>
          </SheetHeader>
          {!isLoading && isSuperAdmin ? (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
              {A.adminDesktopHint}
            </p>
          ) : null}
          <ul className="mt-4 max-h-[60vh] space-y-0.5 overflow-y-auto pb-8">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-medium text-slate-800 active:bg-slate-100 dark:text-slate-100 dark:active:bg-slate-800"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
