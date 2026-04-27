import type { AppLocale } from "@/i18n/config";
import { toBaseLocale } from "@/i18n/config";

/**
 * Bundle for one UI string across locales. Add optional keys (ja, vi, …) over time.
 * Resolution: exact `locale` → `toBaseLocale(locale)` → `en` → `ko`.
 *
 * Fast path for many languages: export `en` JSON as source, machine-translate to
 * `ja.json`, `vi.json`, then load maps at build time or merge into this shape.
 */
export type UiStringBundle = {
  ko: string;
  en: string;
} & Partial<
  Record<
    "ja" | "vi" | "zh" | "es" | "pt" | "fr" | "de" | "ru",
    string
  >
>;

export function pickUiString(locale: AppLocale, bundle: UiStringBundle): string {
  const base = toBaseLocale(locale);
  const extended = bundle as Record<string, string | undefined>;
  return extended[locale] ?? extended[base] ?? bundle.en ?? bundle.ko;
}
