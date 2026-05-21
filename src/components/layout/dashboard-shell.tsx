"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardMain } from "@/components/layout/dashboard-main";
import { isBarePrintDocumentPath } from "@/lib/print-routes";

type DashboardShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
  header: ReactNode;
  footer?: ReactNode;
  serverIsSuperAdmin?: boolean;
};

/** `/dashboard/mobile` — 사이드바·헤더 없이 풀스크린 모바일 매장 UI */
export function DashboardShell({
  children,
  sidebar,
  header,
  footer,
  serverIsSuperAdmin = false,
}: DashboardShellProps) {
  const pathname = usePathname() ?? "";
  const isMobileWorkspace = pathname.startsWith("/dashboard/mobile");
  const isBarePrintDocument = isBarePrintDocumentPath(pathname);

  if (isBarePrintDocument) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  if (isMobileWorkspace) {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {sidebar}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {header}
        <DashboardMain serverIsSuperAdmin={serverIsSuperAdmin}>{children}</DashboardMain>
        {footer}
      </div>
    </div>
  );
}
