import { AppLocale, resolveLocale, toBaseLocale } from "@/i18n/config";
import type { AppMessages, DashboardMessages, LandingMessages } from "@/i18n/types";
import { getLandingFeatureDetailPages } from "@/i18n/detail-bundles";
import { LOCALE_OVERRIDES, deepMerge, type CoreMessages, type DeepPartial } from "@/i18n/message-merge";

type BaseLocale = keyof typeof CORE_IMPORTERS;

const CORE_IMPORTERS = {
  ko: () => import("@/i18n/messages/ko.json"),
  en: () => import("@/i18n/messages/en.json"),
  vi: () => import("@/i18n/messages/vi.json"),
  zh: () => import("@/i18n/messages/zh.json"),
  "zh-TW": () => import("@/i18n/messages/zh-TW.json"),
  ja: () => import("@/i18n/messages/ja.json"),
  es: () => import("@/i18n/messages/es.json"),
  pt: () => import("@/i18n/messages/pt.json"),
  fr: () => import("@/i18n/messages/fr.json"),
  de: () => import("@/i18n/messages/de.json"),
  ru: () => import("@/i18n/messages/ru.json"),
  id: () => import("@/i18n/messages/id.json"),
  ms: () => import("@/i18n/messages/ms.json"),
  th: () => import("@/i18n/messages/th.json"),
  nl: () => import("@/i18n/messages/nl.json"),
  it: () => import("@/i18n/messages/it.json"),
  hi: () => import("@/i18n/messages/hi.json"),
  ar: () => import("@/i18n/messages/ar.json"),
} as const;

const DASHBOARD_IMPORTERS: Record<BaseLocale, () => Promise<{ default: DashboardMessages }>> = {
  ko: () => import("@/i18n/messages/dashboard-ko.json"),
  en: () => import("@/i18n/messages/dashboard-en.json"),
  vi: () => import("@/i18n/messages/dashboard-vi.json"),
  zh: () => import("@/i18n/messages/dashboard-zh.json"),
  "zh-TW": () => import("@/i18n/messages/dashboard-zh-TW.json"),
  ja: () => import("@/i18n/messages/dashboard-ja.json"),
  es: () => import("@/i18n/messages/dashboard-es.json"),
  pt: () => import("@/i18n/messages/dashboard-pt.json"),
  fr: () => import("@/i18n/messages/dashboard-fr.json"),
  de: () => import("@/i18n/messages/dashboard-de.json"),
  ru: () => import("@/i18n/messages/dashboard-ru.json"),
  id: () => import("@/i18n/messages/dashboard-id.json"),
  ms: () => import("@/i18n/messages/dashboard-ms.json"),
  th: () => import("@/i18n/messages/dashboard-th.json"),
  nl: () => import("@/i18n/messages/dashboard-nl.json"),
  it: () => import("@/i18n/messages/dashboard-it.json"),
  hi: () => import("@/i18n/messages/dashboard-hi.json"),
  ar: () => import("@/i18n/messages/dashboard-ar.json"),
};

async function loadCore(base: BaseLocale): Promise<CoreMessages> {
  const mod = await CORE_IMPORTERS[base]();
  return mod.default as CoreMessages;
}

async function loadDashboard(base: BaseLocale): Promise<DashboardMessages> {
  const enDash = (await DASHBOARD_IMPORTERS.en()).default as DashboardMessages;
  if (base === "en") return enDash;
  const localized = (await DASHBOARD_IMPORTERS[base]()).default as DashboardMessages;
  return deepMerge(enDash, localized as DeepPartial<DashboardMessages>);
}

async function buildCoreMessages(locale: AppLocale): Promise<CoreMessages> {
  const base = toBaseLocale(locale) as BaseLocale;
  const [enBase, actualBase] = await Promise.all([loadCore("en"), loadCore(base)]);
  const mergedBase =
    base === "en" ? actualBase : deepMerge(enBase, actualBase as DeepPartial<CoreMessages>);

  return deepMerge(
    mergedBase,
    LOCALE_OVERRIDES[locale] as DeepPartial<CoreMessages> | undefined,
  );
}

/** Public pages: core + landing only (no dashboard JSON). */
export async function loadPublicMessagesAsync(localeInput: AppLocale | string) {
  const locale = resolveLocale(localeInput);
  const base = toBaseLocale(locale) as BaseLocale;
  const merged = await buildCoreMessages(locale);
  const landing = merged.landing as LandingMessages;
  return {
    ...merged,
    landing: {
      ...landing,
      featureDetailPages: getLandingFeatureDetailPages(base),
    },
  };
}

/** Dashboard / app shell: loads only the active locale pair (core + dashboard). */
export async function loadMessagesAsync(localeInput: AppLocale | string): Promise<AppMessages> {
  const locale = resolveLocale(localeInput);
  const base = toBaseLocale(locale) as BaseLocale;
  const [merged, dashboard] = await Promise.all([
    buildCoreMessages(locale),
    loadDashboard(base),
  ]);
  const landing = merged.landing as LandingMessages;
  return {
    ...merged,
    landing: {
      ...landing,
      featureDetailPages: getLandingFeatureDetailPages(base),
    },
    dashboard,
  };
}

export type PublicMessages = Awaited<ReturnType<typeof loadPublicMessagesAsync>>;
