import type { AppLocale } from "@/i18n/config";
import type { AppMessages, LandingMessages } from "@/i18n/types";

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

/** Locale JSON omits `featureDetailPages` (supplied from detail-bundles). */
export type CoreMessages = Omit<AppMessages, "dashboard" | "landing"> & {
  landing: Omit<LandingMessages, "featureDetailPages">;
};

export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override?: DeepPartial<T>,
): T {
  if (!override) return base;
  const merged = { ...base } as T;
  for (const key of Object.keys(override) as Array<keyof T>) {
    const baseValue = merged[key];
    const nextValue = override[key];
    if (
      baseValue &&
      nextValue &&
      typeof baseValue === "object" &&
      typeof nextValue === "object" &&
      !Array.isArray(baseValue) &&
      !Array.isArray(nextValue)
    ) {
      merged[key] = deepMerge(
        baseValue as Record<string, unknown>,
        nextValue as DeepPartial<Record<string, unknown>>,
      ) as T[typeof key];
      continue;
    }
    if (nextValue !== undefined) {
      merged[key] = nextValue as T[typeof key];
    }
  }
  return merged;
}

export const LOCALE_OVERRIDES: Partial<Record<AppLocale, DeepPartial<CoreMessages>>> = {
  "en-US": {
    localeLabel: "English (US)",
    landing: { testApply: { contact: "Phone" } },
  },
  "en-GB": {
    localeLabel: "English (UK)",
    landing: { testApply: { contact: "Telephone" } },
  },
  "en-AU": {
    localeLabel: "English (Australia)",
    landing: { testApply: { contact: "Phone" } },
  },
  "en-SG": {
    localeLabel: "English (Singapore)",
    landing: { testApply: { contact: "Mobile" } },
  },
  "en-CA": {
    localeLabel: "English (Canada)",
    landing: { testApply: { contact: "Phone" } },
  },
  "en-NZ": {
    localeLabel: "English (New Zealand)",
    landing: { testApply: { contact: "Mobile" } },
  },
  "es-ES": { localeLabel: "Español (España)" },
  "es-MX": {
    localeLabel: "Español (México)",
    landing: { testApply: { business: "Negocio", contact: "Teléfono" } },
  },
  "es-AR": {
    localeLabel: "Español (Argentina)",
    landing: { testApply: { business: "Local", contact: "Celular" } },
  },
  "es-CL": {
    localeLabel: "Español (Chile)",
    landing: { testApply: { business: "Local", contact: "Celular" } },
  },
  "pt-PT": { localeLabel: "Português (Portugal)" },
  "pt-BR": {
    localeLabel: "Português (Brasil)",
    landing: { testApply: { business: "Loja", contact: "Telefone" } },
  },
  "pt-MZ": {
    localeLabel: "Português (Moçambique)",
    landing: { testApply: { business: "Loja", contact: "Telemóvel" } },
  },
  "fr-FR": {
    localeLabel: "Français (France)",
    landing: { testApply: { business: "Boutique" } },
  },
  "fr-CA": {
    localeLabel: "Français (Canada)",
    landing: { testApply: { contact: "Téléphone" } },
  },
  "de-DE": {
    localeLabel: "Deutsch (Deutschland)",
    landing: { testApply: { business: "Geschäftsname" } },
  },
  "de-CH": {
    localeLabel: "Deutsch (Schweiz)",
    landing: { testApply: { business: "Ladengeschäft" } },
  },
  "ru-RU": { localeLabel: "Русский (Россия)" },
  id: { localeLabel: "Bahasa Indonesia" },
  ms: { localeLabel: "Bahasa Melayu" },
  th: { localeLabel: "ภาษาไทย" },
  nl: { localeLabel: "Nederlands" },
  it: { localeLabel: "Italiano" },
  hi: { localeLabel: "हिन्दी" },
  ar: { localeLabel: "العربية" },
};
