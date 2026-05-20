"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "emerald" | "orange" | "blue";

const GRADIENT: Record<Variant, string> = {
  emerald: "from-emerald-600 to-teal-600",
  orange: "from-orange-500 to-pink-500",
  blue: "from-blue-600 to-indigo-600",
};

type MobilePageHeaderProps = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: Variant;
  badge?: string;
  loading?: boolean;
  onRefresh?: () => void;
};

export function MobilePageHeader({
  title,
  subtitle,
  icon: Icon,
  variant = "emerald",
  badge,
  loading,
  onRefresh,
}: MobilePageHeaderProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 bg-gradient-to-r px-4 py-3 text-white shadow-md",
        GRADIENT[variant]
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold leading-none">{title}</p>
        <p className="mt-0.5 truncate text-xs text-white/70">
          {subtitle ?? format(new Date(), "M월 d일 (eee)", { locale: ko })}
        </p>
      </div>
      {badge ? (
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-emerald-600">
          {badge}
        </span>
      ) : null}
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-full p-2 hover:bg-white/20"
          aria-label="새로고침"
        >
          <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
        </button>
      ) : null}
    </div>
  );
}
