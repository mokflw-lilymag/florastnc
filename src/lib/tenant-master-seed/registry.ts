import type { TenantMasterSeed } from "./types";
import { TENANT_MASTER_SEED_V2026_04_21 } from "./seeds/v2026-04-21";
import { TENANT_MASTER_SEED_V2026_04_22_EASTPOLE } from "./seeds/v2026-04-22-eastpole.generated";

const REGISTRY: Record<string, TenantMasterSeed> = {
  [TENANT_MASTER_SEED_V2026_04_21.version]: TENANT_MASTER_SEED_V2026_04_21,
  [TENANT_MASTER_SEED_V2026_04_22_EASTPOLE.version]: TENANT_MASTER_SEED_V2026_04_22_EASTPOLE,
};

export function listTenantMasterSeedVersions(): { id: string; label: string }[] {
  return Object.values(REGISTRY).map((s) => ({ id: s.version, label: s.label }));
}

export function getTenantMasterSeed(versionId: string): TenantMasterSeed | null {
  return REGISTRY[versionId] ?? null;
}
