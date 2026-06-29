import type { TenantMasterSeed } from "./types";
import {
  DEPRECATED_SEED_ALIASES,
  localePackLabel,
} from "./seed-locale-meta";
import { TENANT_MASTER_SEED_V2026_04_21_KR } from "./seeds/v2026-04-21";
import { TENANT_MASTER_SEED_V2026_04_21_EN } from "./seeds/v2026-04-21-en";
import { TENANT_MASTER_SEED_V2026_04_21_VI } from "./seeds/v2026-04-21-vi";
import { TENANT_MASTER_SEED_V2026_05_21_YEOUIDO } from "./seeds/v2026-05-21-yeouido.generated";

export interface TenantMasterSeedVersionInfo {
  id: string;
  label: string;
  locale: TenantMasterSeed["locale"];
  localeLabel: string;
  targetCountries: string[];
  deliveryTemplate?: TenantMasterSeed["deliveryTemplate"];
  deprecated?: boolean;
}

const PRIMARY_SEEDS: TenantMasterSeed[] = [
  TENANT_MASTER_SEED_V2026_04_21_KR,
  TENANT_MASTER_SEED_V2026_04_21_EN,
  TENANT_MASTER_SEED_V2026_04_21_VI,
  TENANT_MASTER_SEED_V2026_05_21_YEOUIDO,
];

function toVersionInfo(seed: TenantMasterSeed, deprecated = false): TenantMasterSeedVersionInfo {
  return {
    id: seed.version,
    label: seed.label,
    locale: seed.locale,
    localeLabel: localePackLabel(seed.locale),
    targetCountries: seed.targetCountries ?? [],
    deliveryTemplate: seed.deliveryTemplate,
    deprecated,
  };
}

const REGISTRY: Record<string, TenantMasterSeed> = {};

for (const seed of PRIMARY_SEEDS) {
  REGISTRY[seed.version] = seed;
}

for (const [alias, canonical] of Object.entries(DEPRECATED_SEED_ALIASES)) {
  const target = REGISTRY[canonical];
  if (target) REGISTRY[alias] = target;
}

export function listTenantMasterSeedVersions(): TenantMasterSeedVersionInfo[] {
  return PRIMARY_SEEDS.map((s) => toVersionInfo(s));
}

export function getTenantMasterSeed(versionId: string): TenantMasterSeed | null {
  return REGISTRY[versionId] ?? null;
}

export { recommendSeedVersionForCountry, seedLocaleMatchesCountry } from "./seed-locale-meta";
