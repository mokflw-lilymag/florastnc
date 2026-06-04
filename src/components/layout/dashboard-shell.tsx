"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { DashboardMain } from "@/components/layout/dashboard-main";
import { isBarePrintDocumentPath } from "@/lib/print-routes";

type DashboardShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
  header: ReactNode;
  footer?: ReactNode;
  serverIsSuperAdmin?: boolean;
  tenantId?: string | null;
};

/** `/dashboard/mobile` — 사이드바·헤더 없이 풀스크린 모바일 매장 UI */
export function DashboardShell({
  children,
  sidebar,
  header,
  footer,
  serverIsSuperAdmin = false,
  tenantId,
}: DashboardShellProps) {
  const pathname = usePathname() ?? "";
  const isMobileWorkspace = pathname.startsWith("/dashboard/mobile");
  const isBarePrintDocument = isBarePrintDocumentPath(pathname);

  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electronAPI) {
      setIsElectron(true);
      
      // 🚀 [Phase 4] Offline Sync & Security Start
      if (tenantId) {
        import("@/utils/supabase/client").then(({ createClient }) => {
          const supabase = createClient();
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.access_token) {
              (window as any).electronAPI.startSync({
                access_token: session.access_token,
                tenant_id: tenantId,
              }).catch(console.error);
            }
          });
        });
      }
    }
  }, [tenantId]);

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
    <div className="flex flex-col h-screen overflow-hidden">
      {isElectron && (
        <div 
          className="shrink-0 h-10 w-full bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 select-none z-[9999]" 
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Floxync Desktop
          </span>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
        {sidebar}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {header}
          <DashboardMain serverIsSuperAdmin={serverIsSuperAdmin}>{children}</DashboardMain>
          {footer}
        </div>
      </div>
    </div>
  );
}
