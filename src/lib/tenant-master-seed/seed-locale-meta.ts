import type { TenantMasterSeedLocale } from "./types";

/** 표준 로케일 팩 (v2026-04-21 계열) */
export const SEED_LOCALE_PACK_IDS = {
  kr: "v2026-04-21-kr",
  en: "v2026-04-21-en",
  vi: "v2026-04-21-vi",
} as const;

/** 이전 버전 ID — 감사·DB 이력 호환 */
export const DEPRECATED_SEED_ALIASES: Record<string, string> = {
  "v2026-04-21": SEED_LOCALE_PACK_IDS.kr,
};

export const STANDARD_SEED_PRODUCT_VERSIONS = [
  "v2026-04-21",
  SEED_LOCALE_PACK_IDS.kr,
  SEED_LOCALE_PACK_IDS.en,
  SEED_LOCALE_PACK_IDS.vi,
] as const;

/** 샘플 거래처 이름 패턴 (시드 교체 시 정리) */
export const SAMPLE_SUPPLIER_NAME_PATTERNS = [
  "%(샘플)%",
  "%(sample)%",
  "%(Sample)%",
  "%(mẫu)%",
  "%(Mẫu)%",
] as const;

const EN_TARGET_COUNTRIES = [
  "US",
  "GB",
  "AU",
  "CA",
  "NZ",
  "SG",
  "MY",
  "PH",
  "ID",
  "TH",
  "JP",
  "CN",
  "TW",
  "HK",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "PT",
  "AE",
] as const;

export function recommendSeedVersionForCountry(countryCode: string | null | undefined): string {
  const c = (countryCode || "KR").toUpperCase();
  if (c === "KR") return SEED_LOCALE_PACK_IDS.kr;
  if (c === "VN") return SEED_LOCALE_PACK_IDS.vi;
  return SEED_LOCALE_PACK_IDS.en;
}

export function seedLocaleMatchesCountry(
  seedLocale: TenantMasterSeedLocale,
  countryCode: string | null | undefined
): boolean {
  const c = (countryCode || "KR").toUpperCase();
  if (seedLocale === "ko") return c === "KR";
  if (seedLocale === "vi") return c === "VN";
  if (seedLocale === "en") return c !== "KR" && c !== "VN";
  return true;
}

export function localePackLabel(locale: TenantMasterSeedLocale): string {
  if (locale === "ko") return "한국 (KR)";
  if (locale === "vi") return "베트남 (VN)";
  return "글로벌 영문 (EN)";
}

export { EN_TARGET_COUNTRIES };
