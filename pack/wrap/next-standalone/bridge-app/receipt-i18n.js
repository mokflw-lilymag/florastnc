const fs = require('fs');
const path = require('path');

const COUNTRY_LOCALE = {
  KR: 'ko',
  JP: 'ja',
  CN: 'zh',
  TW: 'zh-TW',
  HK: 'zh-TW',
  VN: 'vi',
  ID: 'id',
  MY: 'en',
  TH: 'th',
  SG: 'en',
  PH: 'en',
  IN: 'en',
  AE: 'ar',
  SA: 'ar',
  TR: 'tr',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  GB: 'en',
  PT: 'pt',
  CH: 'de',
  NL: 'en',
  PL: 'pl',
  IT: 'en',
  RU: 'ru',
  US: 'en',
  CA: 'en',
  BR: 'pt',
  MX: 'es',
  AR: 'es',
  CL: 'es',
  AU: 'en',
  NZ: 'en',
  MZ: 'pt',
  EG: 'ar',
  ZA: 'en',
};

const REGIONAL_RECEIPT_LOCALE = {
  'zh-tw': 'zh-TW',
  'zh-hk': 'zh-TW',
  'zh-cn': 'zh',
  'pt-br': 'pt',
  'pt-mz': 'pt',
  'pt-pt': 'pt',
  'es-es': 'es',
  'es-mx': 'es',
  'es-ar': 'es',
  'es-cl': 'es',
  'de-ch': 'de',
  'fr-ca': 'fr',
  'en-us': 'en',
  'en-gb': 'en',
  'en-au': 'en',
  'en-sg': 'en',
  'en-ca': 'en',
  'en-nz': 'en',
  'ru-ru': 'ru',
};

let labelsCache = null;
let labelsCachePath = null;

function resolveAssetPath(assetsPath, filename) {
  const candidates = [
    path.join(assetsPath || '', filename),
    path.join(__dirname, filename),
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function loadAllLabels(assetsPath) {
  const labelsPath = resolveAssetPath(assetsPath, 'receipt-labels.json');
  if (!labelsPath) {
    labelsCache = { ko: {}, en: {} };
    labelsCachePath = '';
    return labelsCache;
  }
  if (labelsCache && labelsCachePath === labelsPath) return labelsCache;
  labelsCache = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
  labelsCachePath = labelsPath;
  return labelsCache;
}

function normalizeReceiptLocale(input) {
  if (input == null || input === '') return null;
  const raw = String(input).trim().replace(/_/g, '-');
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (REGIONAL_RECEIPT_LOCALE[lower]) return REGIONAL_RECEIPT_LOCALE[lower];
  if (lower.includes('-')) {
    const [lang, region] = lower.split('-');
    const compound = `${lang}-${region}`;
    if (REGIONAL_RECEIPT_LOCALE[compound]) return REGIONAL_RECEIPT_LOCALE[compound];
    if (lang === 'zh' && (region === 'tw' || region === 'hk')) return 'zh-TW';
    return `${lang}-${region.toUpperCase()}`;
  }
  return lower;
}

function resolveReceiptLocale(settings = {}) {
  const explicit = settings.receiptLocale;
  if (explicit && String(explicit).trim() && String(explicit).toLowerCase() !== 'auto') {
    return normalizeReceiptLocale(explicit) || 'ko';
  }
  if (settings.uiLocale) return normalizeReceiptLocale(settings.uiLocale) || 'ko';
  if (settings.locale) return normalizeReceiptLocale(settings.locale) || 'ko';
  const country = settings.country || 'KR';
  return COUNTRY_LOCALE[country] || 'en';
}

function getLabels(assetsPath, locale) {
  const all = loadAllLabels(assetsPath);
  const raw = String(locale || 'ko');
  const lower = raw.toLowerCase();
  const base = raw.split('-')[0];
  return (
    all[raw] ||
    all[lower] ||
    (lower === 'zh-tw' || lower === 'zh-hk' ? all['zh-TW'] : null) ||
    all[base] ||
    all.en ||
    all.ko ||
    {}
  );
}

function fontFamilyForLocale(locale) {
  const lower = String(locale || 'ko').toLowerCase();
  if (lower === 'zh-tw' || lower === 'zh-hk') {
    return "'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', sans-serif";
  }
  const base = lower.split('-')[0];
  if (base === 'ko') return "'Noto Sans KR', 'Malgun Gothic', sans-serif";
  if (base === 'ja') return "'Noto Sans JP', 'Hiragino Sans', sans-serif";
  if (base === 'zh') return "'Noto Sans SC', 'Microsoft YaHei', sans-serif";
  if (base === 'ar') return "'Noto Sans Arabic', 'Segoe UI', sans-serif";
  if (base === 'vi') return "'Noto Sans', 'Segoe UI', sans-serif";
  return "'Noto Sans', 'Segoe UI', sans-serif";
}

function formatReceiptMoney(amount, currency = 'KRW', locale = 'ko') {
  if (amount == null || amount === '') return '';
  const num = Number(amount);
  if (!Number.isFinite(num)) return String(amount);
  const intCurrencies = new Set(['KRW', 'VND', 'JPY', 'TWD', 'CLP']);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: intCurrencies.has(currency) ? 0 : 2,
    }).format(num);
  } catch {
    return `${num.toLocaleString(locale)} ${currency}`;
  }
}

