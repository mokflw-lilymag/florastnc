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
      case 'Christmas':
        return `${basePrompt} winter, snow, red and green, festive, cozy, holiday warmth.`;
      default:
        return basePrompt;
    }
  }

  static async generateBackground(theme: string, mode?: 'normal' | 'formtec', customPrompt?: string): Promise<AIGenerationResponse> {
    const prompt = customPrompt || this.getThemePrompt(theme);
    
    try {
      const response = await fetch('/api/studio/image', {
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

  static async generateMessage(options: {
    occasion?: string;
    relationship?: string;
    senderName?: string;
    recipientName?: string;
    tone?: string;
    customNote?: string;
  }): Promise<AIMessageResponse[]> {
    try {
      const response = await fetch('/api/studio/message', {
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
}
