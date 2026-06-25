/** 모바일 화면 금액 표시 — settings.currency + locale 기준 */
export function formatMobileCurrency(
  amount: number,
  locale: string,
  currency = "KRW",
): string {
  const intCurrencies = new Set(["KRW", "VND", "JPY"]);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: intCurrencies.has(currency) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(locale)} ${currency}`;
  }
}
