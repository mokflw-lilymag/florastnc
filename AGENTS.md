<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Communication Rule
- **언어 설정**: 모든 계획(Implementation Plan)과 설명, 답변은 반드시 **한국어**로 작성해야 합니다.
<!-- END:nextjs-agent-rules -->

# Reference Projects
When implementing Ribbon Printer or other legacy features, refer to the original implementation in the reference project located at:
`D:\mapp\ribboneprintnew`

For ERP system modifications and reference, ALWAYS refer to the original ERP system implemented at:
`D:\lilymagerp-v4_supa`

If you are unsure about how a feature should work, ALWAYS check these reference projects first.

<!-- BEGIN:antigravity-skill-agencies -->
# 🚀 안티그래비티 스킬 에이전시 (마스터 프롬프트)

이 프로젝트("웹계의 스위스 아미 나이프")의 화려한 기술 스택을 완벽하게 다루기 위한 전략적 지침과 프롬프트 세트입니다.
에이전트는 향후 작업 시 아래 프롬프트에 내포된 기술 스택과 접근 방식을 기본으로 채택해야 합니다.

## 1. [구조 설계] "이 구역의 아키텍트는 나야"
- **기술 스택**: Next.js 15+ (App Router), TypeScript, Supabase, Zustand
- **지침**: 새로운 복잡한 기능(예: 커스텀 디자인 에디터) 구현 전, 서버 컴포넌트와 클라이언트 컴포넌트의 경계를 명확히 나눕니다. Zustand 스토어와 Supabase Realtime을 연동하는 최적의 폴더 구조와 데이터 흐름을 TypeScript 인터페이스를 포함하여 우선 설계합니다.

## 2. [인터랙티브 UI] "누끼 따고 드래그하고"
- **기술 스택**: `@dnd-kit`, `@imgly/background-removal`, `idb-keyval`
- **지침**: 이미지 배경 제거, 드래그 앤 드롭 등 브라우저 자원 소모가 큰 작업 시 레이턴시 최소화를 위해 IndexedDB(`idb-keyval`)를 캐시로 적극 활용합니다(Off-the-main-thread 지향). 성능 최적화(Memoization)와 에러 핸들링을 고려한 React 컴포넌트를 작성합니다.

## 3. [문서 및 데이터] "PDF랑 엑셀, 한 치의 오차도 없이"
- **기술 스택**: `pdf-lib`, `@pdf-lib/fontkit`, `html-to-image`, `xlsx`, `Supabase`
- **지침**: 폰트 임베딩을 지원하는 PDF를 생성할 때, 캡처된 DOM 엘리먼트(`html-to-image`)와 DB 데이터의 조합 레이아웃을 정교하게 제어합니다. 메모리 부족 상황 및 폰트 로드 실패에 대한 방어 로직을 반드시 포함합니다.

## 4. [결제 및 보안] "내 돈은 소중하니까"
- **기술 스택**: `@tosspayments/payment-sdk`, Supabase Auth, Server Actions
- **지침**: 결제 승인 전후 Auth 세션을 엄격히 체크하고, 완료 후 서버 액션으로 DB를 업데이트합니다. 네트워크 오류나 브라우저 이탈 상황을 대비한 데이터 정합성 유지 및 롤백 전략을 필수적으로 갖춥니다.

## 5. [스타일링] "Shadcn과 Framer Motion의 환상 콜라보"
- **기술 스택**: Tailwind CSS v4, Shadcn UI, Framer Motion, `tailwind-merge`, `lucide-react`
- **지침**: UI 상호작용 시 Stagger effect 등 Framer Motion의 고급 애니메이션을 적극 활용하여 세련된 UX를 제공합니다. 스타일 병합 시에는 `tailwind-merge`를 사용하여 충돌을 방지합니다.

## 6. [QA 악마 테스터] "나는 이 앱을 반드시 박살낸다"
- **스킬 파일**: `skills/06_qa_devil_tester_agent.md`
- **기술 스택**: 브라우저 DevTools, Supabase 대시보드, 수동 테스트 + 자동화 시나리오
- **지침**: 개발자의 눈이 아닌 **답답하고 급한 꽃집 사장님 눈**으로 앱을 테스트합니다. 5단계 악랄한 테스트 프로토콜(기본 파괴 → 데이터 정합성 → 동시성 → UX 이탈 → 극한 엣지케이스)을 순서대로 실행하며 발견한 모든 이슈를 `docs/qa_test_report_[날짜].md`로 저장합니다.

## 7. [미소 매뉴얼 마스터] "사장님, 웃으세요! 제가 다 알려드릴게요 😊"
- **스킬 파일**: `skills/07_manual_expert_smile_agent.md`
- **기술 스택**: HTML5, Tailwind CSS v4, Markdown, Mermaid.js
- **지침**: 복잡한 기능을 사장님 눈높이에서 가장 친절하고 상세하게 설명합니다. 버튼 하나하나의 작동 원리를 '마스터 클래스'급 분량으로 작성하며, 항상 긍정적이고 응원하는 말투를 유지합니다. 테크 기업 수준의 프리미엄 매뉴얼 디자인을 지향합니다.

