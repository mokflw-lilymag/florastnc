import { AppLocale, LOCALE_COOKIE, resolveLocale } from "@/i18n/config";

/** Keys checked in `system_settings.data` for tenant UI language (aligned with mobile). */
export const TENANT_UI_LOCALE_KEYS = [
  "uiLocale",
  "uiLanguage",
  "preferredLocale",
  "preferred_locale",
] as const;

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function extractUiLocaleFromTenantSettings(
  data: Record<string, unknown> | null | undefined,
): AppLocale | null {
  if (!data || typeof data !== "object") return null;
  for (const key of TENANT_UI_LOCALE_KEYS) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return resolveLocale(value);
    }
  }
  return null;
}

export function readUiLocaleCookie(): AppLocale | null {
  if (typeof document === "undefined") return null;
  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  if (!cookieValue) return null;
  return resolveLocale(cookieValue);
}

/** Update browser cookie and notify client hooks (`usePreferredLocale`, etc.). */
export function applyUiLocaleCookie(nextLocale: AppLocale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}`;
  window.dispatchEvent(new Event("preferred-locale-changed"));
}

/** When logged in, prefer tenant DB locale over the cookie if they differ. */
export function syncUiLocaleCookieFromTenant(
  tenantLocale: AppLocale | null | undefined,
): AppLocale | null {
  if (!tenantLocale) return null;
  const cookieLocale = readUiLocaleCookie();
  if (cookieLocale !== tenantLocale) {
    applyUiLocaleCookie(tenantLocale);
  }
  return tenantLocale;
}
