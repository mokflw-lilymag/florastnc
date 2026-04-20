'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey =
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

const genAI = new GoogleGenerativeAI(geminiApiKey);

/**
 * AI Order Parser: 텍스트 또는 이미지를 분석하여 주문 데이터 추출
 * (음성 파일은 브라우저 Web Speech API로 텍스트화한 뒤 text로 넘기는 것을 권장 — Gemini가 audio/webm 미지원·불안정)
 */
export async function parseOrderWithAi(params: {
  text?: string;
  image?: string; // base64 encoded image
  audio?: string; // base64 encoded audio
  mimeType?: string;
}) {
  try {
    if (!geminiApiKey?.trim()) {
      throw new Error(
        "GEMINI_API_KEY가 서버에 없습니다. Vercel·로컬 .env에 GEMINI_API_KEY를 설정해 주세요."
      );
    }

    const hasInput = !!(params.text?.trim() || params.image || params.audio);
    if (!hasInput) {
      throw new Error("분석할 텍스트·이미지·음성이 없습니다.");
    }
    // 사장님의 프로젝트(Free Tier)에서 허용되는 가장 똑똑하고 빠른 최신 Flash 모델을 사용합니다.
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const systemPrompt = `
      당신은 꽃집 사장님을 돕는 유능한 주문 비서입니다. 
      입력되는 데이터(텍스트, 이미지, 또는 음성 파일)에서 아래 JSON 구조에 맞춰 주문 정보를 추출해주세요.
      
      [JSON 구조]
      {
        "orderer": { "name": "주문자명", "contact": "주문자연락처", "company": "주문자회사명" },
        "recipient": { "name": "수령인명", "contact": "수령인연락처", "address": "수령지주소", "detailAddress": "상세주소" },
        "items": [ { "name": "상품명", "price": 0, "quantity": 1 } ],
        "delivery": { 
           "type": "delivery_reservation" | "pickup_reservation" | "store_pickup", 
           "date": "YYYY-MM-DD (알 수 없으면 비움)", 
           "time": "HH:mm (알 수 없으면 비움)" 
        },
        "message": { "content": "카드/리본 문구" },
        "memo": "배송 시 요청사항이나 특이사항"
      }

      [지침]
      1. 한국어 주소와 전화번호 형식을 준수하세요.
      2. 상품 가격이 있으면 숫자로 추출하고, 없으면 0으로 표시하세요.
      3. 날짜 표현(예: '내일', '모레', '이번주 토요일')은 현재 날짜(${new Date().toLocaleDateString()})를 기준으로 변환하세요.
      4. 확실하지 않은 정보는 빈 문자열("")로 남겨두세요.
      5. 오직 JSON 데이터만 반환하세요.
    `;

    const prompts: any[] = [systemPrompt];
    
    if (params.text) {
      prompts.push(`[입력 텍스트]\n${params.text}`);
    }

    if (params.image && params.mimeType) {
      prompts.push({
        inlineData: {
          data: params.image,
          mimeType: params.mimeType
        }
      });
    }

    if (params.audio && params.mimeType) {
      prompts.push({
        inlineData: {
          data: params.audio,
          mimeType: params.mimeType
        }
      });
    }

    const result = await model.generateContent(prompts);
    const response = await result.response;
    const text = response.text();
    
    console.log('AI Response Text:', text);
    
    // JSON 문자열 정제 (마크다운 블록 제거 등)
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON Parse Error. Cleaned Text:', jsonStr);
      throw new Error('AI가 보낸 주문 정보를 읽는 데 실패했습니다.');
    }

  } catch (error: any) {
    console.error('--- AI Order Parsing Error Detail ---');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    console.error('-------------------------------------');
    throw new Error(`AI 분석 오류: ${error.message || '알 수 없는 에러'}`);
  }
}
