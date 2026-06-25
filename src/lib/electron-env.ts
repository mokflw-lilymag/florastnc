/** 브라우저/Electron 클라이언트에서 데스크톱 앱 여부 */
export function isElectronClient(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as Window & { electronAPI?: unknown }).electronAPI;
}
