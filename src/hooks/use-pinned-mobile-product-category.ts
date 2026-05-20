"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MOBILE_PRODUCT_CATEGORY_PRIORITY, MOBILE_PRODUCT_ALL_CATEGORY } from "@/lib/mobile/product-categories";
import {
  readPinnedMobileProductCategory,
  writePinnedMobileProductCategory,
} from "@/lib/mobile/pinned-product-category";

export function usePinnedMobileProductCategory(categories: string[]) {
  const [pinnedCategory, setPinnedCategory] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPinnedCategory(readPinnedMobileProductCategory());
    setReady(true);
  }, []);

  const pinCategory = useCallback((category: string) => {
    if (!categories.includes(category)) return;
    writePinnedMobileProductCategory(category);
    setPinnedCategory(category);
    toast.success(`「${category}」을(를) 시작 카테고리로 고정했습니다.`);
  }, [categories]);

  const pinnedFallback =
    pinnedCategory && categories.includes(pinnedCategory)
      ? pinnedCategory
      : categories.includes(MOBILE_PRODUCT_CATEGORY_PRIORITY[0])
        ? MOBILE_PRODUCT_CATEGORY_PRIORITY[0]
        : categories.find((c) => c !== MOBILE_PRODUCT_ALL_CATEGORY) ?? null;

  return {
    pinnedCategory,
    pinCategory,
    pinnedFallback,
    ready,
  };
}
