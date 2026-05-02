import { toBaseLocale, type AppLocale } from "@/i18n/config";

// --- 랜딩: 언어당 한 줄 (마케팅 페이지, 단순 선택) ---

export const LANDING_LOCALE_SELECT_OPTIONS: Array<{ value: AppLocale; label: string }> = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "ru", label: "Русский" },
];

/** 랜딩 셀렉트 값: 기본 언어 태그만 사용 (`en-US` → `en`) */
export function resolveLandingSelectLocale(current: AppLocale): AppLocale {
  return (
    LANDING_LOCALE_SELECT_OPTIONS.find((o) => o.value === current)?.value ??
    LANDING_LOCALE_SELECT_OPTIONS.find((o) => o.value === toBaseLocale(current))?.value ??
    "ko"
  );
}

// --- 대시보드·메인 앱: 나라·지역별 용어 차이 반영 (`getMessages` 오버라이드와 정합) ---

export const DASHBOARD_LOCALE_SELECT_OPTIONS: Array<{ value: AppLocale; label: string }> = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-SG", label: "English (Singapore)" },
  { value: "en-CA", label: "English (Canada)" },
  { value: "en-NZ", label: "English (New Zealand)" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "es", label: "Español" },
  { value: "es-ES", label: "Español (España)" },
  { value: "es-MX", label: "Español (México)" },
  { value: "es-AR", label: "Español (Argentina)" },
  { value: "es-CL", label: "Español (Chile)" },
  { value: "pt", label: "Português" },
  { value: "pt-PT", label: "Português (Portugal)" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "pt-MZ", label: "Português (Moçambique)" },
  { value: "fr", label: "Français" },
  { value: "fr-FR", label: "Français (France)" },
  { value: "fr-CA", label: "Français (Canada)" },
  { value: "de", label: "Deutsch" },
  { value: "de-DE", label: "Deutsch (Deutschland)" },
  { value: "de-CH", label: "Deutsch (Schweiz)" },
  { value: "ru", label: "Русский" },
  { value: "ru-RU", label: "Русский (Россия)" },
];

const DASHBOARD_OPTION_VALUES = new Set(
  DASHBOARD_LOCALE_SELECT_OPTIONS.map((o) => o.value)
);

/** 대시보드 셀렉트: 등록된 지역 코드 그대로, 없으면 기본 태그·폴백 */
export function resolveDashboardSelectLocale(current: AppLocale): AppLocale {
  if (DASHBOARD_OPTION_VALUES.has(current)) return current;
  const base = toBaseLocale(current);
  if (DASHBOARD_OPTION_VALUES.has(base)) return base;
  return "ko";
}
