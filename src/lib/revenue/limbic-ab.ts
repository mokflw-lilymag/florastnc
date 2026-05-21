import { GoogleGenerativeAI } from "@google/generative-ai";

export type LimbicSegment = "stimulus" | "balance" | "dominance" | "discipline";

export const LIMBIC_VARIANTS: Record<
  LimbicSegment,
  { label: string; tone: string }
> = {
  stimulus: { label: "자극·트렌디", tone: "MZ, 감각적, 짧고 임팩트" },
  balance: { label: "균형·따뜻함", tone: "공감, 마음, 선물의 의미" },
  dominance: { label: "프리미엄·품격", tone: "고급, 특별한 날, 희소성" },
  discipline: { label: "실용·정보", tone: "가격·배송·품질·신뢰" },
};

/** Limbic Map 기반 A/B 카피 2~4 variants (P4-S2) */
export async function generateLimbicAbVariants(params: {
  baseCaption: string;
  topic: string;
  persona: string;
  segments?: LimbicSegment[];
  apiKey?: string;
}): Promise<{ segment: LimbicSegment; label: string; caption: string }[]> {
  const segments = params.segments ?? (["balance", "stimulus"] as LimbicSegment[]);
  const key = params.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";
  if (!key) {
    return segments.map((s) => ({
      segment: s,
      label: LIMBIC_VARIANTS[s].label,
      caption: params.baseCaption,
    }));
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    [TASK] 아래 인스타 캡션을 Limbic Map 세그먼트별 A/B 변형으로 ${segments.length}개 작성.
    [BASE] ${params.baseCaption.slice(0, 500)}
    [TOPIC] ${params.topic}
    [PERSONA] ${params.persona}
    ${segments.map((s, i) => `[VARIANT ${i + 1}] ${s} — ${LIMBIC_VARIANTS[s].tone}`).join("\n")}
    [OUTPUT] JSON array: [{"segment":"stimulus","caption":"..."}, ...]
    한국어, 각 200자 내외, 해시태그 포함.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { segment: LimbicSegment; caption: string }[];
      return parsed.map((p) => ({
        segment: p.segment,
        label: LIMBIC_VARIANTS[p.segment]?.label ?? p.segment,
        caption: p.caption,
      }));
    }
  } catch {
    /* fallback below */
  }

  return segments.map((s) => ({
    segment: s,
    label: LIMBIC_VARIANTS[s].label,
    caption: params.baseCaption,
  }));
}
