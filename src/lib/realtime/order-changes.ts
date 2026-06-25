import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { isElectronClient } from "@/lib/electron-env";

export type OrderChangePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

type Listener = (payload: OrderChangePayload) => void;

type TenantEntry = {
  channel: RealtimeChannel;
  listeners: Set<Listener>;
  refCount: number;
};

const subscriptions = new Map<string, TenantEntry>();

/** 테넌트당 Realtime 채널 1개 — useOrders() 다중 호출 시에도 subscribe() 후 .on() 오류 방지 */
export function subscribeOrderChanges(
  supabase: SupabaseClient,
  tenantId: string,
  listener: Listener,
): () => void {
  // Electron: SyncWorker가 증분 pull — Realtime WebSocket 생략으로 트래픽 절감
  if (isElectronClient()) {
    return () => {};
  }

  let entry = subscriptions.get(tenantId);

  if (!entry) {
    const listeners = new Set<Listener>();
    const channelName = `orders-tenant-${tenantId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          for (const fn of listeners) fn(payload as OrderChangePayload);
        },
      )
      .subscribe();

    entry = { channel, listeners, refCount: 0 };
    subscriptions.set(tenantId, entry);
  }

  entry.listeners.add(listener);
  entry.refCount += 1;

  return () => {
    const current = subscriptions.get(tenantId);
    if (!current) return;

    current.listeners.delete(listener);
    current.refCount -= 1;

    if (current.refCount <= 0 && current.listeners.size === 0) {
      void supabase.removeChannel(current.channel);
      subscriptions.delete(tenantId);
    }
  };
}
