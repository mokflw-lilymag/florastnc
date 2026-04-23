import { HarnessEngine } from './harness-engine';
import architectHarness from './harness/marketing-architect.json';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type CountryCode = 'KR' | 'US' | 'VN' | 'JP' | 'CN';
export type StorePersona = 'Elegant & Premium' | 'Warm & Emotional' | 'Trendy & Hip' | 'Expert & Professional';

/**
 * Enhanced Marketing Engine using the Harness Engineering framework.
 */
export class MarketingEngine {
  
  private static async getAiModel(apiKey?: string) {
    const key = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    if (!key) throw new Error("Gemini API Key is missing");
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  /**
   * Generates powerful marketing copy based on the card design and store persona.
   */
  static async generateMarketingCopy(params: {
    topic: string;
    persona: string;
    description?: string;
    platform: 'instagram' | 'blog' | 'tiktok';
    apiKey?: string;
  }) {
    const model = await this.getAiModel(params.apiKey);
    
    const systemPrompt = HarnessEngine.generateSystemPrompt(architectHarness as any);
    const userPrompt = `
      [TASK] 위 하니스(Harness) 지침을 준수하여 '${params.platform}' 전용 홍보 문구를 작성하라.
      [BRAND PERSONA] ${params.persona}
      [CONTENT TOPIC] ${params.topic}
      [ADDITIONAL CONTEXT] ${params.description || '없음'}
      
      [REQUIREMENTS]
      - 각 플랫폼의 특징(인스타: 해시태그/이모지, 블로그: 상세설명)을 극대화하라.
      - 읽는 사람의 감성을 자극하거나 구매 욕구를 불러일으키는 카피라이팅을 적용하라.
      - 한국어로 작성하라.
    `;

    const result = await model.generateContent([systemPrompt, userPrompt]);
    const response = await result.response;
    return response.text();
  }

  /**
   * Generates a viral mission plan (Legacy Name maintained for Orchestrator compatibility)
   */
  static async planShortsCampaign(params: {
    topic: string;
    country: CountryCode;
    persona: string;
    marketingTheme?: string;
    apiKey?: string;
  }) {
    const copy = await this.generateMarketingCopy({
      topic: params.topic,
      persona: params.persona,
      platform: 'instagram',
      apiKey: params.apiKey
    });

    return {
      copy,
      topic: params.topic,
      persona: params.persona,
      metadata: { engine: 'MAOMS-V5' }
    };
  }

  /**
   * Self-Critique / Auditor Module
   */
  static async auditContent(content: string, params: { persona: string; apiKey?: string }) {
    const model = await this.getAiModel(params.apiKey);
    const prompt = `다음 콘텐츠가 '${params.persona}' 브랜드 페르소나에 적합한지 검수하고, 개선사항이 있다면 제안하라. 통과면 'PASS'라고 시작하라.\n\n[CONTENT]\n${content}`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
