import { isElectronClient } from "@/lib/electron-env";

type ElectronAPI = {
  getYearlyStats?: (tenantId: string) => Promise<{ count: number; revenue: number }>;
  downloadImage?: (payload: { url: string; filename: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
  clearSpooler?: () => Promise<{ success: boolean; message?: string }>;
  wakeUpWindow?: () => Promise<{ ok: boolean }>;
  getPrintLog?: () => Promise<{ path: string; content: string }>;
  openPrintLogFolder?: () => Promise<{ path: string }>;
  getPrinters?: () => Promise<string[]>;
  printJob?: (payload: unknown) => Promise<unknown>;
};

function api(): ElectronAPI | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
}

export async function fetchElectronYearlyStats(tenantId: string) {
  if (!isElectronClient() || !tenantId) return null;
  return api()?.getYearlyStats?.(tenantId) ?? null;
}

export async function downloadImageToLocal(url: string, filename: string) {
  if (!isElectronClient()) return null;
  return api()?.downloadImage?.({ url, filename }) ?? null;
}

export async function clearPrintSpooler() {
  if (!isElectronClient()) return null;
  return api()?.clearSpooler?.() ?? null;
}

export async function wakeUpElectronWindow() {
  if (!isElectronClient()) return null;
  return api()?.wakeUpWindow?.() ?? null;
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
