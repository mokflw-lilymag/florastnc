import type { TenantMasterSeed } from "./types";
import { TENANT_MASTER_SEED_V2026_04_21 } from "./seeds/v2026-04-21";
import { TENANT_MASTER_SEED_V2026_04_22_EASTPOLE } from "./seeds/v2026-04-22-eastpole.generated";
import { TENANT_MASTER_SEED_DELIVERY_GWANGHWAMUN } from "./seeds/delivery-gwanghwamun";

const TENANT_MASTER_SEED_V2026_04_22_EASTPOLE_WITH_DELIVERY: TenantMasterSeed = {
  ...TENANT_MASTER_SEED_V2026_04_22_EASTPOLE,
  delivery: { ...TENANT_MASTER_SEED_DELIVERY_GWANGHWAMUN },
};

const REGISTRY: Record<string, TenantMasterSeed> = {
  [TENANT_MASTER_SEED_V2026_04_21.version]: TENANT_MASTER_SEED_V2026_04_21,
  [TENANT_MASTER_SEED_V2026_04_22_EASTPOLE.version]: TENANT_MASTER_SEED_V2026_04_22_EASTPOLE_WITH_DELIVERY,
};

export function listTenantMasterSeedVersions(): { id: string; label: string }[] {
  return Object.values(REGISTRY).map((s) => ({ id: s.version, label: s.label }));
}

export function getTenantMasterSeed(versionId: string): TenantMasterSeed | null {
  return REGISTRY[versionId] ?? null;
}
