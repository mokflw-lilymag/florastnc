"use client";

import { useSyncExternalStore } from "react";
import { isCapacitorAndroid } from "@/lib/client-platform";

function subscribe() {
  return () => {};
}

/**
 * Capacitor Android 셸 여부. 서버 스냅샷은 항상 false.
 */
export function useIsCapacitorAndroid(): boolean {
  return useSyncExternalStore(subscribe, () => isCapacitorAndroid(), () => false);
}
