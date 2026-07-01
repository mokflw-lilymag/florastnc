"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { DashboardMain } from "@/components/layout/dashboard-main";
import { isBarePrintDocumentPath } from "@/lib/print-routes";
import { applyElectronSyncScope } from "@/lib/electron-sync-scope";
import { logError } from "@/lib/errorLogger";
import { MobilePrintPoller } from "@/components/desktop/mobile-print-poller";
import { DeliveryPrepReminder } from "@/app/dashboard/orders/components/delivery-prep-reminder";
import { ExternalOrdersAlertProvider } from "@/components/desktop/external-orders-alert-provider";
import { ElectronTitleBar } from "@/components/desktop/electron-title-bar";
import { TenantLocaleSync } from "@/components/providers/tenant-locale-sync";
import { DashboardStoreNameProvider } from "@/components/providers/dashboard-tenant-context";
import { toast } from "sonner";

type DashboardShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
  header: ReactNode;
  footer?: ReactNode;
  serverIsSuperAdmin?: boolean;
  tenantId?: string | null;
  /** 헤더와 동일 — 서버에서 확정한 매장 표시명 */
  storeDisplayName?: string | null;
};

async function startElectronSync(tenantId: string) {
  const { createClient } = await import("@/utils/supabase/client");
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  await applyElectronSyncScope(tenantId);

  const api = (window as Window & {
    electronAPI?: {
      startSync?: (s: { access_token: string; tenant_id: string }) => Promise<{ ok: boolean }>;
    };
  }).electronAPI;

  await api?.startSync?.({
    access_token: session.access_token,
    tenant_id: tenantId,
  });
}

/** `/dashboard/mobile` — 사이드바·헤더 없이 풀스크린 모바일 매장 UI */
export function DashboardShell({
  children,
  sidebar,
  header,
  footer,
  serverIsSuperAdmin = false,
  tenantId,
  storeDisplayName,
}: DashboardShellProps) {
  const pathname = usePathname() ?? "";
  const isMobileWorkspace = pathname.startsWith("/dashboard/mobile");
  const isBarePrintDocument = isBarePrintDocumentPath(pathname);

  useEffect(() => {
    if (typeof window === "undefined" || !(window as Window & { electronAPI?: unknown }).electronAPI) {
      return;
    }

    if (!tenantId) {
      void applyElectronSyncScope(null);
      return;
    }

    void startElectronSync(tenantId).catch(console.error);

    let authUnsub: (() => void) | undefined;
    void import("@/utils/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "TOKEN_REFRESHED") {
          void startElectronSync(tenantId);
        }
      });
      authUnsub = () => subscription.unsubscribe();
    });

    const api = (window as Window & {
      electronAPI?: {
        onLocalSyncStatus?: (cb: (s: { lastSyncAt?: string; lastError?: string }) => void) => () => void;
      };
    }).electronAPI;

    const unsub = api?.onLocalSyncStatus?.((status) => {
      if (status.lastError) {
        toast.error("동기화 오류 — 네트워크를 확인해 주세요");
        void logError("Electron sync failed", new Error(status.lastError), "electron-sync");
      }
    });

    const onAuthRefresh = () => {
      if (tenantId) void startElectronSync(tenantId).catch(console.error);
    };
    window.addEventListener("floxync-auth-refreshed", onAuthRefresh);

    return () => {
      unsub?.();
      authUnsub?.();
      window.removeEventListener("floxync-auth-refreshed", onAuthRefresh);
    };
  }, [tenantId]);

  if (isBarePrintDocument) {
    return (
      <DashboardStoreNameProvider storeName={storeDisplayName}>
        <div className="min-h-screen bg-white">{children}</div>
      </DashboardStoreNameProvider>
    );
  }

  if (isMobileWorkspace) {
    return (
      <DashboardStoreNameProvider storeName={storeDisplayName}>
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          <TenantLocaleSync />
          {children}
        </div>
      </DashboardStoreNameProvider>
    );
  }

  return (
    <DashboardStoreNameProvider storeName={storeDisplayName}>
    <div className="flex flex-col h-screen overflow-hidden">
      <TenantLocaleSync />
      <DeliveryPrepReminder />
      <ExternalOrdersAlertProvider />
      <MobilePrintPoller />
      <ElectronTitleBar />
      <div className="flex flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
        {sidebar}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {header}
          <DashboardMain serverIsSuperAdmin={serverIsSuperAdmin}>{children}</DashboardMain>
          {footer}
        </div>
      </div>
    </div>
    </DashboardStoreNameProvider>
  );
}
