import type { LandingFeatureDetailPagesMap } from "./types";
import { EN_DETAIL_PAGES } from "./en";
import { KO_DETAIL_PAGES } from "./ko";
import { JA_DETAIL_PAGES } from "./ja";
import { ZH_DETAIL_PAGES } from "./zh";
import { VI_DETAIL_PAGES } from "./vi";
import { ES_DETAIL_PAGES } from "./es";
import { PT_DETAIL_PAGES } from "./pt";
import { FR_DETAIL_PAGES } from "./fr";
import { DE_DETAIL_PAGES } from "./de";
import { RU_DETAIL_PAGES } from "./ru";

const BY_BASE: Record<string, LandingFeatureDetailPagesMap> = {
  ko: KO_DETAIL_PAGES,
  en: EN_DETAIL_PAGES,
  ja: JA_DETAIL_PAGES,
  zh: ZH_DETAIL_PAGES,
  vi: VI_DETAIL_PAGES,
  es: ES_DETAIL_PAGES,
  pt: PT_DETAIL_PAGES,
  fr: FR_DETAIL_PAGES,
  de: DE_DETAIL_PAGES,
  ru: RU_DETAIL_PAGES,
};

/** Localized long-form copy for `/[locale]/features/[slug]` (sections + CTA labels). */
export function getLandingFeatureDetailPages(baseLocale: string): LandingFeatureDetailPagesMap {
  return BY_BASE[baseLocale] ?? EN_DETAIL_PAGES;
}

export type { LandingFeatureDetailPagesMap, FeatureDetailPageMsg } from "./types";
