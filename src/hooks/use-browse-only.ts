"use client";

import { useAuthStore } from "@/stores/auth-store";
import { canExecuteRibbonPrint } from "@/lib/subscription/browse-only";
import { hasRegisteredStoreTenant } from "@/lib/subscription/guest-trial";

/** 회원·매장 등록 전 구경 모드 / 실제 인쇄 가능 여부 */
export function useBrowseOnly() {
  const tenantId = useAuthStore((s) => s.tenantId);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const isGuestTrial = useAuthStore((s) => s._guestTrial);
  const user = useAuthStore((s) => s.user);

  const isBrowseOnly =
    isGuestTrial || !hasRegisteredStoreTenant(tenantId, { isGuestTrial });

  const canPrint = canExecuteRibbonPrint({
    isSuperAdmin,
    isBrowseOnly,
    tenantId,
    isGuestTrial,
  });

  return {
    isBrowseOnly,
    canPrint,
    isGuestTrial,
    needsOnboarding: !!user && !isGuestTrial && !tenantId,
  };
}
