import { isElectronClient } from '@/lib/electron-env';

type SyncStatusPayload = {
  lastSyncAt?: string | null;
  ordersCount?: number;
  customersCount?: number;
  lastError?: string | null;
};

/** SyncWorker가 pull/push 완료할 때마다 콜백 (Realtime 대신 UI 갱신용) */
export function onElectronSyncStatus(callback: (status: SyncStatusPayload) => void): () => void {
  if (!isElectronClient()) return () => {};

  const api = (window as Window & {
    electronAPI?: {
      onLocalSyncStatus?: (cb: (s: SyncStatusPayload) => void) => () => void;
      getLocalSyncStatus?: () => Promise<SyncStatusPayload>;
    };
  }).electronAPI;

  if (!api?.onLocalSyncStatus) return () => {};

  void api.getLocalSyncStatus?.().then(callback).catch(() => {});

  return api.onLocalSyncStatus(callback);
}
