import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    if (!apiKey.trim()) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY가 서버에 없습니다. Vercel이면 Project → Settings → Environment Variables에 추가 후 Redeploy 하세요. 로컬 개발만 .env.local을 씁니다.",
        },
        { status: 503 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const { image, mimeType: rawMime } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const mimeType =
      typeof rawMime === "string" && rawMime.startsWith("image/")
        ? rawMime
        : "image/jpeg";

    // 주문 파서·지원 챗봇과 동일 계열(구 gemini-1.5-flash ID 폐기/지역 제한 대비)
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      이 이미지(영수증 사진)를 분석하여 지출 내역을 JSON 형식으로 추출해줘. 
      만약 한 사진에 여러 개의 영수증이 있다면, 각각 별도의 객체로 추출하여 배열에 담아줘.
      
      반드시 다음 JSON 구조를 지켜야 해 (JSON 외에 다른 텍스트는 절대 응답하지 마):
      {
        "receipts": [
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
        ]
      }
      
      - 날짜 형식은 반드시 YYYY-MM-DD여야 해.
      - 꽃집 자재(오아시스, 포장지, 리본)나 꽃 이름(장미, 소국 등)이 있으면 한국어로 정확하게 추출해줘.
      - 이미지에 영수증이 1개만 있다면 receipts 배열에 1개의 객체만 넣어줘.
      - 부가세와 합계 금액을 잘 구분해서 '최종 결제 금액'을 total_amount에 넣어줘.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: image,
          mimeType,
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

  } catch (error: unknown) {
    console.error("OCR API Error:", error);
    const message = error instanceof Error ? error.message : "Gemini 요청 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
