import type { CampaignType } from "./types";

export interface FollowupTemplate {
  campaignType: CampaignType;
  label: string;
  render: (ctx: FollowupMessageContext) => string;
  expectedRevenueKrw: number;
}

export interface FollowupMessageContext {
  customerName: string;
  orderNumber: string;
  shopName?: string;
  productSummary?: string;
  orderLink?: string;
}

export const ORDER_FOLLOWUP_TEMPLATES: Record<
  "order_followup_d1" | "order_followup_d7" | "order_followup_d30",
  FollowupTemplate
> = {
  order_followup_d1: {
    campaignType: "order_followup_d1",
    label: "D+1 감사",
    expectedRevenueKrw: 30_000,
    render: (c) =>
      `[${c.shopName ?? "꽃집"}] 감사합니다 🌸\n` +
      `${c.customerName}님, ${c.orderNumber} 주문 잘 받으셨나요?\n` +
      `특별한 순간을 함께해 주셔서 감사합니다.` +
      (c.orderLink ? `\n\n▶ 다시 주문: ${c.orderLink}` : ""),
  },
  order_followup_d7: {
    campaignType: "order_followup_d7",
    label: "D+7 재구매",
    expectedRevenueKrw: 50_000,
    render: (c) =>
      `[${c.shopName ?? "꽃집"}] 다시 찾아주세요 💐\n` +
      `${c.customerName}님, 지난주 ${c.productSummary ?? "꽃 선물"} 어떠셨나요?\n` +
      `비슷한 분위기로 다시 준비해 드릴게요.` +
      (c.orderLink ? `\n\n▶ 1클릭 주문: ${c.orderLink}` : ""),
  },
  order_followup_d30: {
    campaignType: "order_followup_d30",
    label: "D+30 시즌",
    expectedRevenueKrw: 40_000,
    render: (c) =>
      `[${c.shopName ?? "꽃집"}] 새로운 계절 꽃 🌿\n` +
      `${c.customerName}님, 이번 달 추천 꽃다발이 준비됐어요.\n` +
      `기념일·감사 선물로 좋은 시기입니다.` +
      (c.orderLink ? `\n\n▶ 둘러보기: ${c.orderLink}` : ""),
  },
};

export const FOLLOWUP_DELAYS_DAYS = {
  order_followup_d1: 1,
  order_followup_d7: 7,
  order_followup_d30: 30,
} as const;
