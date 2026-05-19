/** 회원가입(매장 등록) 없이 메뉴만 둘러보는 체험 — 리본 출력 불가 */
export const GUEST_TRIAL_TENANT_ID = "00000000-0000-4000-8000-000000000001";

export const GUEST_BROWSE_COOKIE = "florasync_guest_browse";
export const GUEST_BROWSE_COOKIE_VALUE = "1";

const GUEST_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function isGuestBrowseCookieValue(value?: string | null): boolean {
  return value === GUEST_BROWSE_COOKIE_VALUE;
}

export function isGuestTrialTenantId(tenantId?: string | null): boolean {
  return tenantId === GUEST_TRIAL_TENANT_ID;
}

/** 실제 가입·온보딩으로 생성된 매장 테넌트인지 */
export function hasRegisteredStoreTenant(
  tenantId?: string | null,
  opts?: { isGuestTrial?: boolean },
): boolean {
  if (opts?.isGuestTrial) return false;
  if (!tenantId) return false;
  if (isGuestTrialTenantId(tenantId)) return false;
  return true;
}

export function setGuestBrowseCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${GUEST_BROWSE_COOKIE}=${GUEST_BROWSE_COOKIE_VALUE}; path=/; max-age=${GUEST_COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

export function clearGuestBrowseCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${GUEST_BROWSE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function readGuestBrowseCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((part) => part.trim() === `${GUEST_BROWSE_COOKIE}=${GUEST_BROWSE_COOKIE_VALUE}`);
}
