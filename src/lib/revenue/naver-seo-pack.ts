/** 네이버 SEO 템플릿 패키지 (P4-S3) — 지역·시즌·서비스 유형 */

export interface NaverSeoTemplate {
  id: string;
  label: string;
  seoKeywords: string[];
  structure: string[];
  promptHint: string;
}

export const NAVER_SEO_TEMPLATES: NaverSeoTemplate[] = [
  {
    id: "local_shop",
    label: "지역 꽃집 소개",
    seoKeywords: ["{지역} 꽃집", "{지역} 꽃배달", "근처 꽃집"],
    structure: ["지역명 H1", "매장 소개", "대표 상품", "오시는 길", "FAQ"],
    promptHint: "네이버 검색에 노출되도록 지역명+꽃배달 키워드를 자연스럽게 5회 이상",
  },
  {
    id: "seasonal",
    label: "계절 추천",
    seoKeywords: ["계절 꽃", "봄 꽃다발", "선물 추천"],
    structure: ["계절감 서론", "추천 꽃 3종", "관리법", "주문 방법"],
    promptHint: "현재 계절에 맞는 꽃 이름과 분위기를 구체적으로",
  },
  {
    id: "wedding_anniversary",
    label: "기념일·웨딩",
    seoKeywords: ["결혼기념일 꽃", "프로포즈 꽃다발", "기념일 선물"],
    structure: ["기념일 의미", "추천 스타일", "리본·메시지", "예약 안내"],
    promptHint: "감성적이되 실용 정보(가격대·리드타임) 포함",
  },
  {
    id: "corporate",
    label: "기업·조화",
    seoKeywords: ["오픈화환", "승진 축하", "법인 선물"],
    structure: ["비즈니스 니즈", "추천 상품", "배송·세금계산서", "문의"],
    promptHint: "B2B 톤, 신뢰감, 대량 주문 가능 언급",
  },
  {
    id: "funeral_condolence",
    label: "근조·위로",
    seoKeywords: ["근조화환", "장례식장 꽃", "조문 화환"],
    structure: ["위로의 말", "근조 상품 안내", "배송 시간", "주문 절차"],
    promptHint: "정중하고 절제된 톤, 24시간 배송 강조",
  },
];

export function buildNaverSeoPromptPack(templateId: string, vars: { region?: string; shopName?: string; topic?: string }) {
  const tpl = NAVER_SEO_TEMPLATES.find((t) => t.id === templateId) ?? NAVER_SEO_TEMPLATES[0];
  const region = vars.region ?? "우리 동네";
  const keywords = tpl.seoKeywords.map((k) => k.replace("{지역}", region)).join(", ");
  return {
    template: tpl,
    enrichedTopic: `${vars.topic ?? ""} · ${tpl.label} · ${vars.shopName ?? "꽃집"}`,
    seoBlock: `[SEO 키워드] ${keywords}\n[구조] ${tpl.structure.join(" → ")}\n[지침] ${tpl.promptHint}`,
  };
}
