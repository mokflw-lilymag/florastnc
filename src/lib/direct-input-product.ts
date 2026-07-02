import type { ProductData } from "@/types/product";

/** 주문 직접입력 시 DB에 들어가는 임시 대분류 */
export const DIRECT_INPUT_MAIN_CATEGORY = "기타";

/** 주문 직접입력 미정리 상품 마커 (중분류) */
export const DIRECT_INPUT_MID_CATEGORY = "직접입력";

/** 주문 직접입력 시 임시 공급처 */
export const DIRECT_INPUT_SUPPLIER = "직접입력";

export function isDirectInputPendingProduct(product: {
  mid_category?: string | null;
}): boolean {
  return (product.mid_category || "").trim() === DIRECT_INPUT_MID_CATEGORY;
}

/**
 * 직접입력 상품을 분류 수정해 저장할 때 임시 마커를 정리합니다.
 * 중분류가 '직접입력'에서 바뀌면 배지 조건이 해제되고, 공급처도 임시값이면 비웁니다.
 */
export function normalizeDirectInputProductOnSave(
  data: ProductData,
  previous?: { mid_category?: string | null; supplier?: string | null } | null,
): ProductData {
  if (!previous || !isDirectInputPendingProduct(previous)) return data;
  if (isDirectInputPendingProduct(data)) return data;

  const next = { ...data };
  if ((next.supplier || "").trim() === DIRECT_INPUT_SUPPLIER) {
    next.supplier = "";
  }
  return next;
}