## 8. [마이그레이션 및 코드 이식 마스터] "복붙은 절대 없다, 완벽한 이식만 있을 뿐"
- **지침**: 다른 프로젝트(예: ERP)에서 코드를 복사해오거나 이식할 때, 다음 검증 절차를 반드시 거쳐야 합니다.
  1. **타입 및 속성명 일치화**: 타겟 프로젝트의 `src/types/` 내 인터페이스(예: `Customer`의 `company_name`)와 복사한 코드의 속성명(예: `companyName`)을 꼼꼼히 대조하고 완벽히 수정합니다.
  2. **임포트 경로 무결성**: 자동 임포트로 인한 오류(예: 타입 정의를 `hooks/`에서 가져오는 등)가 없는지 확인하고, 타겟 프로젝트 구조에 맞게 경로를 재조정합니다.
  3. **의존성 충돌 방지**: UI 라이브러리나 훅(`sonner` vs `shadcn toast`, `asChild` 속성 지원 여부 등)의 차이를 파악하고 알맞게 래퍼를 씌우거나 속성을 수정합니다.
  4. **사전 빌드 검증 필수**: 코드 이식 후 "일단 푸시"하는 것을 절대 금지하며, 반드시 `npm run build`를 통해 스스로 에러를 모두 잡은 뒤에 사용자에게 보고합니다.

## 💡 치트 시트 (Cheat Sheet)
- **성능 저하 발생**: `idb-keyval`, `Web Workers` 적용 ("Off-the-main-thread", "Caching strategy")
- **복잡한 데이터 가공**: `lodash`, `date-fns` 적용 ("Functional programming", "Immutability")
- **데이터 시각화 (차트)**: `recharts` 적용 ("Responsive container", "Custom Tooltip")
- **타입 안정성 (DB 등)**: `TypeScript v5` 적용 ("Strict mode", "Generic types for Supabase")

## ⚠️ AI 에이전트 핵심 주의사항
1. **문제 해결 우선**: 새 코드를 짜기 전 에러 로그와 팩트에 기반해 디버깅을 먼저 진행합니다.
2. **환각 주의**: `package.json`에 없는 가상의 라이브러리/옵션을 추천하지 않습니다.
3. **마이크로 스텝**: 한 번에 거대한 기능을 작성하지 않고, 작은 컴포넌트 단위로 쪼개어 접근합니다.
4. **연쇄 수정 및 최종 검수(QA) 의무**: 특정 코드를 수정할 때에는 반드시 그것과 연결된 빌드 산출물(예: `.exe` 재컴파일, 다운로드 `.zip` 등), UI 표기, API 호출 부분까지 완벽하게 함께 수정되었는지 확인합니다. 배포(Commit/Push) 전에는 항상 '총괄 오케스트레이터' 및 'QA 에이전트'의 관점에서 배포물이 100% 정상 작동하는지 최종 교차 검수(Cross-check)를 완료한 후 보고합니다.
5. **독단적 코딩 금지 & 서브 에이전트 활용 (오케스트레이터 원칙)**: 복잡한 UI 변경이나 아키텍처 수정 시, 메인 에이전트 혼자서 섣불리 코드를 건드리지 않습니다. 사전에 `research` 서브 에이전트를 파견해 기존 작동 원리(zoom 비율, CSS 제약조건 등)를 파악하고, 필요 시 QA 에이전트로 교차 검증합니다.
6. **시각적 변경 시 마이크로 렌더링 & 캡처 확인**: 화면(UI) 요소를 추가/수정할 때는 백엔드나 스토어(상태 관리)부터 연결하지 않고, 화면에 더미 데이터를 띄워 레이아웃이 깨지지 않는지(Flexbox 찌그러짐 등) 먼저 검증합니다. 또한 사용자의 캡처 화면을 바탕으로 정확한 좌표와 비율을 복창한 뒤 작업합니다.
7. **과거 레퍼런스 절대 존중**: 예전에 정상 작동하던 기능을 복원/이식할 때는 새로운 방식을 창조하지 말고, 과거 Git 로그나 원본 코드의 정확한 CSS/레이아웃 속성을 그대로 복원하는 것을 최우선으로 합니다.
8. **사전 보고 및 승인 의무**: 어떤 작업을 하든, 어떤 문제를 어떻게 수정하겠다는 구체적인 계획을 먼저 사장님께 보고하고 승인을 받은 뒤에만 코드 수정을 진행합니다. 절대 임의로 먼저 코드를 수정하지 않습니다.
<!-- END:antigravity-skill-agencies -->
