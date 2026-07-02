import { pickUiText } from "@/i18n/pick-ui-text";

export type OperatingRegionId =
  | "east_asia"
  | "southeast_asia"
  | "south_asia"
  | "middle_east"
  | "europe"
  | "americas"
  | "oceania"
  | "africa";

export const OPERATING_REGION_LABELS: Record<OperatingRegionId, string> = {
  east_asia: "동아시아",
  southeast_asia: "동남아시아",
  south_asia: "남아시아",
  middle_east: "중동",
  europe: "유럽",
  americas: "아메리카",
  oceania: "오세아니아",
  africa: "아프리카",
};

export const OPERATING_REGION_ORDER: OperatingRegionId[] = [
  "east_asia",
  "southeast_asia",
  "south_asia",
  "middle_east",
  "europe",
  "americas",
  "oceania",
  "africa",
];

/** FloXync 매장 운영 국가 — 설정·공지 타겟·관리자 목록 공통 소스 */
export const OPERATING_COUNTRIES = [
  { code: "KR", region: "east_asia" as const, nameKo: "대한민국", nameEn: "Korea", nameVi: "Hàn Quốc", flag: "🇰🇷", defaultCurrency: "KRW" },
  { code: "JP", region: "east_asia" as const, nameKo: "일본", nameEn: "Japan", nameVi: "Nhật Bản", flag: "🇯🇵", defaultCurrency: "JPY" },
  { code: "CN", region: "east_asia" as const, nameKo: "중국", nameEn: "China", nameVi: "Trung Quốc", flag: "🇨🇳", defaultCurrency: "CNY" },
  { code: "TW", region: "east_asia" as const, nameKo: "대만", nameEn: "Taiwan", nameVi: "Đài Loan", flag: "🇹🇼", defaultCurrency: "TWD" },
  { code: "HK", region: "east_asia" as const, nameKo: "홍콩", nameEn: "Hong Kong", nameVi: "Hồng Kông", flag: "🇭🇰", defaultCurrency: "HKD" },
  { code: "VN", region: "southeast_asia" as const, nameKo: "베트남", nameEn: "Vietnam", nameVi: "Việt Nam", flag: "🇻🇳", defaultCurrency: "VND" },
  { code: "ID", region: "southeast_asia" as const, nameKo: "인도네시아", nameEn: "Indonesia", nameVi: "Indonesia", flag: "🇮🇩", defaultCurrency: "IDR" },
  { code: "MY", region: "southeast_asia" as const, nameKo: "말레이시아", nameEn: "Malaysia", nameVi: "Malaysia", flag: "🇲🇾", defaultCurrency: "MYR" },
  { code: "TH", region: "southeast_asia" as const, nameKo: "태국", nameEn: "Thailand", nameVi: "Thái Lan", flag: "🇹🇭", defaultCurrency: "THB" },
  { code: "SG", region: "southeast_asia" as const, nameKo: "싱가포르", nameEn: "Singapore", nameVi: "Singapore", flag: "🇸🇬", defaultCurrency: "SGD" },
  { code: "PH", region: "southeast_asia" as const, nameKo: "필리핀", nameEn: "Philippines", nameVi: "Philippines", flag: "🇵🇭", defaultCurrency: "PHP" },
  { code: "IN", region: "south_asia" as const, nameKo: "인도", nameEn: "India", nameVi: "Ấn Độ", flag: "🇮🇳", defaultCurrency: "INR" },
  { code: "AE", region: "middle_east" as const, nameKo: "아랍에미리트", nameEn: "United Arab Emirates", nameVi: "Các Tiểu vương quốc Ả Rập Thống nhất", flag: "🇦🇪", defaultCurrency: "AED" },
  { code: "SA", region: "middle_east" as const, nameKo: "사우디아라비아", nameEn: "Saudi Arabia", nameVi: "Ả Rập Xê Út", flag: "🇸🇦", defaultCurrency: "SAR" },
  { code: "TR", region: "middle_east" as const, nameKo: "터키", nameEn: "Turkey", nameVi: "Thổ Nhĩ Kỳ", flag: "🇹🇷", defaultCurrency: "TRY" },
  { code: "ES", region: "europe" as const, nameKo: "스페인", nameEn: "Spain", nameVi: "Tây Ban Nha", flag: "🇪🇸", defaultCurrency: "EUR" },
  { code: "FR", region: "europe" as const, nameKo: "프랑스", nameEn: "France", nameVi: "Pháp", flag: "🇫🇷", defaultCurrency: "EUR" },
  { code: "DE", region: "europe" as const, nameKo: "독일", nameEn: "Germany", nameVi: "Đức", flag: "🇩🇪", defaultCurrency: "EUR" },
  { code: "GB", region: "europe" as const, nameKo: "영국", nameEn: "United Kingdom", nameVi: "Vương quốc Anh", flag: "🇬🇧", defaultCurrency: "GBP" },
  { code: "PT", region: "europe" as const, nameKo: "포르투갈", nameEn: "Portugal", nameVi: "Bồ Đào Nha", flag: "🇵🇹", defaultCurrency: "EUR" },
  { code: "CH", region: "europe" as const, nameKo: "스위스", nameEn: "Switzerland", nameVi: "Thụy Sĩ", flag: "🇨🇭", defaultCurrency: "CHF" },
  { code: "NL", region: "europe" as const, nameKo: "네덜란드", nameEn: "Netherlands", nameVi: "Hà Lan", flag: "🇳🇱", defaultCurrency: "EUR" },
  { code: "PL", region: "europe" as const, nameKo: "폴란드", nameEn: "Poland", nameVi: "Ba Lan", flag: "🇵🇱", defaultCurrency: "PLN" },
  { code: "IT", region: "europe" as const, nameKo: "이탈리아", nameEn: "Italy", nameVi: "Ý", flag: "🇮🇹", defaultCurrency: "EUR" },
  { code: "RU", region: "europe" as const, nameKo: "러시아", nameEn: "Russia", nameVi: "Nga", flag: "🇷🇺", defaultCurrency: "RUB" },
  { code: "US", region: "americas" as const, nameKo: "미국", nameEn: "United States", nameVi: "Hoa Kỳ", flag: "🇺🇸", defaultCurrency: "USD" },
  { code: "CA", region: "americas" as const, nameKo: "캐나다", nameEn: "Canada", nameVi: "Canada", flag: "🇨🇦", defaultCurrency: "CAD" },
  { code: "BR", region: "americas" as const, nameKo: "브라질", nameEn: "Brazil", nameVi: "Brazil", flag: "🇧🇷", defaultCurrency: "BRL" },
  { code: "MX", region: "americas" as const, nameKo: "멕시코", nameEn: "Mexico", nameVi: "Mexico", flag: "🇲🇽", defaultCurrency: "MXN" },
  { code: "AR", region: "americas" as const, nameKo: "아르헨티나", nameEn: "Argentina", nameVi: "Argentina", flag: "🇦🇷", defaultCurrency: "ARS" },
  { code: "CL", region: "americas" as const, nameKo: "칠레", nameEn: "Chile", nameVi: "Chile", flag: "🇨🇱", defaultCurrency: "CLP" },
  { code: "AU", region: "oceania" as const, nameKo: "호주", nameEn: "Australia", nameVi: "Úc", flag: "🇦🇺", defaultCurrency: "AUD" },
  { code: "NZ", region: "oceania" as const, nameKo: "뉴질랜드", nameEn: "New Zealand", nameVi: "New Zealand", flag: "🇳🇿", defaultCurrency: "NZD" },
  { code: "MZ", region: "africa" as const, nameKo: "모잠비크", nameEn: "Mozambique", nameVi: "Mozambique", flag: "🇲🇿", defaultCurrency: "MZN" },
  { code: "EG", region: "africa" as const, nameKo: "이집트", nameEn: "Egypt", nameVi: "Ai Cập", flag: "🇪🇬", defaultCurrency: "EGP" },
  { code: "ZA", region: "africa" as const, nameKo: "남아프리카공화국", nameEn: "South Africa", nameVi: "Nam Phi", flag: "🇿🇦", defaultCurrency: "ZAR" },
] as const;

