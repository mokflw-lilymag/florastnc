import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

function readGeminiKey(): string {
  return (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
}

/** 배포(Preview/Production)별로 키가 있는지 확인용 — 브라우저에서 GET /api/ai/ocr */
export async function GET() {
  const configured = readGeminiKey().length > 0;
  const vercelEnv = process.env.VERCEL_ENV ?? null;
  return NextResponse.json({
    geminiConfigured: configured,
    vercelEnv,
    message: configured
      ? "이 서버 인스턴스에는 Gemini 키가 설정되어 있습니다."
      : `이 배포 환경(VERCEL_ENV=${vercelEnv ?? "unknown"})에 GEMINI_API_KEY가 비어 있습니다. Vercel Environment Variables에서 ${vercelEnv === "preview" ? "Preview" : vercelEnv === "production" ? "Production" : "해당"} 환경에 키를 추가한 뒤 Redeploy 하세요.`,
    checklist: [
      "변수 이름: GEMINI_API_KEY (또는 NEXT_PUBLIC_GEMINI_API_KEY)",
      "값 저장 후 반드시 Deployments → Redeploy (환경 변수는 새 빌드에만 반영)",
      "Preview URL(*-xxxx.vercel.app)로 열면 Preview에, 메인 도메인이면 Production에 키가 있어야 함",
      "Sensitive로 저장해도 됨. 값이 비어 있지 않은지 한 번 더 저장해 보기",
    ],
  });
}

export async function POST(req: Request) {
  try {
    const apiKey = readGeminiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY가 서버에 없습니다. Vercel → Project → Settings → Environment Variables에서 이 배포와 같은 환경(Preview/Production)에 추가 후 Redeploy 하세요. 로컬만 .env.local.",
          vercelEnv: process.env.VERCEL_ENV ?? null,
          geminiConfigured: false,
          diagnose:
            "같은 사이트에서 주소창에 /api/ai/ocr 만 붙여 GET으로 열어보면 vercelEnv·설정 여부를 확인할 수 있습니다.",
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

    const todaySeoul = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

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
      - 영수증에 인쇄된 날짜를 date에 최우선 반영해. 연도가 없거나 읽을 수 없을 때만 아래 기준일의 연도(YYYY)를 써서 월·일과 맞춰 완성해.
      - **기준일(한국 서울) = ${todaySeoul}** — 임의로 2024 등 과거 연도를 추측하지 마.
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
