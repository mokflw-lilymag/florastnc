/**
 * Realtime 구독이 살아 있으면 폴링은 백업용으로만 느리게,
 * 끊기면 폴링 간격을 줄여 기능(인쇄 등)을 유지합니다.
 */
export const ADAPTIVE_POLL_MS = {
  print: { realtime: 900_000, fallback: 5_000 },
} as const;

export function isRealtimeSubscribed(status: string): boolean {
  return status === "SUBSCRIBED";
}
