"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Boxes,
  ClipboardList,
  CreditCard,
  Package,
  PlusCircle,
  ScrollText,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { getMessages } from "@/i18n/getMessages";
import {
  ANDROID_HUB_GROUPS,
  androidNavAllowedForPlan,
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

const GROUP_ORDER: AndroidHubGroupId[] = ["order", "manage", "spend"];

export function DashboardAndroidHub() {
  const { profile, isLoading, isSuperAdmin } = useAuth();
  const locale = usePreferredLocale();
  const H = getMessages(locale).androidChrome.hub;
  const L = getMessages(locale).dashboardCommon.sidebar.links;

  const plan = profile?.tenants?.plan ?? "free";
  const subEnd = profile?.tenants?.subscription_end as string | null | undefined;
  const isExpired = !subEnd || new Date(subEnd) < new Date();
  const isSuspended = profile?.tenants?.status === "suspended";
  const tierCtx = { plan, isExpired, isSuspended, isSuperAdmin: !!isSuperAdmin };

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

  const groupTitle = (id: AndroidHubGroupId) =>
    id === "order" ? H.groupOrder : id === "manage" ? H.groupManage : H.groupSpend;

  if (isLoading) {
    return (
      <div className="grid animate-pulse gap-4 sm:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
        ))}
      </div>
    );
  }

  const sections = GROUP_ORDER.map((gid) => ({
    gid,
    cards: ANDROID_HUB_GROUPS[gid].cards.filter((c) => androidNavAllowedForPlan(c, tierCtx)),
  })).filter((s) => s.cards.length > 0);

  if (sections.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{H.pageTitle}</h2>
        <Card className="border-amber-200/80 bg-amber-50/80 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">{H.emptyTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/85">{H.emptyBody}</p>
          <Link
            href="/dashboard/subscription"
            className={cn(buttonVariants({ variant: "default", size: "default" }), "mt-4 inline-flex w-full sm:w-auto")}
          >
            {H.emptyCta}
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{H.pageTitle}</h2>
      </div>
      {sections.map(({ gid, cards }) => (
        <section key={gid} className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {groupTitle(gid)}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {cards.map((c) => {
              const Icon = HUB_ICONS[c.href] ?? Package;
              return (
                <Link key={c.href} href={c.href} className="block min-h-[5.5rem]">
                  <Card
                    className={cn(
                      "h-full min-h-[5.5rem] border-slate-200/80 bg-white p-4 shadow-sm transition-all active:scale-[0.98]",
                      "hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900"
                    )}
                  >
                    <div className="flex h-full flex-col items-start justify-between gap-2">
                      <Icon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" aria-hidden />
                      <span className="text-left text-sm font-semibold leading-snug text-slate-900 dark:text-slate-50">
                        {labelForHref(c.href)}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
