import type { AccessContext } from "@/lib/subscription/plan-access";
import { resolveAccessPlan } from "@/lib/subscription/plan-access";

/** 매출 엔진 기능 — 플랜별 (master plan §10) */
export type RevenueFeature =
  | "anniversary_d7"
  | "order_followup"
  | "sns_manual"
  | "sns_autopilot"
  | "attribution_detail"
  | "flash_sale"
  | "naver_seo_pack";

const FEATURE_MATRIX: Record<string, RevenueFeature[]> = {
  free: ["sns_manual"],
  ribbon_only: ["sns_manual"],
  erp_only: ["anniversary_d7", "order_followup", "sns_manual", "attribution_detail"],
  pro: [
    "anniversary_d7",
    "order_followup",
    "sns_manual",
    "sns_autopilot",
    "attribution_detail",
    "flash_sale",
    "naver_seo_pack",
  ],
};

export const FREE_REVENUE_CAMPAIGNS_PER_MONTH = 5;

export function resolveRevenuePlan(ctx: AccessContext): string {
  if (ctx.isSuperAdmin) return "pro";
  return resolveAccessPlan(ctx.plan, ctx);
}

export function hasRevenueFeature(ctx: AccessContext, feature: RevenueFeature): boolean {
  if (ctx.isSuperAdmin) return true;
  const plan = resolveRevenuePlan(ctx);
  return (FEATURE_MATRIX[plan] ?? FEATURE_MATRIX.free).includes(feature);
}

export function getRevenueFeatureList(ctx: AccessContext): RevenueFeature[] {
  if (ctx.isSuperAdmin) return FEATURE_MATRIX.pro;
  const plan = resolveRevenuePlan(ctx);
  return FEATURE_MATRIX[plan] ?? FEATURE_MATRIX.free;
}

export function revenuePlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: "Free",
    ribbon_only: "PRINT CORE",
    erp_only: "ERP SMART",
    pro: "FLORA PRO",
  };
  return labels[plan] ?? plan;
}
