/** 관리자 매장 목록 — 국가 코드 표시용 */

export const TENANT_COUNTRY_META: Record<string, { flag: string; name: string }> = {
  KR: { flag: "🇰🇷", name: "대한민국" },
  VN: { flag: "🇻🇳", name: "베트남" },
  JP: { flag: "🇯🇵", name: "일본" },
  CN: { flag: "🇨🇳", name: "중국" },
  ID: { flag: "🇮🇩", name: "인도네시아" },
  MY: { flag: "🇲🇾", name: "말레이시아" },
  TH: { flag: "🇹🇭", name: "태국" },
  US: { flag: "🇺🇸", name: "미국" },
  GB: { flag: "🇬🇧", name: "영국" },
  FR: { flag: "🇫🇷", name: "프랑스" },
  DE: { flag: "🇩🇪", name: "독일" },
  ES: { flag: "🇪🇸", name: "스페인" },
  RU: { flag: "🇷🇺", name: "러시아" },
  SG: { flag: "🇸🇬", name: "싱가포르" },
  AU: { flag: "🇦🇺", name: "호주" },
  CA: { flag: "🇨🇦", name: "캐나다" },
};

export function tenantCountryLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return TENANT_COUNTRY_META[code]?.name ?? code;
}

export function tenantCountryFlag(code: string | null | undefined): string {
  if (!code) return "🌐";
  return TENANT_COUNTRY_META[code]?.flag ?? "🌐";
}
