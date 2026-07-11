import { useSettings } from "@/hooks/use-settings";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { useMemo } from "react";

export function useCurrency() {
  const { settings } = useSettings();
  const locale = usePreferredLocale();
  
  const baseLocale = toBaseLocale(locale);
  const currencyCode = settings?.currency || "KRW";

  const format = useMemo(() => {
    return (amount: number) => formatCurrency(amount, currencyCode, baseLocale);
  }, [currencyCode, baseLocale]);

  const symbol = useMemo(() => {
    return getCurrencySymbol(currencyCode, baseLocale);
  }, [currencyCode, baseLocale]);

  return {
    format,
    symbol,
    currencyCode
  };
}
