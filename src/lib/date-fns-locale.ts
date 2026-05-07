import type { Locale } from "date-fns";
import { de, enUS, es, fr, ja, ko, pt, ru, vi, zhCN, zhTW, id, ms, th, nl, it, hi, arSA } from "date-fns/locale";

/** App `toBaseLocale` (ko·en·vi·ja·zh·es·pt·fr·de·ru·id·ms·th·nl·it·hi·ar) → date-fns `Locale` for formatting. */
export function dateFnsLocaleForBase(baseLocale: string): Locale {
  switch (baseLocale) {
    case "ko": return ko;
    case "vi": return vi;
    case "ja": return ja;
    case "zh": return zhCN;
    case "zh-TW": return zhTW;
    case "es": return es;
    case "pt": return pt;
    case "fr": return fr;
    case "de": return de;
    case "ru": return ru;
    case "id": return id;
    case "ms": return ms;
    case "th": return th;
    case "nl": return nl;
    case "it": return it;
    case "hi": return hi;
    case "ar": return arSA;
    default: return enUS;
  }
}
