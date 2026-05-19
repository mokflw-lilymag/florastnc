/** 무료 리본 — 당일 첫 방문 웰컴 (localStorage) */

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function welcomeKey(tenantId: string): string {
  return `florasync_ribbon_welcome_${tenantId}_${dayKey()}`;
}

export function shouldShowRibbonDailyWelcome(tenantId: string | undefined): boolean {
  if (!tenantId || typeof window === "undefined") return false;
  try {
    return localStorage.getItem(welcomeKey(tenantId)) !== "1";
  } catch {
    return false;
  }
}

export function markRibbonDailyWelcomeSeen(tenantId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(welcomeKey(tenantId), "1");
  } catch {
    /* ignore */
  }
}
