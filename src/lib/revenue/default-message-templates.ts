export type MessageTemplateKey =
  | "anniversary_d7"
  | "order_followup_d1"
  | "order_followup_d7"
  | "order_followup_d30";

export type MessageTemplates = Partial<Record<MessageTemplateKey, string>>;

/** 매출 엔진 메시지 템플릿 기본 예시 — UI 초기값·발송 fallback 공통 */
export const DEFAULT_MESSAGE_TEMPLATES: Record<MessageTemplateKey, string> = {
  anniversary_d7:
    `[{{shopName}}] 기념일 안내 🌸
{{customerName}}님, {{label}}({{eventDate}})이 7일 앞으로 다가왔어요.
특별한 날, 마음을 전해보세요.

▶ 1클릭 주문: {{orderLink}}

수신거부: 매장에 문의`,

  order_followup_d1:
    `[{{shopName}}] 감사합니다 🌸
{{customerName}}님, {{orderNumber}} 주문 잘 받으셨나요?
특별한 순간을 함께해 주셔서 감사합니다.

▶ 다시 주문: {{orderLink}}`,

  order_followup_d7:
    `[{{shopName}}] 다시 찾아주세요 💐
{{customerName}}님, 지난주 {{productSummary}} 어떠셨나요?
비슷한 분위기로 다시 준비해 드릴게요.

▶ 1클릭 주문: {{orderLink}}`,

  order_followup_d30:
    `[{{shopName}}] 새로운 계절 꽃 🌿
{{customerName}}님, 이번 달 추천 꽃다발이 준비됐어요.
기념일·감사 선물로 좋은 시기입니다.

▶ 둘러보기: {{orderLink}}`,
};

export const TEMPLATE_PLACEHOLDER_HINTS: Record<MessageTemplateKey, string> = {
  anniversary_d7: "{{customerName}}, {{label}}, {{eventDate}}, {{shopName}}, {{orderLink}}",
  order_followup_d1: "{{customerName}}, {{orderNumber}}, {{shopName}}, {{productSummary}}, {{orderLink}}",
  order_followup_d7: "{{customerName}}, {{orderNumber}}, {{shopName}}, {{productSummary}}, {{orderLink}}",
  order_followup_d30: "{{customerName}}, {{orderNumber}}, {{shopName}}, {{productSummary}}, {{orderLink}}",
};

/** DB에 저장된 값이 없거나 비어 있으면 기본 예시로 채움 (설정 화면용) */
export function mergeMessageTemplatesWithDefaults(saved?: MessageTemplates | null): Record<MessageTemplateKey, string> {
  const keys = Object.keys(DEFAULT_MESSAGE_TEMPLATES) as MessageTemplateKey[];
  return keys.reduce(
    (acc, key) => {
      const custom = saved?.[key]?.trim();
      acc[key] = custom || DEFAULT_MESSAGE_TEMPLATES[key];
      return acc;
    },
    {} as Record<MessageTemplateKey, string>,
  );
}