export type OperatingCountryRow = (typeof OPERATING_COUNTRIES)[number];
export type OperatingCountryCode = OperatingCountryRow["code"];

export const OPERATING_COUNTRY_BY_CODE: Record<OperatingCountryCode, OperatingCountryRow> = Object.fromEntries(
  OPERATING_COUNTRIES.map((c) => [c.code, c]),
) as Record<OperatingCountryCode, OperatingCountryRow>;

/** ko·en·vi 외 로케일용 국가 표기 */
const OPERATING_COUNTRY_NAME_EXTRAS: Record<
  OperatingCountryCode,
  { ja: string; zh: string; es: string; pt: string; fr: string; de: string; ru: string }
> = {
  KR: { ja: "韓国", zh: "韩国", es: "Corea del Sur", pt: "Coreia do Sul", fr: "Corée du Sud", de: "Südkorea", ru: "Республика Корея" },
  VN: { ja: "ベトナム", zh: "越南", es: "Vietnam", pt: "Vietnã", fr: "Viêt Nam", de: "Vietnam", ru: "Вьетнам" },
  US: { ja: "アメリカ", zh: "美国", es: "Estados Unidos", pt: "Estados Unidos", fr: "États-Unis", de: "USA", ru: "США" },
  JP: { ja: "日本", zh: "日本", es: "Japón", pt: "Japão", fr: "Japon", de: "Japan", ru: "Япония" },
  CN: { ja: "中国", zh: "中国", es: "China", pt: "China", fr: "Chine", de: "China", ru: "Китай" },
  TW: { ja: "台湾", zh: "台湾", es: "Taiwán", pt: "Taiwan", fr: "Taïwan", de: "Taiwan", ru: "Тайвань" },
  HK: { ja: "香港", zh: "香港", es: "Hong Kong", pt: "Hong Kong", fr: "Hong Kong", de: "Hongkong", ru: "Гонконг" },
  PH: { ja: "フィリピン", zh: "菲律宾", es: "Filipinas", pt: "Filipinas", fr: "Philippines", de: "Philippinen", ru: "Филиппины" },
  TR: { ja: "トルコ", zh: "土耳其", es: "Turquía", pt: "Turquia", fr: "Turquie", de: "Türkei", ru: "Турция" },
  PL: { ja: "ポーランド", zh: "波兰", es: "Polonia", pt: "Polónia", fr: "Pologne", de: "Polen", ru: "Польша" },
  ES: { ja: "スペイン", zh: "西班牙", es: "España", pt: "Espanha", fr: "Espagne", de: "Spanien", ru: "Испания" },
  FR: { ja: "フランス", zh: "法国", es: "Francia", pt: "França", fr: "France", de: "Frankreich", ru: "Франция" },
  DE: { ja: "ドイツ", zh: "德国", es: "Alemania", pt: "Alemanha", fr: "Allemagne", de: "Deutschland", ru: "Германия" },
  GB: { ja: "イギリス", zh: "英国", es: "Reino Unido", pt: "Reino Unido", fr: "Royaume-Uni", de: "Vereinigtes Königreich", ru: "Великобритания" },
  AU: { ja: "オーストラリア", zh: "澳大利亚", es: "Australia", pt: "Austrália", fr: "Australie", de: "Australien", ru: "Австралия" },
  CA: { ja: "カナダ", zh: "加拿大", es: "Canadá", pt: "Canadá", fr: "Canada", de: "Kanada", ru: "Канада" },
  SG: { ja: "シンガポール", zh: "新加坡", es: "Singapur", pt: "Singapura", fr: "Singapour", de: "Singapur", ru: "Сингапур" },
  BR: { ja: "ブラジル", zh: "巴西", es: "Brasil", pt: "Brasil", fr: "Brésil", de: "Brasilien", ru: "Бразилия" },
  MX: { ja: "メキシコ", zh: "墨西哥", es: "México", pt: "México", fr: "Mexique", de: "Mexiko", ru: "Мексика" },
  PT: { ja: "ポルトガル", zh: "葡萄牙", es: "Portugal", pt: "Portugal", fr: "Portugal", de: "Portugal", ru: "Португалия" },
  CH: { ja: "スイス", zh: "瑞士", es: "Suiza", pt: "Suíça", fr: "Suisse", de: "Schweiz", ru: "Швейцария" },
  AR: { ja: "アルゼンチン", zh: "阿根廷", es: "Argentina", pt: "Argentina", fr: "Argentine", de: "Argentinien", ru: "Аргентина" },
  NZ: { ja: "ニュージーランド", zh: "新西兰", es: "Nueva Zelanda", pt: "Nova Zelândia", fr: "Nouvelle-Zélande", de: "Neuseeland", ru: "Новая Зеландия" },
  CL: { ja: "チリ", zh: "智利", es: "Chile", pt: "Chile", fr: "Chili", de: "Chile", ru: "Чили" },
  MZ: { ja: "モザンビーク", zh: "莫桑比克", es: "Mozambique", pt: "Moçambique", fr: "Mozambique", de: "Mosambik", ru: "Мозамбик" },
  EG: { ja: "エジプト", zh: "埃及", es: "Egipto", pt: "Egito", fr: "Égypte", de: "Ägypten", ru: "Египет" },
  ZA: { ja: "南アフリカ", zh: "南非", es: "Sudáfrica", pt: "África do Sul", fr: "Afrique du Sud", de: "Südafrika", ru: "ЮАР" },
  RU: { ja: "ロシア", zh: "俄罗斯", es: "Rusia", pt: "Rússia", fr: "Russie", de: "Russland", ru: "Россия" },
  ID: { ja: "インドネシア", zh: "印度尼西亚", es: "Indonesia", pt: "Indonésia", fr: "Indonésie", de: "Indonesien", ru: "Индонезия" },
  MY: { ja: "マレーシア", zh: "马来西亚", es: "Malasia", pt: "Malásia", fr: "Malaisie", de: "Malaysia", ru: "Малайзия" },
  TH: { ja: "タイ", zh: "泰国", es: "Tailandia", pt: "Tailândia", fr: "Thaïlande", de: "Thailand", ru: "Таиланд" },
  NL: { ja: "オランダ", zh: "荷兰", es: "Países Bajos", pt: "Países Baixos", fr: "Pays-Bas", de: "Niederlande", ru: "Нидерланды" },
  IT: { ja: "イタリア", zh: "意大利", es: "Italia", pt: "Itália", fr: "Italie", de: "Italien", ru: "Италия" },
  IN: { ja: "インド", zh: "印度", es: "India", pt: "Índia", fr: "Inde", de: "Indien", ru: "Индия" },
  AE: { ja: "アラブ首長国連邦", zh: "阿拉伯联合酋长国", es: "Emiratos Árabes Unidos", pt: "Emirados Árabes Unidos", fr: "Émirats arabes unis", de: "Vereinigte Arabische Emirate", ru: "ОАЭ" },
  SA: { ja: "サウジアラビア", zh: "沙特阿拉伯", es: "Arabia Saudita", pt: "Arábia Saudita", fr: "Arabie Saoudite", de: "Saudi-Arabien", ru: "Саудовская Аравия" },
};

export function operatingCountryDisplayName(baseLocale: string, country: OperatingCountryRow): string {
  const x = OPERATING_COUNTRY_NAME_EXTRAS[country.code];
  if (!x) {
    return pickUiText(baseLocale, country.nameKo, country.nameEn, country.nameVi);
  }
  return pickUiText(
    baseLocale,
    country.nameKo,
    country.nameEn,
    country.nameVi,
    x.ja,
    x.zh,
    x.es,
    x.pt,
    x.fr,
    x.de,
    x.ru,
  );
}

export function getOperatingCountriesByRegion(): {
  region: OperatingRegionId;
  label: string;
  countries: OperatingCountryRow[];
}[] {
  return OPERATING_REGION_ORDER.map((region) => ({
    region,
    label: OPERATING_REGION_LABELS[region],
    countries: OPERATING_COUNTRIES.filter((c) => c.region === region),
  })).filter((g) => g.countries.length > 0);
}