function formatReceiptDateTime(date = new Date(), locale = 'ko') {
  try {
    return date.toLocaleString(locale);
  } catch {
    return date.toLocaleString('en');
  }
}

function isCardMessageType(type) {
  if (!type) return false;
  const t = String(type).toLowerCase();
  return t === 'card' || t === '카드' || t.includes('card');
}

function buildMessageTypeCheckHtml(labels, isRibbon, isCard) {
  return `
    <div style="font-size:14px; font-weight:bold; margin: 8px 0; padding: 6px; border: 1px solid #000; text-align:center; border-radius: 4px;">
      [${isRibbon ? '☑' : '☐'}] ${labels.ribbon || 'Ribbon'} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [${isCard ? '☑' : '☐'}] ${labels.card || 'Card'}
    </div>
  `;
}

function buildPrintTestHtml(labels, dateStr, branchName, bridgeVersion) {
  const bridgeLine = bridgeVersion
    ? `<div>${labels.bridge_label || 'Bridge'}: ${bridgeVersion}</div>`
    : '';
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>Print Test</title>
<style>
  @page { margin: 0; }
  body { font-family: 'Malgun Gothic', sans-serif; width: 72mm; margin: 0; padding: 10px 8px; color: #000; font-size: 14px; font-weight: 700; }
  .title { text-align: center; font-size: 22px; margin: 8px 0; }
  .box { border: 2px solid #000; padding: 10px; margin: 10px 0; text-align: center; }
  .line { border-top: 1px dashed #000; margin: 8px 0; }
</style></head><body>
  <div class="title">${labels.print_test_title || 'Print Test'}</div>
  <div class="line"></div>
  <div class="box">${labels.print_test_ok || 'OK'}<br/>${dateStr}</div>
  <div>${labels.branch || 'Branch'}: ${branchName || labels.branch_unset || '-'}</div>
  ${bridgeLine}
  <div class="line"></div>
  <div style="text-align:center;">${labels.print_test_success || 'Success'}</div>
</body></html>`;
}

function applyReceiptI18n(html, ctx) {
  const { labels = {}, locale = 'ko', fontFamily } = ctx;
  const ff = fontFamily || fontFamilyForLocale(locale);
  let out = html
    .replace(/\{\{locale\}\}/g, locale)
    .replace(/\{\{font_family\}\}/g, ff);
  for (const [key, value] of Object.entries(labels)) {
    out = out.replace(new RegExp(`\\{\\{label_${key}\\}\\}`, 'g'), value);
  }
  return out;
}

function loadTemplate(assetsPath, filename, ctx) {
  const p = resolveAssetPath(assetsPath, filename);
  const html = p ? fs.readFileSync(p, 'utf8') : '';
  return applyReceiptI18n(html, ctx);
}

function createReceiptContext(settings, assetsPath) {
  const locale = resolveReceiptLocale(settings);
  const labels = getLabels(assetsPath, locale);
  const currency = settings.currency || 'KRW';
  const fontFamily = fontFamilyForLocale(locale);
  return { locale, labels, currency, fontFamily };
}

module.exports = {
  COUNTRY_LOCALE,
  REGIONAL_RECEIPT_LOCALE,
  normalizeReceiptLocale,
  resolveReceiptLocale,
  getLabels,
  fontFamilyForLocale,
  formatReceiptMoney,
  formatReceiptDateTime,
  isCardMessageType,
  buildMessageTypeCheckHtml,
  buildPrintTestHtml,
  applyReceiptI18n,
  loadTemplate,
  createReceiptContext,
};
