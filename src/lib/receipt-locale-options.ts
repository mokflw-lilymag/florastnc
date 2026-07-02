/** ppBridge `receipt-labels.json` 에 정의된 영수증 라벨 언어 */
export const RECEIPT_LABEL_LOCALES = [
  "ko",
  "en",
  "vi",
  "ja",
  "zh",
  "zh-TW",
  "es",
  "fr",
  "de",
  "th",
  "id",
  "pt",
  "ru",
  "ar",
  "tr",
  "pl",
] as const;

export type ReceiptLabelLocale = (typeof RECEIPT_LABEL_LOCALES)[number];

export type ReceiptLocaleSetting = "auto" | ReceiptLabelLocale;

const RECEIPT_LOCALE_LABELS: Record<
  ReceiptLocaleSetting,
  { ko: string; en: string; vi: string }
> = {
  auto: {
    ko: "매장 기본 (UI·국가)",
    en: "Store default (UI & country)",
    vi: "Mặc định cửa hàng (UI & quốc gia)",
  },
  ko: { ko: "한국어", en: "Korean", vi: "Tiếng Hàn" },
  en: { ko: "English", en: "English", vi: "English" },
  vi: { ko: "Tiếng Việt", en: "Vietnamese", vi: "Tiếng Việt" },
  ja: { ko: "日本語", en: "Japanese", vi: "Tiếng Nhật" },
  zh: { ko: "中文 (간체)", en: "Chinese (Simplified)", vi: "Tiếng Trung (giản thể)" },
  "zh-TW": { ko: "繁體中文", en: "Chinese (Traditional)", vi: "Tiếng Trung (phồn thể)" },
  es: { ko: "Español", en: "Spanish", vi: "Tiếng Tây Ban Nha" },
  fr: { ko: "Français", en: "French", vi: "Tiếng Pháp" },
  de: { ko: "Deutsch", en: "German", vi: "Tiếng Đức" },
  th: { ko: "ภาษาไทย", en: "Thai", vi: "Tiếng Thái" },
  id: { ko: "Bahasa Indonesia", en: "Indonesian", vi: "Tiếng Indonesia" },
  pt: { ko: "Português", en: "Portuguese", vi: "Tiếng Bồ Đào Nha" },
  ru: { ko: "Русский", en: "Russian", vi: "Tiếng Nga" },
  ar: { ko: "العربية", en: "Arabic", vi: "Tiếng Ả Rập" },
  tr: { ko: "Türkçe", en: "Turkish", vi: "Tiếng Thổ Nhĩ Kỳ" },
  pl: { ko: "Polski", en: "Polish", vi: "Tiếng Ba Lan" },
};

export const RECEIPT_LOCALE_SELECT_OPTIONS: ReceiptLocaleSetting[] = [
  "auto",
  ...RECEIPT_LABEL_LOCALES,
];

export function receiptLocaleOptionLabel(
  value: ReceiptLocaleSetting,
  uiBase: "ko" | "en" | "vi" = "ko",
): string {
  const row = RECEIPT_LOCALE_LABELS[value];
  return row[uiBase] || row.en;
}

export function normalizeReceiptLocaleSetting(
  value: string | null | undefined,
): ReceiptLocaleSetting {
  if (!value || value === "auto") return "auto";
  if (value === "zh-TW" || value.toLowerCase() === "zh-tw") return "zh-TW";
  const base = value.split("-")[0].toLowerCase();
  const hit = RECEIPT_LABEL_LOCALES.find((l) => l.toLowerCase() === value.toLowerCase() || l === base);
  if (hit) return hit;
  if (base === "zh" && value.toLowerCase().includes("tw")) return "zh-TW";
  return "auto";
}
