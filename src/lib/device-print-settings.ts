export function isDeviceAutoPrintDisabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('device_autoprint_disabled') === 'true';
}
