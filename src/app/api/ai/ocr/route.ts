import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { image, fileName } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      이 영수증 이미지를 분석하여 지출 내역을 JSON 형식으로 추출해줘. 
      반드시 다음 JSON 구조를 지켜야 해 (JSON 외에 다른 텍스트는 절대 응답하지 마):
      {
        "store_name": "상점 이름",
        "date": "YYYY-MM-DD",
        "items": [
          { 
            "material_name": "품목명", 
            "quantity": 1, 
            "unit_price": 5000, 
            "amount": 5000, 
            "description": "상세내용" 
          }
        ],
        "total_amount": 15000
      }
      
      - 여러 개의 품목이 있다면 모두 items 배열에 넣어줘. 
      - 날짜 형식은 반드시 YYYY-MM-DD여야 해.
      - 꽃집 자재(오아시스, 포장지, 리본)나 꽃 이름(장미, 카네이션 등)이 있으면 정확하게 추출해줘.
      - 총액(total_amount)은 영수증의 합계 금액과 일치해야 해.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: image,
          mimeType: "image/jpeg",
        },
      },
      prompt,
    ]);

    const response = await result.response;
    let text = response.text();
    
    // Clean up potential markdown code blocks if AI included them
    text = text.replace(/```json|```/g, "").trim();
    
    try {
        const data = JSON.parse(text);
        return NextResponse.json({ data });
    } catch (parseError) {
        console.error("JSON Parse Error from AI response:", text);
        return NextResponse.json({ error: "AI 응답 해석 실패" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("OCR API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
