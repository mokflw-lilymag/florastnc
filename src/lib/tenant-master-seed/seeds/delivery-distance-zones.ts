import type { TenantMasterSeedDelivery } from "../types";

/**
 * 매장 기준 거리 구역 배송비 템플릿 (해외 표준 시드).
 * `district` 필드는 지역명(구/동)뿐 아니라 거리 구역 라벨로도 사용됩니다.
 * 적용 후 설정 → 배송에서 금액·구역명을 매장 위치에 맞게 수정하세요.
 */
const EN_DISTANCE_ZONES: Array<{ district: string; fee: number }> = [
  { district: "Within 3 km (from shop)", fee: 5 },
  { district: "3–5 km", fee: 8 },
  { district: "5–10 km", fee: 12 },
  { district: "10–15 km", fee: 18 },
  { district: "15+ km (contact for quote)", fee: 25 },
];

const VI_DISTANCE_ZONES: Array<{ district: string; fee: number }> = [
  { district: "Trong 3 km (từ cửa hàng)", fee: 30000 },
  { district: "3–5 km", fee: 50000 },
  { district: "5–10 km", fee: 80000 },
  { district: "10–15 km", fee: 120000 },
  { district: "Trên 15 km (liên hệ báo giá)", fee: 150000 },
];

export function buildDistanceZoneDelivery(locale: "en" | "vi"): TenantMasterSeedDelivery {
  const zones = locale === "vi" ? VI_DISTANCE_ZONES : EN_DISTANCE_ZONES;
  return {
    districtDeliveryFees: zones.map((z) => ({ ...z })),
    defaultDeliveryFee: locale === "vi" ? 25000 : 5,
    freeDeliveryThreshold: locale === "vi" ? 500000 : 50,
  };
}
