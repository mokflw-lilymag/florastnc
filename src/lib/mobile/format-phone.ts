export function formatPhoneNumber(value: string) {
  const raw = value.replace(/[^0-9]/g, "");
  if (raw.startsWith("02")) {
    if (raw.length < 3) return raw;
    if (raw.length < 6) return `${raw.slice(0, 2)}-${raw.slice(2)}`;
    if (raw.length < 10) return `${raw.slice(0, 2)}-${raw.slice(2, 5)}-${raw.slice(5)}`;
    return `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6, 10)}`;
  }
  if (raw.length < 4) return raw;
  if (raw.length < 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  if (raw.length < 11) return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
}
