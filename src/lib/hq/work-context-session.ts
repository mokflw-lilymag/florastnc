/** 원격/지점 업무 모드 최대 유지 시간 (2시간) */
export const WORK_CONTEXT_MAX_MS = 2 * 60 * 60 * 1000;

export function isWorkContextExpired(startedAt: string | null | undefined): boolean {
  if (!startedAt) return false;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return false;
  return Date.now() - started > WORK_CONTEXT_MAX_MS;
}

export function workContextRemainingMs(startedAt: string | null | undefined): number | null {
  if (!startedAt) return null;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return null;
  return Math.max(0, WORK_CONTEXT_MAX_MS - (Date.now() - started));
}
