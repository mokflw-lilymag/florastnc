declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
    /** Android/iOS WebView 셸에서 주입 (Capacitor 미사용 시) */
    floxyncMobileApp?: boolean;
  }
}

/** FloXync Android/iOS 네이티브(또는 Capacitor) 앱 — 브라우저·Electron 제외 */
export function isMobileNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  if (window.floxyncMobileApp === true) return true;
  if (window.Capacitor?.isNativePlatform?.()) return true;
  return false;
}
