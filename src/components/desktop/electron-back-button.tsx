"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type ElectronBackButtonProps = {
  className?: string;
  fallbackHref?: string;
};

/** Electron 타이틀 바 — 브라우저 뒤로가기, 기록 없으면 fallback */
export function ElectronBackButton({
  className,
  fallbackHref = "/dashboard",
}: ElectronBackButtonProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const handleBack = useCallback(() => {
    if (typeof window === "undefined") return;
    const currentPath = window.location.pathname;

    if (window.history.length > 1) {
      router.back();
      window.setTimeout(() => {
        if (window.location.pathname === currentPath) {
          router.replace(fallbackHref);
        }
      }, 400);
      return;
    }

    router.replace(fallbackHref);
  }, [router, fallbackHref]);

  if (pathname.startsWith("/dashboard")) return null;

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200/80 hover:text-emerald-700 transition-colors",
        className,
      )}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      이전 화면
    </button>
  );
}
