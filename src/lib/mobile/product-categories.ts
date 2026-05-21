import type { Product } from "@/types/product";

/** 빠른판매 POS · 모바일 주문접수 공통 카테고리 우선순위 */
export const MOBILE_PRODUCT_CATEGORY_PRIORITY = [
  "플라워",
  "플랜트",
  "자재",
  "기타상품",
  "어버이날",
] as const;

export const MOBILE_PRODUCT_ALL_CATEGORY = "전체";

/** 모바일 상품선택 카테고리 탭에서 숨길 분류 */
export const MOBILE_HIDDEN_PRODUCT_CATEGORIES = new Set([
  "경조사화환",
  "경조화환",
  "꽃다발",
  "꽃바구니",
  "동양란",
  "서양란",
  "식물/화분",
  "웨딩상품",
]);

const EXCLUDED_MAIN_CATEGORIES = new Set(["어버이날old"]);

export function isMobileVisibleProductCategory(category: string): boolean {
  return !MOBILE_HIDDEN_PRODUCT_CATEGORIES.has(category);
}

/** 모바일 POS/주문접수에서 제외할 상품 필터 */
export function normalizeMobileProducts(products: Product[]): Product[] {
  return products.filter(
    (p) => !EXCLUDED_MAIN_CATEGORIES.has(p.main_category ?? "")
  );
}

export function buildMobileProductCategories(products: Product[]): string[] {
  const allCats = Array.from(
    new Set(products.map((p) => p.main_category).filter(Boolean) as string[])
  ).filter(isMobileVisibleProductCategory);

  const sorted = [
    ...MOBILE_PRODUCT_CATEGORY_PRIORITY.filter((c) => allCats.includes(c)),
    ...allCats
      .filter((c) => !MOBILE_PRODUCT_CATEGORY_PRIORITY.includes(c as (typeof MOBILE_PRODUCT_CATEGORY_PRIORITY)[number]))
      .sort((a, b) => a.localeCompare(b, "ko")),
  ];

  return [...sorted, MOBILE_PRODUCT_ALL_CATEGORY];
}

export function countProductsByCategory(products: Product[]): Map<string, number> {
  const counts = new Map<string, number>();
  counts.set(MOBILE_PRODUCT_ALL_CATEGORY, products.length);

  for (const p of products) {
    const cat = p.main_category || "기타";
    if (!isMobileVisibleProductCategory(cat)) continue;
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  return counts;
}

export function filterProductsForMobilePicker(
  products: Product[],
  category: string | null,
  search: string
): Product[] {
  const q = search.trim().toLowerCase();
  let list =
    category && category !== MOBILE_PRODUCT_ALL_CATEGORY
      ? products.filter((p) => p.main_category === category)
      : products;

  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.main_category || "").toLowerCase().includes(q) ||
        (p.mid_category || "").toLowerCase().includes(q)
    );
  }

  return list;
}

export function resolveMobileProductCategory(
  categories: string[],
  selected: string | null,
  fallback: string = MOBILE_PRODUCT_CATEGORY_PRIORITY[0]
): string | null {
  if (selected && categories.includes(selected)) return selected;
  if (categories.length === 0) return null;
  if (categories.includes(fallback)) return fallback;
  return categories.find((c) => c !== MOBILE_PRODUCT_ALL_CATEGORY) ?? categories[0];
}
