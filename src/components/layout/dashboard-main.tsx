"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useIsCapacitorAndroid } from "@/hooks/use-capacitor-android";
import { usePartnerTouchUi } from "@/hooks/use-partner-touch-ui";
import { OrgWorkContextBanner } from "@/components/hq/org-work-context-banner";

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAndroidApp = useIsCapacitorAndroid();
  const touchUi = usePartnerTouchUi();
  
  // 리본 프린터 및 디자인 스튜디오는 화면 전체를 사용해야 하므로 제약 조건 제거
  const isFullWidthPage = 
    pathname === "/dashboard/printer" || 
    pathname?.startsWith("/dashboard/printer/") ||
    pathname === "/dashboard/design-studio" ||
    pathname?.startsWith("/dashboard/design-studio/");

  return (
    <main 
      className={cn(
        "flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50 relative z-0 transition-all duration-300",
        isAndroidApp
          ? "pb-[calc(7.5rem+env(safe-area-inset-bottom))]"
          : "pb-24 lg:pb-0",
        isFullWidthPage ? "p-0" : cn("p-4 md:p-6 lg:p-8", touchUi && "px-3 sm:px-4")
      )}
    >
      <div 
        className={cn(
          "w-full transition-all duration-300 h-full",
          isFullWidthPage ? "max-w-none" : "mx-auto max-w-7xl"
        )}
      >
        <OrgWorkContextBanner />
        {children}
      </div>
    </main>
  );
}
