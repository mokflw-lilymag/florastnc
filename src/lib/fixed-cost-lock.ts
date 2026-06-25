import type { SupabaseClient } from "@supabase/supabase-js";

const SETTINGS_PREFIX = "fixed_cost_lock_";

export type FixedCostLockSettings = {
  pinHash: string;
};

export function fixedCostLockSettingsId(tenantId: string) {
  return `${SETTINGS_PREFIX}${tenantId}`;
}

export function fixedCostUnlockSessionKey(tenantId: string) {
  return `fixedCostUnlock_${tenantId}`;
}

export async function hashFixedCostPin(tenantId: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`floxync-fixed-cost:${tenantId}:${pin.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function fetchFixedCostLock(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<FixedCostLockSettings | null> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("data")
      .eq("id", fixedCostLockSettingsId(tenantId))
      .maybeSingle();
    if (error) return null;
    const pinHash = (data?.data as { pinHash?: string } | null)?.pinHash;
    return pinHash ? { pinHash } : null;
  } catch {
    return null;
  }
}

export async function saveFixedCostLock(
  supabase: SupabaseClient,
  tenantId: string,
  pinHash: string | null,
): Promise<void> {
  const id = fixedCostLockSettingsId(tenantId);
  if (!pinHash) {
    await supabase.from("system_settings").delete().eq("id", id);
    return;
  }
  const { error } = await supabase.from("system_settings").upsert(
    {
      id,
      tenant_id: tenantId,
      data: { pinHash },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export function isFixedCostUnlocked(tenantId: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(fixedCostUnlockSessionKey(tenantId)) === "1";
}

export function setFixedCostUnlocked(tenantId: string, unlocked: boolean) {
  if (typeof window === "undefined") return;
  const key = fixedCostUnlockSessionKey(tenantId);
  if (unlocked) sessionStorage.setItem(key, "1");
  else sessionStorage.removeItem(key);
}

export function formatMonthlyDueDay(dueDay?: number): string | null {
  if (!dueDay || dueDay < 1 || dueDay > 31) return null;
  return `매달 ${dueDay}일`;
}

/** 고정비 암호가 켜져 있고 아직 이 탭에서 해제하지 않았을 때 */
export function shouldMaskFixedCosts(lockEnabled: boolean, unlocked: boolean): boolean {
  return lockEnabled && !unlocked;
}
