/** Android 앱(일반 매장 사용자) 허브·컨텍스트 내비용 — PC 레이아웃과 독립. */

import { ERP_NAV_TIERS, navTierAllows } from "@/lib/subscription/plan-access";

export type AndroidNavTierCtx = {
  plan: string;
  isExpired?: boolean;
  isSuspended?: boolean;
  isSuperAdmin: boolean;
};

type Tiered = { tier?: string[] };

export function androidNavAllowedForPlan(link: Tiered, ctx: AndroidNavTierCtx): boolean {
  if (ctx.isSuperAdmin) return false;
  return navTierAllows(link.tier, {
    plan: ctx.plan,
    isExpired: ctx.isExpired,
    isSuspended: ctx.isSuspended,
    isSuperAdmin: ctx.isSuperAdmin,
  });
}

export type AndroidHubGroupId = "order" | "manage" | "spend";

export type AndroidHubCardDef = {
  href: string;
  tier?: string[];
};

export const ANDROID_CONTEXT_GROUP_ORDER: AndroidHubGroupId[] = ["order", "manage", "spend"];

export const ANDROID_CONTEXT_PREFIXES: Record<AndroidHubGroupId, string[]> = {
  order: ["/dashboard/orders", "/dashboard/delivery"],
  manage: ["/dashboard/products", "/dashboard/inventory"],
  spend: ["/dashboard/purchases", "/dashboard/expenses", "/dashboard/material-requests"],
};

export const ANDROID_HUB_GROUPS: Record<
  AndroidHubGroupId,
  { cards: AndroidHubCardDef[] }
> = {
  order: {
    cards: [
      { href: "/dashboard/orders/new", tier: [...ERP_NAV_TIERS] },
      { href: "/dashboard/orders", tier: [...ERP_NAV_TIERS] },
      { href: "/dashboard/delivery", tier: [...ERP_NAV_TIERS] },
    ],
  },
  manage: {
    cards: [
      { href: "/dashboard/products", tier: [...ERP_NAV_TIERS] },
      { href: "/dashboard/inventory", tier: [...ERP_NAV_TIERS] },
    ],
  },
  spend: {
    cards: [
      { href: "/dashboard/purchases", tier: [...ERP_NAV_TIERS] },
      { href: "/dashboard/expenses", tier: [...ERP_NAV_TIERS] },
      { href: "/dashboard/material-requests", tier: [...ERP_NAV_TIERS] },
    ],
  },
};

export function androidContextGroupForPath(pathname: string): AndroidHubGroupId | null {
  const p = pathname.replace(/\/$/, "") || "/";
  for (const gid of ANDROID_CONTEXT_GROUP_ORDER) {
    for (const prefix of ANDROID_CONTEXT_PREFIXES[gid]) {
      if (p === prefix || p.startsWith(`${prefix}/`)) return gid;
    }
  }
  return null;
}

/** 허브(`/dashboard` 정확히)에서는 컨텍스트 바 숨김 */
export function androidShowContextNav(pathname: string): boolean {
  const p = pathname.replace(/\/$/, "") || "/";
  if (p === "/dashboard") return false;
  return androidContextGroupForPath(pathname) != null;
}
