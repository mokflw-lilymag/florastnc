"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { resolveLocale } from "@/i18n/config";
import { readUiLocaleCookie, syncUiLocaleCookieFromTenant } from "@/i18n/apply-ui-locale";
import { useSettings } from "@/hooks/use-settings";

/**
 * After login, sync the browser locale cookie from tenant `system_settings.data.uiLocale`
 * so SSR and client hooks match the cross-device source of truth.
 */
export function TenantLocaleSync() {
  const router = useRouter();
  const { settings, loading } = useSettings();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const tenantLocale = settings.uiLocale
      ? resolveLocale(settings.uiLocale)
      : null;
    if (!tenantLocale) return;

    const syncKey = tenantLocale;
    if (syncedRef.current === syncKey) return;

    const cookieBefore = readUiLocaleCookie();
    syncUiLocaleCookieFromTenant(tenantLocale);
    syncedRef.current = syncKey;

    if (cookieBefore !== tenantLocale) {
      router.refresh();
    }
  }, [loading, settings.uiLocale, router]);

  return null;
}
