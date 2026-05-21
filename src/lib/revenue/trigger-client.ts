/** Trigger.dev 태스크 트리거 — TRIGGER_SECRET_KEY 없으면 no-op */
export async function triggerRevenueTask(
  taskId: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; runId?: string; skipped?: boolean }> {
  if (!process.env.TRIGGER_SECRET_KEY) {
    console.warn(`[revenue] TRIGGER_SECRET_KEY missing — skip trigger ${taskId}`);
    return { ok: false, skipped: true };
  }

  try {
    const { tasks } = await import("@trigger.dev/sdk/v3");
    const handle = await tasks.trigger(taskId, payload);
    return { ok: true, runId: handle.id };
  } catch (e) {
    console.error(`[revenue] trigger failed ${taskId}`, e);
    return { ok: false };
  }
}
