import { GWANGHWAMUN_DISTRICT_DELIVERY_FEES } from "@/lib/gwanghwamun-delivery-fees";
import type { TenantMasterSeedDelivery } from "../types";

/** 릴리맥NC 광화문점 기준 배송비 — 시드 적용 시 DB·일반 설정에 함께 반영 */
export const TENANT_MASTER_SEED_DELIVERY_GWANGHWAMUN: TenantMasterSeedDelivery = {
  districtDeliveryFees: GWANGHWAMUN_DISTRICT_DELIVERY_FEES.map((r) => ({ ...r })),
  defaultDeliveryFee: 3000,
  freeDeliveryThreshold: 50000,
};
