import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface NaverBlogPost {
  title: string;
  content: string;
}

export class NaverService {
  private static clientId = process.env.NAVER_CLIENT_ID;
  private static clientSecret = process.env.NAVER_CLIENT_SECRET;

  /**
   * 네이버 검색 API를 통해 현재 트렌드를 조회합니다.
   */
  static async searchTrend(query: string) {
    try {
      const response = await axios.get('https://openapi.naver.com/v1/search/blog.json', {
        params: { query, display: 5, sort: 'sim' },
        headers: {
          'X-Naver-Client-Id': this.clientId,
          'X-Naver-Client-Secret': this.clientSecret
        }
      });
      return response.data.items;
    } catch (error) {
      console.error('Naver Search API Error:', error);
      throw error;
    }
  }

  /**
   * 제미나이를 사용하여 네이버 블로그 전용 원고를 생성합니다.
   */
  static async generateBlogPost(params: {
    topic: string;
    persona: string;
    apiKey?: string;
  }): Promise<NaverBlogPost> {
    const key = params.apiKey || process.env.GEMINI_API_KEY || '';
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      [TASK] 네이버 블로그 전용 홍보 포스팅 원고를 작성하라.
      [BRAND PERSONA] ${params.persona}
      [CONTENT TOPIC] ${params.topic}
      
      [STRUCTURE]
      1. 제목: SEO에 최적화된 매력적인 제목 (예: [지역명] 꽃집 추천, 특별한 날 선물 등)
      2. 서론: 현재 계절감과 감성적인 문구로 시작
      3. 본론 1: 꽃의 특징, 관리법, 이 선물의 의미 등 전문적인 정보 제공
      4. 본론 2: 플로리스트의 제작 비하인드 스토리 (전문가적 면모 강조)
      5. 결론: 매장 위치 정보, 예약 방법 안내
      6. 해시태그: 15~20개의 관련 키워드
      
      [REQUIREMENTS]
      - 한국어로 작성하며, 친절하고 전문적인 톤앤매너 유지.
      - 가독성을 위해 소제목과 적절한 이모지 사용.
      - 전체 분량은 공백 제외 800자 이상으로 풍부하게 작성.
      
      [OUTPUT FORMAT]
      제목: {제목}
      내용: {전체 본문}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // 파싱 로직 (간단하게 제목과 내용 분리)
    const titleMatch = text.match(/제목:\s*(.*)/);
    const contentMatch = text.match(/내용:\s*([\s\S]*)/);

    return {
      title: titleMatch ? titleMatch[1].trim() : `${params.topic} 안내`,
      content: contentMatch ? contentMatch[1].trim() : text
    };
  }



  /**
   * 네이버 블로그에 포스팅을 수행합니다.
   * 주의: 현재 네이버 공식 블로그 쓰기 API는 제휴된 파트너사에게만 제공되는 경우가 많습니다.
   * 일반적인 경우, 이 서비스는 생성된 콘텐츠를 사장님께 전달하거나 n8n 등의 자동화 도구로 보냅니다.
   */
  static async postToBlog(accessToken: string, post: NaverBlogPost) {
    // 공식 API가 열려있을 경우의 예시 로직
    // 실제로는 Naver Blog API URL이 필요합니다.
    console.log('Posting to Naver Blog with content:', post);
    
    // 만약 공식 API를 사용할 수 없다면, 여기에서 n8n Webhook 등을 호출하여 
    // 브라우저 자동화(Puppeteer 등)로 글을 쓰게 만드는 로직을 연결할 수 있습니다.
    return { success: true, message: '콘텐츠 생성 완료 및 전송 대기 중' };
  }
}
