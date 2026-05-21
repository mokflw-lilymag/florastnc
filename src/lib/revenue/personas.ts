/** 매장 SNS·메시지 페르소나 프리셋 (P1-U12) */
export const MARKETING_PERSONAS = [
  {
    id: "warm",
    label: "따뜻한 감성",
    persona: "Warm & Emotional",
    description: "마음을 전하는 선물, 감사와 사랑의 톤",
  },
  {
    id: "elegant",
    label: "고급 프리미엄",
    persona: "Elegant & Premium",
    description: "품격 있는 연출, 특별한 날에 어울리는 톤",
  },
  {
    id: "trendy",
    label: "트렌디·힙",
    persona: "Trendy & Hip",
    description: "MZ 감성, SNS 친화적·경쾌한 톤",
  },
] as const;

export const DEFAULT_PROMO_TOPICS = [
  "기념일 꽃다발",
  "감사 선물",
  "계절 추천 꽃",
] as const;

export function resolvePersonaString(
  personaId: string | null | undefined,
  shopName: string
): string {
  const preset = MARKETING_PERSONAS.find((p) => p.id === personaId);
  if (preset) return `${shopName} — ${preset.persona}`;
  if (personaId && personaId.length > 3) return personaId;
  return `${shopName} — ${MARKETING_PERSONAS[0].persona}`;
}
