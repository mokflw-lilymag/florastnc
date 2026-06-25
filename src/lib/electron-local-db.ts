/**
 * Electron 로컬 SQLite 전용 유틸.
 * 주문 목록 조회는 supabase 프록시 → 로컬 DB.
 * 이 모듈은 삭제 시 로컬 row 제거 및 SyncWorker 유령 정리 요청에만 씁니다.
 */

type ElectronAPI = {
  deleteLocalRecord?: (
    table: string,
    id: string,
  ) => Promise<{
    data?: { deleted?: number };
    error?: { message?: string } | null;
  }>;
  syncDeletedOrders?: () => Promise<{
    data?: { removed?: number };
    error?: { message?: string } | null;
  }>;
};

function getElectronAPI(): ElectronAPI | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
}

export function isElectronLocalDbAvailable(): boolean {
  return !!getElectronAPI()?.deleteLocalRecord;
}

/** Realtime / UI 삭제 시 로컬 SQLite에서 즉시 삭제 */
export async function deleteLocalOrder(orderId: string): Promise<boolean> {
  if (!orderId) return false;

  const api = getElectronAPI();
  if (!api?.deleteLocalRecord) {
    console.warn("[Orders] deleteLocalRecord IPC unavailable — Electron 재시작 필요");
    return false;
  }

  const result = await api.deleteLocalRecord("orders", orderId);
  if (result?.error) {
    throw new Error(result.error.message || "로컬 주문 삭제 실패");
  }
  const deleted = result?.data?.deleted ?? 0;
  if (deleted > 0) {
    console.log(`[Orders] Local SQLite deleted order ${orderId}`);
  }
  return deleted > 0;
}

/** SyncWorker가 클라우드 대비 로컬 유령 주문 정리 */
export async function requestSyncDeletedOrders(): Promise<number> {
  const api = getElectronAPI();
  if (!api?.syncDeletedOrders) return 0;

  const result = await api.syncDeletedOrders();
  if (result?.error) {
    console.warn("[Orders] syncDeletedOrders failed:", result.error);
    return 0;
  }
  const removed = result?.data?.removed ?? 0;
  if (removed > 0) {
    console.log(`[Orders] SyncWorker removed ${removed} ghost order(s) from local SQLite`);
  }
  return removed;
}

/** 원격 삭제 이벤트 — id 있으면 즉시 삭제, 없으면 SyncWorker 요청 */
export async function handleRemoteOrderDeleteEvent(payload: {
  old?: { id?: string } | null;
}): Promise<string | null> {
  const deletedId = payload.old?.id;
  if (deletedId) {
    await deleteLocalOrder(deletedId);
    return deletedId;
  }
  console.warn("[Orders] DELETE without payload.old.id — SyncWorker 유령 정리 요청");
  await requestSyncDeletedOrders();
  return null;
}
