"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePartnerTouchUi } from "@/hooks/use-partner-touch-ui";
import { OrgWorkContextBanner } from "@/components/hq/org-work-context-banner";

export function DashboardMain({
  children,
  serverIsSuperAdmin = false,
}: {
  children: React.ReactNode;
  serverIsSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const touchUi = usePartnerTouchUi();

  const isFullWidthPage =
    pathname === "/dashboard/printer" ||
    pathname?.startsWith("/dashboard/printer/") ||
    pathname === "/dashboard/design-studio" ||
    pathname?.startsWith("/dashboard/design-studio/");

  void serverIsSuperAdmin;

  return (
    <main
      className={cn(
        "relative z-0 flex-1 overflow-y-auto bg-zinc-50 transition-all duration-300 dark:bg-zinc-950/50",
        "pb-24 lg:pb-0",
        isFullWidthPage ? "p-0" : cn("p-4 md:p-6 lg:p-8", touchUi && "px-3 sm:px-4")
      )}
    >
      <div
        className="h-full w-full transition-all duration-300 max-w-none"
      >
        <OrgWorkContextBanner />
        {children}
      </div>
    </main>
  );
}
