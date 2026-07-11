const currencyLocaleMap: Record<string, string> = {
  KRW: 'ko-KR',
  USD: 'en-US',
  EUR: 'de-DE',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  GBP: 'en-GB',
  AUD: 'en-AU',
  CAD: 'en-CA',
  SGD: 'en-SG',
  VND: 'vi-VN',
  BRL: 'pt-BR',
  MXN: 'es-MX',
  CHF: 'de-CH',
};

export function getCurrencySymbol(currencyCode: string, fallbackLocale: string = 'en-US'): string {
  try {
    const locale = currencyLocaleMap[currencyCode] || fallbackLocale;
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).formatToParts(0);
    const currencyPart = parts.find(p => p.type === 'currency');
    return currencyPart ? currencyPart.value : currencyCode;
  } catch (e) {
    return currencyCode;
  }
}

export function formatCurrency(amount: number, currencyCode: string = 'KRW', fallbackLocale: string = 'en-US'): string {
  try {
    const locale = currencyLocaleMap[currencyCode] || fallbackLocale;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 // Handle cents for USD/EUR etc. smoothly
    }).format(amount);
  } catch (e) {
    return `${currencyCode} ${amount.toLocaleString(fallbackLocale)}`;
  }
}
