import ko from "@/i18n/messages/ko.json";
import en from "@/i18n/messages/en.json";
import dashboardKo from "@/i18n/messages/dashboard-ko.json";
import dashboardEn from "@/i18n/messages/dashboard-en.json";
import vi from "@/i18n/messages/vi.json";
import zh from "@/i18n/messages/zh.json";
import ja from "@/i18n/messages/ja.json";
import es from "@/i18n/messages/es.json";
import pt from "@/i18n/messages/pt.json";
import fr from "@/i18n/messages/fr.json";
import de from "@/i18n/messages/de.json";
import ru from "@/i18n/messages/ru.json";
import { AppLocale, resolveLocale, toBaseLocale } from "@/i18n/config";
import type { AppMessages, DashboardMessages } from "@/i18n/types";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, any> ? DeepPartial<T[K]> : T[K];
};

type CoreMessages = Omit<AppMessages, "dashboard">;

const BASE_MESSAGES: Record<"ko" | "en" | "vi" | "zh" | "ja" | "es" | "pt" | "fr" | "de" | "ru", CoreMessages> = {
  ko: ko as CoreMessages,
  en: en as CoreMessages,
  vi: vi as CoreMessages,
  zh: zh as CoreMessages,
  ja: ja as CoreMessages,
  es: es as CoreMessages,
  pt: pt as CoreMessages,
  fr: fr as CoreMessages,
  de: de as CoreMessages,
  ru: ru as CoreMessages,
};

const LOCALE_OVERRIDES: Partial<Record<AppLocale, DeepPartial<CoreMessages>>> = {
  "en-US": {
    localeLabel: "English (US)",
    landing: {
      testApply: {
        contact: "Phone",
      },
    },
  },
  "en-GB": {
    localeLabel: "English (UK)",
    landing: {
      testApply: {
        contact: "Telephone",
      },
    },
  },
  "en-AU": {
    localeLabel: "English (Australia)",
    landing: {
      testApply: {
        contact: "Phone",
      },
    },
  },
  "en-SG": {
    localeLabel: "English (Singapore)",
    landing: {
      testApply: {
        contact: "Mobile",
      },
    },
  },
  "en-CA": {
    localeLabel: "English (Canada)",
    landing: {
      testApply: {
        contact: "Phone",
      },
    },
  },
  "en-NZ": {
    localeLabel: "English (New Zealand)",
    landing: {
      testApply: {
        contact: "Mobile",
      },
    },
  },
  "es-ES": { localeLabel: "Español (España)" },
  "es-MX": {
    localeLabel: "Español (México)",
    landing: {
      testApply: {
        business: "Negocio",
        contact: "Teléfono",
      },
    },
  },
  "es-AR": {
    localeLabel: "Español (Argentina)",
    landing: {
      testApply: {
        business: "Local",
        contact: "Celular",
      },
    },
  },
  "es-CL": {
    localeLabel: "Español (Chile)",
    landing: {
      testApply: {
        business: "Local",
        contact: "Celular",
      },
    },
  },
  "pt-PT": { localeLabel: "Português (Portugal)" },
  "pt-BR": {
    localeLabel: "Português (Brasil)",
    landing: {
      testApply: {
        business: "Loja",
        contact: "Telefone",
      },
    },
  },
  "pt-MZ": {
    localeLabel: "Português (Moçambique)",
    landing: {
      testApply: {
        business: "Loja",
        contact: "Telemóvel",
      },
    },
  },
  "fr-FR": {
    localeLabel: "Français (France)",
    landing: {
      testApply: {
        business: "Boutique",
      },
    },
  },
  "fr-CA": {
    localeLabel: "Français (Canada)",
    landing: {
      testApply: {
        contact: "Téléphone",
      },
    },
  },
  "de-DE": {
    localeLabel: "Deutsch (Deutschland)",
    landing: {
      testApply: {
        business: "Geschäftsname",
      },
    },
  },
  "de-CH": {
    localeLabel: "Deutsch (Schweiz)",
    landing: {
      testApply: {
        business: "Ladengeschäft",
      },
    },
  },
  "ru-RU": { localeLabel: "Русский (Россия)" },
};

function deepMerge<T extends Record<string, any>>(base: T, override?: DeepPartial<T>): T {
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
      merged[key] = deepMerge(baseValue, nextValue as Partial<typeof baseValue>);
      continue;
    }
    if (nextValue !== undefined) {
      merged[key] = nextValue as T[typeof key];
    }
  }
  return merged;
}

function dashboardForLocale(baseLocale: string): DashboardMessages {
  return (baseLocale === "ko" ? dashboardKo : dashboardEn) as DashboardMessages;
}

export function getMessages(localeInput: AppLocale | string): AppMessages {
  const locale = resolveLocale(localeInput);
  const baseLocale = toBaseLocale(locale) as keyof typeof BASE_MESSAGES;
  const base = BASE_MESSAGES[baseLocale];
  const merged = deepMerge(base, LOCALE_OVERRIDES[locale] as DeepPartial<CoreMessages> | undefined);
  return {
    ...merged,
    dashboard: dashboardForLocale(baseLocale),
  };
}
