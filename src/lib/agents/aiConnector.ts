/**
 * AI Connector (샘플리 연동 모듈 v2)
 * 전문 분야: 프롬프트 엔지니어링, Gemini API 통신, 배경/메시지 생성
 */

export interface AIGenerationResponse {
  imageUrl: string;
  revisedPrompt: string;
  theme: string;
  source?: 'gemini' | 'fallback';
  textColor?: string;
  bgColor?: string;
  colorName?: string;
}

export interface AIMessageResponse {
  message: string;
  tone: 'formal' | 'warm' | 'witty';
}

export class AIConnector {
  /**
   * 테마별 최적화된 프롬프트를 생성합니다.
   */
  private static getThemePrompt(theme: string): string {
    const basePrompt = "Professional high-quality card background, aesthetic, clean, minimalistic, no text, 4k resolution.";
    
    switch (theme) {
      case 'romantic':
        return `${basePrompt} soft pink and gold colors, floral patterns, heart motifs, elegant style.`;
      case 'modern':
        return `${basePrompt} abstract geometric shapes, blue and silver accents, sleek architecture inspiration.`;
      case 'vintage':
        return `${basePrompt} sepia tones, aged paper texture, botanical illustrations, traditional craft feel.`;
      case 'calm':
        return `${basePrompt} serene landscape, watercolors, pastel blue and green, foggy mountains or ocean.`;
      case 'birthday':
        return `${basePrompt} celebration, confetti, warm golden tones, party atmosphere, joyful.`;
      case 'thanks':
        return `${basePrompt} grateful, warm autumn colors, gentle light, appreciation, harvest.`;
      case 'respect':
        return `${basePrompt} dignified, deep blue and gold, classical, elegant patterns.`;
      case 'lover':
        return `${basePrompt} romantic, soft rose, lavender, dreamy, love, tender, gentle bokeh.`;
      case 'christmas':
        return `${basePrompt} winter, snow, red and green, festive, cozy, holiday warmth.`;
      default:
        return basePrompt;
    }
  }

  /**
   * AI 카드 배경 이미지를 생성합니다.
   */
  static async generateBackground(theme: string, mode?: 'normal' | 'formtec', customPrompt?: string): Promise<AIGenerationResponse> {
    const prompt = customPrompt || this.getThemePrompt(theme);
    
    try {
      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, prompt, mode: mode || 'normal' }),
      });

      if (!response.ok) throw new Error('AI generation failed');
      
      return await response.json();
    } catch (error) {
      console.error('AIConnector Background Error:', error);
      throw error;
    }
  }

  /**
   * AI 카드 메시지를 생성합니다.
   */
  static async generateMessage(options: {
    occasion?: string;
    relationship?: string;
    senderName?: string;
    recipientName?: string;
    tone?: string;
    customNote?: string;
  }): Promise<AIMessageResponse[]> {
    try {
      const response = await fetch('/api/ai/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!response.ok) throw new Error('AI message generation failed');
      
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('AIConnector Message Error:', error);
      throw error;
    }
  }

  /**
   * 폼텍 전용: 심플 배경 + AI 메시지 한번에 생성
   */
  static async generateFormtecCard(options: {
    occasion?: string;
    message?: string;
    recipientName?: string;
  }): Promise<{ background: AIGenerationResponse; suggestedMessages: AIMessageResponse[] }> {
    // 배경과 메시지를 동시에 생성
    const [background, messages] = await Promise.allSettled([
      this.generateBackground(options.occasion || 'calm', 'formtec'),
      options.message ? Promise.resolve([{ message: options.message, tone: 'warm' as const }]) :
        this.generateMessage({
          occasion: options.occasion,
          recipientName: options.recipientName,
          tone: '따뜻하고 간결한'
        })
    ]);

    return {
      background: background.status === 'fulfilled' ? background.value : {
        imageUrl: '',
        revisedPrompt: '',
        theme: 'formtec',
        bgColor: '#FFFFFF',
        textColor: '#374151'
      },
      suggestedMessages: messages.status === 'fulfilled' ? messages.value : []
    };
  }
}
