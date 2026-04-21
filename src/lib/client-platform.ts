import { Capacitor } from "@capacitor/core";

/** True when running inside a Capacitor native shell (Android or iOS). */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** True when the Floxync Android app WebView is hosting this session. */
export function isCapacitorAndroid(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}
