export const SUPPORTED_LOCALES = [
  "ko",
  "en",
  "vi",
  "zh",
  "ja",
  "es",
  "pt",
  "fr",
  "de",
  "ru",
  "id",
  "ms",
  "th",
  "en-US",
  "en-GB",
  "en-AU",
  "en-SG",
  "en-CA",
  "en-NZ",
  "es-ES",
  "es-MX",
  "es-AR",
  "es-CL",
  "pt-PT",
  "pt-BR",
  "pt-MZ",
  "fr-FR",
  "fr-CA",
  "de-DE",
  "de-CH",
  "ru-RU",
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "ko";
export const LOCALE_COOKIE = "preferred_locale";
const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);
const CANONICAL_LOCALE_MAP: Record<string, AppLocale> = SUPPORTED_LOCALES.reduce(
  (acc, locale) => {
    acc[locale.toLowerCase()] = locale;
    return acc;
  },
  {} as Record<string, AppLocale>
);

export function isSupportedLocale(locale: string): locale is AppLocale {
  return SUPPORTED_LOCALE_SET.has(locale);
}

export function resolveLocale(input?: string | null): AppLocale {
  if (!input) return DEFAULT_LOCALE;
  const normalizedKey = input.replace("_", "-").toLowerCase();
  return CANONICAL_LOCALE_MAP[normalizedKey] ?? DEFAULT_LOCALE;
}

export function normalizeLocale(input?: string | null): AppLocale {
  return resolveLocale(input);
}

export function toBaseLocale(locale: AppLocale): AppLocale {
  const base = locale.split("-")[0];
  return resolveLocale(base);
}

/** HTML `lang`, 스피치 API 등 — `toBaseLocale` 결과 → BCP 47 태그 */
export function bcp47LangTag(baseLocale: string): string {
  const map: Record<string, string> = {
    ko: "ko",
    vi: "vi",
    en: "en",
    zh: "zh",
    ja: "ja",
    es: "es",
    pt: "pt",
    fr: "fr",
    de: "de",
    ru: "ru",
    id: "id",
    ms: "ms",
    th: "th",
  };
  return map[baseLocale] ?? "en";
}

/** Web Speech API `SpeechRecognition.lang` — 브라우저가 잘 받는 지역 포함 태그 */
export function speechRecognitionLangTag(baseLocale: string): string {
  const map: Record<string, string> = {
    ko: "ko-KR",
    vi: "vi-VN",
    en: "en-US",
    zh: "zh-CN",
    ja: "ja-JP",
    es: "es-ES",
    pt: "pt-BR",
    fr: "fr-FR",
    de: "de-DE",
    ru: "ru-RU",
    id: "id-ID",
    ms: "ms-MY",
    th: "th-TH",
  };
  return map[baseLocale] ?? "en-US";
}

/** 클라이언트에서 `preferred_locale` 쿠키 기준 UI 로케일. SSR·훅 밖(Zustand 등)에서는 `ko` 폴백. */
export function readDocumentBaseLocale(): AppLocale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return toBaseLocale(resolveLocale(cookieValue));
}

export function localizePath(locale: AppLocale, path: string) {
  if (!path.startsWith("/")) return `/${locale}/${path}`;
  if (path === "/") return `/${locale}`;
  return `/${locale}${path}`;
}
