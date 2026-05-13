"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  PlusCircle,
  ScrollText,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsCapacitorAndroid } from "@/hooks/use-capacitor-android";
import { useAuth } from "@/hooks/use-auth";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { getMessages } from "@/i18n/getMessages";
import {
  ANDROID_HUB_GROUPS,
  androidContextGroupForPath,
  androidNavAllowedForPlan,
  androidShowContextNav,
  type AndroidHubGroupId,
} from "@/lib/android-tenant-nav";

const HUB_ICONS: Record<string, LucideIcon> = {
  "/dashboard/orders/new": PlusCircle,
  "/dashboard/orders": ScrollText,
  "/dashboard/delivery": Truck,
  "/dashboard/products": Package,
  "/dashboard/inventory": Boxes,
  "/dashboard/purchases": ShoppingCart,
  "/dashboard/expenses": CreditCard,
  "/dashboard/material-requests": ClipboardList,
};

export function DashboardAndroidContextNav() {
  const pathname = usePathname() || "";
  const isAndroid = useIsCapacitorAndroid();
  const { profile, isLoading, isSuperAdmin } = useAuth();
  const locale = usePreferredLocale();
  const C = getMessages(locale).androidChrome.contextNav;
  const L = getMessages(locale).dashboardCommon.sidebar.links;

  if (!isAndroid || isLoading || !androidShowContextNav(pathname)) return null;

  const group = androidContextGroupForPath(pathname);
  if (!group) return null;

  const plan = profile?.tenants?.plan ?? "free";
  const subEnd = profile?.tenants?.subscription_end as string | null | undefined;
  const isExpired = !subEnd || new Date(subEnd) < new Date();
  const tierCtx = {
    plan,
    isExpired,
    isSuspended: profile?.tenants?.status === "suspended",
    isSuperAdmin: !!isSuperAdmin,
  };

  const labelForHref = (href: string): string => {
    const map: Record<string, string> = {
      "/dashboard/orders/new": L.newOrder,
      "/dashboard/orders": L.orders,
      "/dashboard/delivery": L.delivery,
      "/dashboard/products": L.products,
      "/dashboard/inventory": L.inventory,
      "/dashboard/purchases": L.purchases,
      "/dashboard/expenses": L.expenses,
      "/dashboard/material-requests": L.branchMaterials,
    };
    return map[href] ?? href;
  };

  const cards = ANDROID_HUB_GROUPS[group].cards.filter((c) => androidNavAllowedForPlan(c, tierCtx));
  if (cards.length === 0) return null;

  const normalize = (p: string) => p.replace(/\/$/, "") || "/";

  return (
    <nav
      aria-label={C.ariaLabel}
      className="sticky top-0 z-30 -mx-4 mb-4 border-b border-slate-200/80 bg-zinc-50/95 px-3 py-2.5 backdrop-blur-md dark:border-slate-800 dark:bg-zinc-950/95 md:-mx-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
          {C.mainHome}
        </Link>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {cards.map((c) => {
            const Icon = HUB_ICONS[c.href] ?? Package;
            const norm = normalize(pathname);
            const hrefNorm = normalize(c.href);
            let active = norm === hrefNorm;
            if (c.href === "/dashboard/orders") {
              active =
                norm === "/dashboard/orders" ||
                (norm.startsWith("/dashboard/orders/") && !norm.startsWith("/dashboard/orders/new"));
            } else if (c.href !== "/dashboard/orders/new") {
              active = active || norm.startsWith(`${hrefNorm}/`);
            }
            return (
              <Link
                key={c.href}
                href={c.href}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                <span className="max-w-[9rem] truncate">{labelForHref(c.href)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
