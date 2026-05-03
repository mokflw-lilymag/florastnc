import type { Locale } from "date-fns";
import { enUS, ko, vi } from "date-fns/locale";

/** App `toBaseLocale` (ko | vi | en | …) → date-fns `Locale` for formatting. */
export function dateFnsLocaleForBase(baseLocale: string): Locale {
  if (baseLocale === "ko") return ko;
  if (baseLocale === "vi") return vi;
  return enUS;
}
