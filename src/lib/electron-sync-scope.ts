/**
 * Electron SyncWorker에 로그인 테넌트 scope 전달
 */

export type ElectronSyncScopePayload = {
  mode: 'tenant' | 'idle';
  tenantId?: string | null;
};

export async function applyElectronSyncScope(tenantId: string | null | undefined): Promise<void> {
  if (typeof window === 'undefined') return;

  const api = (window as Window & {
    electronAPI?: { setSyncScope?: (p: ElectronSyncScopePayload) => Promise<unknown> };
  }).electronAPI;

  if (!api?.setSyncScope) return;

  const payload: ElectronSyncScopePayload = tenantId
    ? { mode: 'tenant', tenantId }
    : { mode: 'idle', tenantId: null };

  try {
    await api.setSyncScope(payload);
  } catch (err) {
    console.warn('[ElectronSyncScope] setSyncScope failed:', err);
  }
}
