import { isElectronClient } from "@/lib/electron-env";

const BRIDGE_ONLINE_KEY = "floxync-local-bridge-online";

/** 로컬 브릿지(8004) 반복 조회 여부 — Electron 또는 이전에 연결 성공한 경우만 */
export function shouldPollLocalBridge(): boolean {
  if (typeof window === "undefined") return false;
  if (isElectronClient()) return true;
  try {
    return sessionStorage.getItem(BRIDGE_ONLINE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markLocalBridgeOnline(): void {
  try {
    sessionStorage.setItem(BRIDGE_ONLINE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearLocalBridgeOnline(): void {
  try {
    sessionStorage.removeItem(BRIDGE_ONLINE_KEY);
  } catch {
    /* ignore */
  }
}
