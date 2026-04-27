"use client";

import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import type { AppLocale } from "@/i18n/config";
import { toBaseLocale } from "@/i18n/config";
import { pickUiString, type UiStringBundle } from "@/i18n/pick-ui-string";

/**
 * Standard dashboard copy helper: Korean + English (current UI pattern).
 * For extra languages without touching every call site, use `t(bundle)` with
 * `UiStringBundle` and add `ja` / `vi` / … keys (or generate JSON from `en`).
 */
export function useDashboardTr() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) =>
    baseLocale === "ko" ? koText : enText;
  const t = (bundle: UiStringBundle) => pickUiString(locale, bundle);
  return { tr, t, locale, baseLocale };
}
