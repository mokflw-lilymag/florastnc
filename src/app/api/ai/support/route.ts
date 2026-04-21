import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 작동 확인된 패턴 그대로 사용 (order-parser.ts 기준)
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, history = [], tenantId, userName } = body;

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // 1. 지식베이스 로드
    const kbPath = path.join(process.cwd(), 'docs', 'ai_knowledge_base.md');
    let knowledgeBase = '';
    let kbLoaded = false;
    try {
      knowledgeBase = fs.readFileSync(kbPath, 'utf8');
      kbLoaded = true;
    } catch (e) {
      console.warn('[AI Support][KB_FALLBACK] Knowledge base file not found, proceeding without local KB');
    }

    // 2. FAQ 데이터 로드 (Supabase에서 실시간)
    let faqContext = '';
    let faqLoaded = false;
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_CONFIG_MISSING');
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: faqs } = await supabase
        .from('support_faq')
        .select('category, question, answer')
        .eq('is_active', true)
        .order('category_order');

      if (faqs && faqs.length > 0) {
        faqLoaded = true;
        faqContext = '\n[사전 학습된 Q&A 지식]\n';
        const grouped: Record<string, typeof faqs> = {};
        faqs.forEach(f => {
          if (!grouped[f.category]) grouped[f.category] = [];
          grouped[f.category].push(f);
        });
        Object.entries(grouped).forEach(([cat, items]) => {
          faqContext += `\n## ${cat}\n`;
          items.forEach(f => {
            faqContext += `Q: ${f.question}\nA: ${f.answer}\n\n`;
          });
        });
      }
    } catch (faqErr: any) {
      const reason = faqErr?.message || 'UNKNOWN_FAQ_ERROR';
      console.warn(`[AI Support][FAQ_FALLBACK] FAQ load failed: ${reason}`);
    }

    if (!kbLoaded || !faqLoaded) {
      console.info(
        `[AI Support][FALLBACK_STATUS] kbLoaded=${kbLoaded} faqLoaded=${faqLoaded} tenant=${tenantId || 'unknown'}`
      );
    }

    // 3. 작동 확인된 모델 사용
    if (!process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      console.error('[AI Support][CONFIG_MISSING] GEMINI_API_KEY 또는 NEXT_PUBLIC_GEMINI_API_KEY 누락');
    }
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // 4. 대화 내역 구성
    const safeHistory = Array.isArray(history) ? history : [];
    const historyText = safeHistory.length > 0
      ? safeHistory.map((m: any) =>
          `${m.role === 'user' ? '사장님' : 'AI 비서'}: ${m.content || ''}`
        ).join('\n')
      : '';

    // 5. 프롬프트 구성
    const prompt = `
당신은 플록싱크(Floxync) SaaS 플랫폼의 기술지원 AI 비서입니다.
꽃집 사장님들이 앱 사용 중 겪는 어려움을 정확하고 친절하게 도와주세요.

아래 [사전 학습된 Q&A 지식]을 최우선으로 참고하여 답변하세요.
Q&A에 있는 내용은 반드시 그 내용 그대로 정확하게 전달하세요.
Q&A에 없는 내용은 앱 일반 지식으로 최선을 다해 답변하세요.

[Floxync 운영 지식베이스]
${knowledgeBase}

${faqContext}

[상담 컨텍스트]
- 사장님: ${userName || '사장님'} (Tenant: ${tenantId || 'unknown'})
- 현재 시간: ${new Date().toLocaleString('ko-KR')}

[이전 대화]
${historyText}

[사장님 문의]
${content}

[응답 규칙]
- 사전 Q&A에 있는 내용이면 그 답변을 그대로 활용하여 정확하게 답변
- 단계별 설명이 필요하면 번호를 붙여 명확하게
- 해결 불가능한 결제 오류/심각한 버그: 답변 끝에 [[HUMAN_NEEDED]] 추가
- 상담이 마무리된 것 같으면 [[CLOSURE_SUGGESTED]] 추가

[답변]:
    `.trim();

    // 6. 작동 확인된 호출 패턴
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // 7. 플래그 분석
    const needsHuman = responseText.includes('[[HUMAN_NEEDED]]');
    const closureSuggested = responseText.includes('[[CLOSURE_SUGGESTED]]');
    const cleanResponse = responseText
      .replace(/\[\[HUMAN_NEEDED\]\]/g, '')
      .replace(/\[\[CLOSURE_SUGGESTED\]\]/g, '')
      .trim();

    return NextResponse.json({
      content: cleanResponse,
      needsHuman,
      closureSuggested,
      status: 'success',
    });

  } catch (error: any) {
    console.error('--- AI Support Error ---');
    console.error('Name:', error.name);
    console.error('Message:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    console.error('------------------------');

    return NextResponse.json({
      content: '죄송합니다 사장님, 현재 AI 비서가 잠시 준비 중입니다. 잠시 후 다시 말씀해 주시면 바로 도와드리겠습니다! 💐',
      error: error.message,
      status: 'error',
    }, { status: 500 });
  }
}
