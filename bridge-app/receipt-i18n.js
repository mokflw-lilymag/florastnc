const fs = require('fs');
const path = require('path');

const COUNTRY_LOCALE = {
  KR: 'ko',
  VN: 'vi',
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  JP: 'ja',
  US: 'en',
  GB: 'en',
  CA: 'en',
  AU: 'en',
  SG: 'en',
  ES: 'es',
  MX: 'es',
  FR: 'fr',
  DE: 'de',
  PT: 'pt',
  BR: 'pt',
  TH: 'th',
  ID: 'id',
  MY: 'en',
  NL: 'en',
  IT: 'en',
  IN: 'en',
  RU: 'ru',
  SA: 'ar',
  AE: 'ar',
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

function resolveReceiptLocale(settings = {}) {
  if (settings.receiptLocale) return settings.receiptLocale;
  if (settings.locale) return String(settings.locale).split('-')[0];
  const country = settings.country || 'KR';
  return COUNTRY_LOCALE[country] || 'ko';
}

function getLabels(assetsPath, locale) {
  const all = loadAllLabels(assetsPath);
  const base = String(locale || 'ko').split('-')[0];
  return all[locale] || all[base] || all.en || all.ko || {};
}

function fontFamilyForLocale(locale) {
  const base = String(locale || 'ko').split('-')[0];
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
  const intCurrencies = new Set(['KRW', 'VND', 'JPY']);
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
