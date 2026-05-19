"use client";

import { useAuth } from "@/hooks/use-auth";
import {
  canPersistErp,
  hasErpAccess,
  hasErpViewAccess,
  hasRibbonAccess,
  isErpTrialMode,
  isFreeAccessTier,
  resolveAccessPlan,
} from "@/lib/subscription/plan-access";

export function useTenantPlanAccess() {
  const { profile, isSuperAdmin, tenantId, isLoading } = useAuth();
  const plan = profile?.tenants?.plan ?? "free";
  const subEnd = profile?.tenants?.subscription_end as string | null | undefined;
  const isExpired = !subEnd || new Date(subEnd) < new Date();
  const isSuspended = profile?.tenants?.status === "suspended";
  const ctx = { plan, isExpired, isSuspended, isSuperAdmin };

  return {
    isLoading,
    plan,
    accessPlan: resolveAccessPlan(plan, { isExpired, isSuspended }),
    isExpired,
    isSuspended,
    isFreeTier: isFreeAccessTier(ctx),
    hasRibbonAccess: hasRibbonAccess(ctx),
    hasErpAccess: hasErpAccess(ctx),
    hasErpViewAccess: hasErpViewAccess(ctx),
    isErpTrial: isErpTrialMode(ctx),
    canPersistErp: canPersistErp(ctx),
    tenantId,
    ctx,
  };
}
