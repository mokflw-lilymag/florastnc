import type { Locale } from "date-fns";
import { de, enUS, es, fr, ja, ko, pt, ru, vi, zhCN } from "date-fns/locale";

/** App `toBaseLocale` (ko·en·vi·ja·zh·es·pt·fr·de·ru) → date-fns `Locale` for formatting. */
export function dateFnsLocaleForBase(baseLocale: string): Locale {
  switch (baseLocale) {
    case "ko":
      return ko;
    case "vi":
      return vi;
    case "ja":
      return ja;
    case "zh":
      return zhCN;
    case "es":
      return es;
    case "pt":
      return pt;
    case "fr":
      return fr;
    case "de":
      return de;
    case "ru":
      return ru;
    default:
      return enUS;
  }
}
