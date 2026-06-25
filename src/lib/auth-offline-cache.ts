/**
 * Electron 오프라인 시 auth 세션 유지용 localStorage 캐시
 */

import { isElectronClient } from "@/lib/electron-env";

export const FLOXYNC_AUTH_CACHE_KEY = "floxync_auth_cache_v1";

export type AuthCachePayload = {
  user: Record<string, unknown>;
  profile: Record<string, unknown>;
  tenantId: string | null;
  isSuperAdmin: boolean;
  isOrphaned: boolean;
  cachedAt: string;
};

export function saveAuthCache(payload: Omit<AuthCachePayload, "cachedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const record: AuthCachePayload = { ...payload, cachedAt: new Date().toISOString() };
    localStorage.setItem(FLOXYNC_AUTH_CACHE_KEY, JSON.stringify(record));
  } catch (err) {
    console.warn("[AuthCache] save failed:", err);
  }
}

export function loadAuthCache(): AuthCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FLOXYNC_AUTH_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthCachePayload;
  } catch {
    return null;
  }
}

export function clearAuthCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FLOXYNC_AUTH_CACHE_KEY);
}

export function shouldUseOfflineAuthBypass(): boolean {
  if (typeof window === "undefined") return false;
  return isElectronClient() || !!loadAuthCache();
}

export function applyAuthCacheToState(): AuthCachePayload | null {
  const cached = loadAuthCache();
  if (!cached?.user) return null;
  return cached;
}

export function isOfflineAuthError(message: string): boolean {
  return /refresh token|timeout|fetch failed|network|failed to fetch/i.test(message);
}
