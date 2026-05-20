"use client";

import { Pin } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { canPinMobileProductCategory } from "@/lib/mobile/pinned-product-category";

type MobileProductCategoryPickerProps = {
  categories: string[];
  activeCategory: string | null;
  categoryCounts: Map<string, number>;
  pinnedCategory?: string | null;
  onSelect: (category: string) => void;
  onPinCategory?: (category: string) => void;
  accent?: "blue" | "orange";
};

export function MobileProductCategoryPicker({
  categories,
  activeCategory,
  categoryCounts,
  pinnedCategory = null,
  onSelect,
  onPinCategory,
  accent = "blue",
}: MobileProductCategoryPickerProps) {
  if (categories.length === 0) return null;

  const activeStyles =
    accent === "orange"
      ? "bg-orange-500 text-white shadow-sm"
      : "bg-blue-600 text-white shadow-sm";
  const inactiveStyles = "bg-gray-100 text-gray-700 active:bg-gray-200";
  const countActiveStyles =
    accent === "orange" ? "bg-orange-400 text-white" : "bg-blue-500 text-white";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold text-gray-600">카테고리</Label>
        {pinnedCategory ? (
          <span className="text-[10px] font-medium text-gray-500">
            시작 화면: 📌 {pinnedCategory}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">선택 후 📌으로 시작 화면 고정</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          const isPinned = pinnedCategory === cat;
          const count = categoryCounts.get(cat) ?? 0;
          const showPin =
            isActive &&
            canPinMobileProductCategory(cat) &&
            !!onPinCategory;

          const pinFilled = isPinned;
          const pinBtnClass =
            accent === "orange"
              ? pinFilled
                ? "bg-orange-500 text-white"
                : "border border-orange-200 bg-white text-orange-600"
              : pinFilled
                ? "bg-blue-600 text-white"
                : "border border-blue-200 bg-white text-blue-600";

          return (
            <div key={cat} className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelect(cat)}
                className={cn(
                  "inline-flex touch-manipulation items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap",
                  isActive ? activeStyles : inactiveStyles,
                  isPinned && !isActive && "ring-1 ring-amber-300"
                )}
              >
                {isPinned && !isActive ? <span aria-hidden>📌</span> : null}
                <span>{cat}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    isActive ? countActiveStyles : "bg-gray-200 text-gray-600"
                  )}
                >
                  {count}
                </span>
              </button>

              {showPin ? (
                <button
                  type="button"
                  title={
                    isPinned
                      ? "시작 카테고리로 고정됨"
                      : "이 카테고리를 시작 화면으로 고정"
                  }
                  aria-label={
                    isPinned
                      ? `${cat} 시작 카테고리로 고정됨`
                      : `${cat}을(를) 시작 화면으로 고정`
                  }
                  onClick={() => onPinCategory!(cat)}
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full transition-colors active:scale-95",
                    pinBtnClass
                  )}
                >
                  <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-current")} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
