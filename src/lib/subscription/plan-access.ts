import { hasRegisteredStoreTenant } from "@/lib/subscription/guest-trial";

/**
 * 테넌트 플랜 · 메뉴 · 기능 접근 (단일 소스)
 *
 * - `free`: 미구독·체험 — 리본·디자인 일부만 (구독 유도)
 * - `ribbon_only` | `light` | `pro` | `pro_plus`: 유료 (구독 만료 시 free로 소프트 다운그레이드)
 */

export const PAID_PLAN_IDS = ["ribbon_only", "mini", "light", "pro", "pro_plus"] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

/** 결제·구독 페이지에서 판매하는 플랜 */
export const SUBSCRIPTION_PLAN_IDS = [...PAID_PLAN_IDS] as const;

/** 레거시: 예전에 PRINT CORE 결제가 plan=free 로 저장됨 */
export const LEGACY_PRINT_PLAN_ID = "free";

export const FREE_PRINTS_PER_DAY = 3;

export type AccessContext = {
  plan?: string | null;
  isExpired?: boolean;
  isSuspended?: boolean;
  isSuperAdmin?: boolean;
  createdAt?: string | null;
};

export function normalizePlanId(plan?: string | null): string {
  return plan?.trim() || "free";
}

/** 사이드바·라우트 권한에 쓰는 실효 플랜 */
export function resolveAccessPlan(
  plan?: string | null,
  opts?: Pick<AccessContext, "isExpired" | "isSuspended">,
): string {
  const p = normalizePlanId(plan);
  if (p === "free") return "free";
  if (opts?.isExpired && (PAID_PLAN_IDS as readonly string[]).includes(p)) {
    return "free";
  }
  return p;
}

export function isPaidPlan(plan?: string | null): boolean {
  const p = normalizePlanId(plan);
  return (PAID_PLAN_IDS as readonly string[]).includes(p);
}

/** 무료 계정이면서 가입 후 7일 이내인지 확인 (리버스 트라이얼) */
export function isReverseTrial(ctx: AccessContext): boolean {
  if (resolveAccessPlan(ctx.plan, ctx) !== "free") return false;
  if (!ctx.createdAt) return false;
  
  const createdDate = new Date(ctx.createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24); 
  return diffDays <= 7 && diffDays >= 0;
}

export function hasRibbonAccess(ctx: AccessContext): boolean {
  if (ctx.isSuperAdmin) return true;
  const access = resolveAccessPlan(ctx.plan, ctx);
  return access === "free" || access === "ribbon_only" || access === "mini" || access === "light" || access === "pro" || access === "pro_plus";
}

/** 유료 ERP — DB 저장·연동 */
export function hasErpAccess(ctx: AccessContext): boolean {
  if (ctx.isSuperAdmin) return true;
  if (isReverseTrial(ctx)) return true;
  const access = resolveAccessPlan(ctx.plan, ctx);
  return access === "ribbon_only" || access === "mini" || access === "light" || access === "pro" || access === "pro_plus";
}

/** AI 자동 파싱 기능 (주문, 지출 등) - 무료 티어 전면 차단 (트라이얼 포함) */
export function hasAiParseAccess(ctx: AccessContext): boolean {
  if (ctx.isSuperAdmin) return true;
  const access = resolveAccessPlan(ctx.plan, ctx);
  return access === "ribbon_only" || access === "mini" || access === "light" || access === "pro" || access === "pro_plus";
}

/** ERP 메뉴 열람·체험 (무료 포함) */
export function hasErpViewAccess(ctx: AccessContext): boolean {
  if (ctx.isSuperAdmin) return true;
  const access = resolveAccessPlan(ctx.plan, ctx);
  return access === "free" || access === "ribbon_only" || access === "mini" || access === "light" || access === "pro" || access === "pro_plus";
}

export function canPersistErp(ctx: AccessContext): boolean {
  return hasErpAccess(ctx);
}

export function isErpTrialMode(ctx: AccessContext): boolean {
  return hasErpViewAccess(ctx) && !canPersistErp(ctx);
}

/** 사이드바 ERP 메뉴 tier */
export const ERP_NAV_TIERS = ["pro_plus", "pro", "light", "mini", "ribbon_only", "free"] as const;

export function isFreeAccessTier(ctx: AccessContext): boolean {
  if (ctx.isSuperAdmin) return false;
  return resolveAccessPlan(ctx.plan, ctx) === "free";
}

/** 사이드바 tier 배열과 실효 플랜 매칭 */
export function navTierAllows(
  tiers: string[] | undefined,
  ctx: AccessContext & { isSuspended?: boolean },
): boolean {
  if (ctx.isSuperAdmin) return true;
  if (ctx.isSuspended) return !tiers?.length;
  if (!tiers?.length) return true;
  const access = resolveAccessPlan(ctx.plan, ctx);
  return tiers.includes(access);
}

/** 구독 결제 orderId / API용 — legacy `free` → ribbon_only */
export function normalizeSubscriptionPlanId(planId: string): PaidPlanId | null {
  if (planId === LEGACY_PRINT_PLAN_ID) return "ribbon_only";
  if ((PAID_PLAN_IDS as readonly string[]).includes(planId as PaidPlanId)) {
    return planId as PaidPlanId;
  }
  return null;
}

function freePrintStorageKey(tenantId: string): string {
  return `florasync_free_prints_lifetime_${tenantId}`;
}

export function getFreePrintsUsedToday(tenantId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(freePrintStorageKey(tenantId));
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

export function canUseFreeRibbonPrint(
  tenantId: string | undefined,
  opts?: { isGuestTrial?: boolean },
): boolean {
  if (!tenantId || !hasRegisteredStoreTenant(tenantId, { isGuestTrial: opts?.isGuestTrial })) {
    return false;
  }
  // 누적 5회 제한
  return getFreePrintsUsedToday(tenantId) < 5;
}

export function recordFreeRibbonPrint(tenantId: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = freePrintStorageKey(tenantId);
    const next = getFreePrintsUsedToday(tenantId) + 1;
    localStorage.setItem(key, String(next));
  } catch {
    /* ignore */
  }
}

export const FREE_TIER_FEATURES = {
  dashboard: true,
  settings: true,
  subscription: true,
  printerPreview: true,
  designStudioBrowse: true,
  designStudioExport: false,
  erpModulesTrial: true,
  erpModulesPersist: false,
} as const;
