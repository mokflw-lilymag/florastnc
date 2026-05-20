import { MOBILE_PRODUCT_ALL_CATEGORY } from "@/lib/mobile/product-categories";

/** 빠른판매 POS · 모바일 주문접수 공통 시작 카테고리 localStorage 키 */
export const MOBILE_PINNED_CATEGORY_STORAGE_KEY = "floxync_mobile_pinned_category";

const LEGACY_QUICK_POS_PINNED_KEY = "floxync_quickpos_pinned_category";

export function readPinnedMobileProductCategory(): string | null {
  if (typeof window === "undefined") return null;

  const pinned = localStorage.getItem(MOBILE_PINNED_CATEGORY_STORAGE_KEY);
  if (pinned) return pinned;

  const legacy = localStorage.getItem(LEGACY_QUICK_POS_PINNED_KEY);
  if (!legacy) return null;

  localStorage.setItem(MOBILE_PINNED_CATEGORY_STORAGE_KEY, legacy);
  localStorage.removeItem(LEGACY_QUICK_POS_PINNED_KEY);
  return legacy;
}

export function writePinnedMobileProductCategory(category: string): void {
  if (typeof window === "undefined") return;
  if (category === MOBILE_PRODUCT_ALL_CATEGORY) return;
  localStorage.setItem(MOBILE_PINNED_CATEGORY_STORAGE_KEY, category);
}

export function canPinMobileProductCategory(category: string): boolean {
  return category !== MOBILE_PRODUCT_ALL_CATEGORY;
}
