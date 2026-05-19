import { hasRegisteredStoreTenant } from "@/lib/subscription/guest-trial";

/** 실제 인쇄·무료 출력 횟수 차감 — 가입·매장 등록 후에만 */
export function canExecuteRibbonPrint(opts: {
  isSuperAdmin?: boolean;
  isBrowseOnly?: boolean;
  tenantId?: string | null;
  isGuestTrial?: boolean;
}): boolean {
  if (opts.isSuperAdmin) return true;
  if (opts.isBrowseOnly) return false;
  return hasRegisteredStoreTenant(opts.tenantId, { isGuestTrial: opts.isGuestTrial });
}
