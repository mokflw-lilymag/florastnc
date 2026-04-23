import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGeneration() {
  console.log('--- 네이버 블로그 원고 생성 테스트 (Self-Contained) ---');
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY가 없습니다. .env.local을 확인하세요.");
    
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const topic = '봄맞이 화사한 프렌치 스타일 꽃다발';
    const persona = 'Elegant & Premium (우아함 & 프리미엄)';

    const prompt = `
      [TASK] 네이버 블로그 전용 홍보 포스팅 원고를 작성하라.
      [BRAND PERSONA] ${persona}
      [CONTENT TOPIC] ${topic}
      
      [STRUCTURE]
      1. 제목: SEO에 최적화된 매력적인 제목
      2. 서론: 계절감 있는 도입부
      3. 본론: 꽃 설명 및 관리법
      4. 결론: 예약 정보 및 태그
      
      [OUTPUT FORMAT]
      제목: {제목}
      내용: {본문}
    `;

    console.log('AI가 원고를 작성 중입니다...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('\n================================================');
    console.log(text);
    console.log('================================================');
    console.log('\n--- 테스트 완료 ---');
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

testGeneration();
