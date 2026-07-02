import { TENANT_COUNTRY_META } from "@/lib/admin/tenant-country-meta";
import { getOperatingCountriesByRegion } from "@/lib/operating-countries";

export const ANNOUNCEMENT_COUNTRY_REGIONS = getOperatingCountriesByRegion();

export const ANNOUNCEMENT_PLAN_OPTIONS = [
  { id: "free", label: "무료 체험판" },
  { id: "ribbon_only", label: "리본 라이센스" },
  { id: "light", label: "플로비서 라이트" },
  { id: "pro", label: "플로비서 프로" },
  { id: "pro_plus", label: "플로비서 프로 플러스" },
] as const;

export type TenantTargeting = {
  country?: string | null;
  plan?: string | null;
};

function normalizedTargets(values: string[] | null | undefined): string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

/** 공지가 해당 매장(국가·플랜)에 노출되는지 */
export function announcementMatchesTenant(
  ann: {
    target_countries?: string[] | null;
    target_plans?: string[] | null;
  },
  tenant: TenantTargeting | null,
): boolean {
  const countries = normalizedTargets(ann.target_countries);
  const plans = normalizedTargets(ann.target_plans);

  if (!tenant) {
    return countries.length === 0 && plans.length === 0;
  }

  const country = tenant.country?.trim() || "KR";
  const plan = tenant.plan?.trim() || "free";

  if (countries.length > 0 && !countries.includes(country)) return false;
  if (plans.length > 0 && !plans.includes(plan)) return false;
  return true;
}

export function formatTargetCountries(codes: string[] | null | undefined): string {
  const list = normalizedTargets(codes);
  if (list.length === 0) return "전체 국가";
  return list
    .map((c) => {
      const meta = TENANT_COUNTRY_META[c];
      return meta ? `${meta.flag} ${meta.name}` : c;
    })
    .join(", ");
}

export function formatTargetPlans(plans: string[] | null | undefined): string {
  const list = normalizedTargets(plans);
  if (list.length === 0) return "전체 요금제";
  const labelById = Object.fromEntries(ANNOUNCEMENT_PLAN_OPTIONS.map((p) => [p.id, p.label]));
  return list.map((p) => labelById[p] ?? p).join(", ");
}

export function parseTargetArray(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const arr = input.map((v) => String(v).trim()).filter(Boolean);
  return arr.length > 0 ? arr : null;
}
