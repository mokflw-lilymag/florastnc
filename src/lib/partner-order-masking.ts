/** 회원사 수발주 인수증용 개인정보 마스킹 */

export function maskPartnerName(name?: string | null): string {
  if (!name) return "—";
  const t = name.trim();
  if (t.length <= 1) return t;
  if (t.length === 2) return `${t[0]}*`;
  return `${t[0]}${"*".repeat(t.length - 2)}${t[t.length - 1]}`;
}

export function maskPartnerPhone(phone?: string | null): string {
  if (!phone) return "—";
  const trimmed = phone.trim();
  const parts = trimmed.split("-");
  if (parts.length === 3) return `${parts[0]}-****-${parts[2]}`;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 8) return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  return trimmed;
}
