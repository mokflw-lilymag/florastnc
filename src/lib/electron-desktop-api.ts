import { isElectronClient } from "@/lib/electron-env";

type ElectronAPI = {
  getYearlyStats?: (tenantId: string) => Promise<{ count: number; revenue: number }>;
  downloadImage?: (payload: {
    url: string;
    filename: string;
    tenantId?: string;
  }) => Promise<{ success: boolean; path?: string; error?: string }>;
  syncTenantBackupPath?: (payload: {
    tenantId: string;
    path: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  clearSpooler?: () => Promise<{ success: boolean; message?: string }>;
  wakeUpWindow?: () => Promise<{ ok: boolean }>;
  notifyExternalOrder?: (payload?: {
    title?: string;
    body?: string;
  }) => Promise<{ ok: boolean; count?: number }>;
  clearExternalOrderBadge?: () => Promise<{ ok: boolean }>;
  getPrintLog?: () => Promise<{ path: string; content: string }>;
  openPrintLogFolder?: () => Promise<{ path: string }>;
  getPrinters?: () => Promise<string[]>;
  printJob?: (payload: unknown) => Promise<unknown>;
  runMonthlyPhotoBackup?: (payload?: {
    targetMonth?: string;
    force?: boolean;
  }) => Promise<MonthlyPhotoBackupResult>;
  openMonthlyBackupFolder?: (payload: {
    kind: "delivery" | "receipt";
    tenantId?: string;
  }) => Promise<{ ok: boolean; path?: string }>;
};

export type MonthlyPhotoBackupResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  targetMonth?: string;
  deliveryZip?: string;
  receiptZip?: string;
  deliveryCount?: number;
  receiptCount?: number;
  receiptSimpleCount?: number;
  receiptExpensesCount?: number;
};

function api(): ElectronAPI | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
}

export async function fetchElectronYearlyStats(tenantId: string) {
  if (!isElectronClient() || !tenantId) return null;
  return api()?.getYearlyStats?.(tenantId) ?? null;
}

export async function syncTenantBackupPathToElectron(tenantId: string, localBackupPath?: string) {
  if (!isElectronClient() || !tenantId) return null;
  return api()?.syncTenantBackupPath?.({ tenantId, path: localBackupPath?.trim() || "" }) ?? null;
}

export async function downloadImageToLocal(url: string, filename: string, tenantId?: string) {
  if (!isElectronClient()) return null;
  return api()?.downloadImage?.({ url, filename, tenantId }) ?? null;
}

export async function clearPrintSpooler() {
  if (!isElectronClient()) return null;
  return api()?.clearSpooler?.() ?? null;
}

export async function wakeUpElectronWindow() {
  if (!isElectronClient()) return null;
  return api()?.wakeUpWindow?.() ?? null;
}

export async function notifyExternalOrderDesktop(payload?: { title?: string; body?: string }) {
  if (!isElectronClient()) return null;
  return api()?.notifyExternalOrder?.(payload) ?? null;
}

export async function clearExternalOrderDesktopBadge() {
  if (!isElectronClient()) return null;
  return api()?.clearExternalOrderBadge?.() ?? null;
}

export async function readElectronPrintLog() {
  if (!isElectronClient()) return null;
  return api()?.getPrintLog?.() ?? null;
}

export async function openElectronPrintLogFolder() {
  if (!isElectronClient()) return null;
  return api()?.openPrintLogFolder?.() ?? null;
}

export async function listElectronPrinters() {
  if (!isElectronClient()) return [];
  const printers = await api()?.getPrinters?.();
  return Array.isArray(printers) ? printers : [];
}

function previousMonthYyyyMm(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function runMonthlyPhotoBackup(options?: { targetMonth?: string; force?: boolean }) {
  if (!isElectronClient()) return null;
  return api()?.runMonthlyPhotoBackup?.(options) ?? null;
}

export async function openMonthlyBackupFolder(kind: 'delivery' | 'receipt', tenantId?: string) {
  if (!isElectronClient()) return null;
  return api()?.openMonthlyBackupFolder?.({ kind, tenantId }) ?? null;
}

export { previousMonthYyyyMm };
