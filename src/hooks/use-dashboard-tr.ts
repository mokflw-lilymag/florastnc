"use client";

import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import type { AppLocale } from "@/i18n/config";
import { toBaseLocale } from "@/i18n/config";
import { pickUiString, type UiStringBundle } from "@/i18n/pick-ui-string";

/**
 * Standard dashboard copy helper: Korean + English + optional Vietnamese (tier‑1 locales).
 * For more languages without touching every call site, use `t(bundle)` with `UiStringBundle`.
 */
export function useDashboardTr() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string, viText?: string) => {
    if (baseLocale === "ko") return koText;
    if (baseLocale === "vi") return viText ?? enText;
    return enText;
  };
  const t = (bundle: UiStringBundle) => pickUiString(locale, bundle);
  return { tr, t, locale, baseLocale };
}
