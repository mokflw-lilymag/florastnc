"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // 리본 프린터 페이지는 사이드바에 바짝 붙여야 하므로 제약 조건 제거
  const isPrinterPage = pathname === "/dashboard/printer" || pathname?.startsWith("/dashboard/printer/");

  return (
    <main 
      className={cn(
        "flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50 relative z-0 transition-all duration-300 pb-24 lg:pb-0",
        isPrinterPage ? "p-0" : "p-4 md:p-6 lg:p-8"
      )}
    >
      <div 
        className={cn(
          "w-full transition-all duration-300",
          isPrinterPage ? "max-w-none" : "mx-auto max-w-7xl"
        )}
      >
        {children}
      </div>
    </main>
  );
}
