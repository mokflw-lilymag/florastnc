/**
 * Template Curator (샘플리)
 * 전문 분야: 템플릿 스키마 관리, AI 생성 이미지 데이터 교환 및 메타데이터 관리
 */

export interface TemplateData {
  id: string;
  theme: string;
  isCustomAi: boolean;
  backgroundUrl: string;
  defaultTextColor: string;
  promptInfo?: string;
}

export class TemplateCurator {
  /**
   * 테마에 따른 기본 템플릿 정보 또는 DB 연동 로직 구조체
   */
  static async fetchBaseTemplates(themeName: string): Promise<TemplateData[]> {
    // TODO: Supabase 연동 로직
    return [
      {
        id: 'base-01',
        theme: themeName,
        isCustomAi: false,
        backgroundUrl: '/assets/samples/base-01.jpg',
        defaultTextColor: '#000000',
      }
    ];
  }

  /**
   * AI 안티그래비티 API 연동을 통해 새로운 템플릿 배경을 생성하고 반환(Mock)
   */
  static async generateAiTemplate(themePrompt: string): Promise<TemplateData> {
    // TODO: 실제 AI API 호출 및 Supabase Storage 저장
    return {
      id: `ai-${Date.now()}`,
      theme: 'custom',
      isCustomAi: true,
      backgroundUrl: '/assets/generated/ai-mock.png',
      defaultTextColor: '#333333',
      promptInfo: themePrompt,
    };
  }
}
