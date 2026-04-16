"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // 리본 프린터 및 디자인 스튜디오는 화면 전체를 사용해야 하므로 제약 조건 제거
  const isFullWidthPage = 
    pathname === "/dashboard/printer" || 
    pathname?.startsWith("/dashboard/printer/") ||
    pathname === "/dashboard/design-studio" ||
    pathname?.startsWith("/dashboard/design-studio/");

  return (
    <main 
      className={cn(
        "flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50 relative z-0 transition-all duration-300 pb-24 lg:pb-0",
        isFullWidthPage ? "p-0" : "p-4 md:p-6 lg:p-8"
      )}
    >
      <div 
        className={cn(
          "w-full transition-all duration-300 h-full",
          isFullWidthPage ? "max-w-none" : "mx-auto max-w-7xl"
        )}
      >
        {children}
      </div>
    </main>
  );
}
