/**
 * 클라이언트/Electron 공통 에러 로깅 — Supabase error_logs 시도 후 localStorage 폴백
 */

const LOCAL_LOG_KEY = "floxync_error_logs";
const MAX_LOCAL_LOGS = 50;

type ErrorRecord = {
  message: string;
  stack: string;
  source: string;
  ts: string;
};

function readLocalLogs(): ErrorRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalLog(record: ErrorRecord): void {
  if (typeof window === "undefined") return;
  try {
    const logs = readLocalLogs();
    logs.push(record);
    while (logs.length > MAX_LOCAL_LOGS) logs.shift();
    localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("[errorLogger] local fallback failed", e);
  }
}

export async function logError(
  message: string,
  err: unknown,
  source = "frontend",
): Promise<void> {
  const stack = err instanceof Error ? err.stack ?? err.message : String(err);
  const record: ErrorRecord = {
    message,
    stack,
    source,
    ts: new Date().toISOString(),
  };

  console.error(`[${source}] ${message}`, err);

  try {
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.from("error_logs").insert(record);
    if (!error) return;
    console.warn("[errorLogger] Supabase insert failed, using localStorage", error.message);
  } catch {
    // Supabase 미설정 또는 error_logs 테이블 없음
  }

  writeLocalLog(record);
}

export function getLocalErrorLogs(): ErrorRecord[] {
  return readLocalLogs();
}

export function clearLocalErrorLogs(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_LOG_KEY);
}
