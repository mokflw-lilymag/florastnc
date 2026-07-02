/** 관리자 매장 목록 — 국가 코드 표시용 */

import { OPERATING_COUNTRIES } from "@/lib/operating-countries";

export const TENANT_COUNTRY_META: Record<string, { flag: string; name: string }> = Object.fromEntries(
  OPERATING_COUNTRIES.map((c) => [c.code, { flag: c.flag, name: c.nameKo }]),
);

export function tenantCountryLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return TENANT_COUNTRY_META[code]?.name ?? code;
}

export function tenantCountryFlag(code: string | null | undefined): string {
  if (!code) return "🌐";
  return TENANT_COUNTRY_META[code]?.flag ?? "🌐";
}
