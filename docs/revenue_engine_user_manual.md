# Floxync 매출 엔진 — 사장님·운영자 사용 가이드

> **대상 독자:** 꽃집 사장님(매장 운영자) · 신입 직원  
> **버전:** Phase 4 완료 (2026-05-19)  
> **관련 문서:** [revenue_engine_master_plan.md](./revenue_engine_master_plan.md) · [revenue_engine_task_list.md](./revenue_engine_task_list.md) · [revenue_engine_pilot_checklist.md](./revenue_engine_pilot_checklist.md)

---

## 사장님 5분 요약 — 이것만 읽으면 됩니다

> **한 줄 요약:** Floxync가 **기념일·구매 후 문자**, **SNS 글 초안**, **재고 플래시**를 대신 준비하고, **Floxync 링크로 들어온 주문 매출**을 숫자로 보여 줍니다.

### 무엇이 바뀌었나요?

| 구분 | 예전 | 지금 |
|------|------|------|
| 자동화 엔진 | n8n (외부 워크플로) | **Trigger.dev** (예약·지연 발송) |
| 인스타 게시 | n8n 웹훅 | **Postiz** (인스타 연결 후 자동·승인 게시) |
| 사장님 메인 화면 | 마케팅 메뉴 위주 | **매출 캘린더** (`/dashboard/revenue`) 한 곳에서 통합 |

n8n은 **실제 발송·게시 경로에서 제거**됐습니다. 예전 n8n 설정 화면 일부는 레거시로 남아 있을 수 있으나, **새 매출 기능은 전부 Trigger.dev + Postiz**로 동작합니다.

### 사장님 화면 — 어디를 보면 되나요?

**경로:** 대시보드 → **매출 캘린더** (`/dashboard/revenue`)

| 탭·영역 | 하는 일 | 처음 할 일 |
|---------|---------|------------|
| 상단 **Auto-Pilot** | 기념일 D-7 · 구매 후 · SNS · 플래시 자동 ON/OFF | 기념일·구매 후 스위치 **ON** |
| **기념일 D-7** | 7일 뒤 기념일 고객에게 문자+주문 링크 | 고객에 기념일·마케팅 동의 등록 |
| **구매 후** | 배송 완료 후 D+1/7/30 후속 문자 | 주문 **완료** 처리 |
| **SNS 초안** | AI 인스타·네이버 글 → **[복사]** | 완료 주문 선택 → 초안 생성 |
| **성과 리포트** | Floxync가 번 돈 · UTM 귀속 | 링크 경유 주문 1건 확인 |
| 상단 **업그레이드 배너** | PRO 기능 안내 | FLORA PRO 필요 시 구독 페이지 이동 |

**PRO 전용 (FLORA PRO):** SNS Auto-Pilot · 재고 플래시 · Limbic A/B 카피 · 네이버 SEO 5종 · 플래시 승인·폐기 리포트

**구독:** `/dashboard/subscription?highlight=revenue` — PRO 섹션이 강조 표시됩니다.

### 관리자(수퍼) 화면 — 무엇이 추가됐나요?

| 메뉴 | 경로 | 역할 |
|------|------|------|
| **연동 센터 · 매출엔진** | `/dashboard/marketing/admin` → **매출엔진** 탭 | Trigger.dev · Postiz URL/키 · 발송 상한 |
| **매출 엔진 Overview** | `/dashboard/admin/revenue` | 전 매장 Floxync 귀속 매출 |
| **본사 HQ 대시보드** | `/dashboard/hq` | **Floxync가 번 돈 (지점별)** 카드 |

> 예전 **마케팅 관리자** (`/dashboard/admin/marketing`)의 n8n 웹훅 필드는 **더 이상 쓰지 않습니다.** Postiz·Trigger 설정은 **매출엔진** 탭에서 하세요.

### 플랜별로 쓸 수 있는 것 (30초)

| 플랜 | 쓸 수 있는 것 |
|------|----------------|
| **Free** | SNS 수동 초안 (월 발송 5건 상한) |
| **ERP SMART** | 기념일 D-7 · 구매 후 · 귀속 리포트 |
| **FLORA PRO** | 위 전부 + SNS Auto-Pilot · 재고 플래시 · A/B 카피 · 네이버 SEO |

### 오늘 바로 시작 (3단계)

1. **고객 관리** → 마케팅 동의 ON + 기념일 1건 등록  
2. **매출 캘린더** → Auto-Pilot **기념일 D-7** · **구매 후** ON  
3. 완료 주문 1건 → **SNS 초안** 탭에서 AI 글 생성 → **[복사]**

### 더 읽고 싶을 때

| 문서 | 용도 |
|------|------|
| **이 파일 아래 본문** | 기능별 상세·막힐 때 해결 |
| [revenue_engine_pilot_checklist.md](./revenue_engine_pilot_checklist.md) | 4주 파일럿 주차별 체크 |
| [revenue_engine_task_list.md](./revenue_engine_task_list.md) | 개발·운영 완료 항목 (기술자용) |

---

## 이 가이드로 할 수 있는 것

Floxync **매출 엔진**은 API 연동 없이도 아래를 자동·반자동으로 돕습니다.

| 기능 | 효과 |
|------|------|
| **기념일 D-7 알림** | 7일 뒤 기념일 고객에게 미리 연락 → 재주문 |
| **구매 후 시퀀스** | 배송 완료 D+1 / D+7 / D+30 후속 메시지 |
| **SNS AI 초안** | 완료 주문 사진 기반 인스타·네이버 글 → 원탭 복사 |
| **Floxync가 번 돈** | 링크로 들어온 주문 매출 귀속 집계 |

---

## 시작 전 체크리스트 (최초 1회)

### 1. 데이터베이스 스키마 적용 (수퍼관리자)

Supabase **SQL Editor**에서 아래 파일 **전체**를 실행합니다.

```
supabase/revenue_engine_schema.sql
```

> **확인 방법:** `/dashboard/revenue` 접속 시 오류 없이 카드가 보이면 대부분 적용된 상태입니다.

### 2. 환경 변수 (운영·개발)

| 변수 | 용도 | 설정 위치 |
|------|------|-----------|
| `TRIGGER_PROJECT_REF` | Trigger.dev 프로젝트 | Vercel · `.env.local` |
| `TRIGGER_SECRET_KEY` | 배치·시퀀스 트리거 | Vercel · Trigger.dev 대시보드 |
| `SUPABASE_SERVICE_ROLE_KEY` | Trigger가 DB 접근 | Trigger.dev env |
| `NEXT_PUBLIC_APP_URL` | 1클릭 주문 링크 | Vercel |
| `GEMINI_API_KEY` 또는 `NEXT_PUBLIC_GEMINI_API_KEY` | SNS AI 초안 | Vercel |
| `SOLAPI_API_KEY` · `SOLAPI_API_SECRET` · `SOLAPI_SENDER_NUMBER` | 실제 SMS/알림톡 (선택) | Vercel · Trigger.dev |

Solapi를 **설정하지 않으면** 메시지는 **mock(log)** 로 기록되고, 캠페인은 `degraded` 상태로 저장됩니다. (테스트·데모 가능)

### 3. Trigger.dev 로컬 확인 (개발자)

```bash
npm run trigger:dev
```

Trigger.dev 대시보드에서 다음 태스크가 보여야 합니다.

- `revenue.anniversary-d7` — 매일 09:00 KST
- `revenue.order-delivered` — 배송 완료 후 시퀀스

---

## 화면 구성 — 어디서 무엇을 하나요?

| 메뉴 | 경로 | 역할 |
|------|------|------|
| **매출 캘린더** | 대시보드 → **매출 캘린더** (`/dashboard/revenue`) | Auto-Pilot · 발송 · SNS · 성과 |
| **고객 관리** | `/dashboard/customers` | 기념일 · **마케팅 동의** 등록 |
| **배송 관리** | `/dashboard/delivery` | 주문 **완료** 처리 → 구매 후 시퀀스 시작 |
| **매출 엔진 Overview** | `/dashboard/admin/revenue` | (수퍼) 전 매장 귀속 매출 |
| **연동 센터 · 매출엔진** | `/dashboard/marketing/admin` → **매출엔진** 탭 | (수퍼) Trigger · Postiz · 발송 상한 |

---

## 1. 기념일 D-7 — 「이번 주 벌어줄 돈」

### 기능명
**기념일 D-7 알림** (매출 캘린더 → **기념일 D-7** 탭)

### 개요
고객의 기념일(결혼기념일, 생일 등) **7일 전**에 문자/알림톡으로 “곧 기념일이에요” + **1클릭 주문 링크**를 보냅니다.  
마케팅 동의한 고객만 대상입니다.

### 이용 순서

#### Step A — 고객 등록 (최초)

1. **대시보드 → 고객 관리**로 이동합니다.
2. **[고객 추가]** 또는 기존 고객 **[수정]**을 누릅니다.
3. **마케팅 동의** 스위치를 **ON** 합니다. (법적 opt-in)
4. **기념일** 날짜와 라벨(예: “결혼기념일”)을 입력합니다.
5. **[저장]**을 누릅니다.

> **팁:** 테스트 시 기념일을 **오늘 + 7일**로 넣으면 당일 D-7 대상에 잡힙니다.

#### Step B — Auto-Pilot 켜기

1. **대시보드 → 매출 캘린더**로 이동합니다.
2. 상단 카드 **Auto-Pilot**에서 **기념일 D-7** 스위치를 **ON** 합니다.
3. **이번 주 예상 (D-7)** · **D-7 대상** 숫자가 갱신되는지 확인합니다.

#### Step C — 자동 vs 수동 발송

| 모드 | 동작 |
|------|------|
| **Auto-Pilot ON** | 매일 **09:00 (한국 시간)** Trigger.dev가 자동 발송 |
| **수동** | **기념일 D-7** 탭에서 대상 옆 **[발송]** 또는 **[전체 발송]** |

#### Step D — 성과 확인

- 상단 **Floxync가 번 돈** 카드 · **성과 리포트** 탭에서 귀속 매출 확인
- 고객이 링크로 주문하면 `utm_campaign`으로 자동 귀속 (아래 5장 참고)

### 메시지 문구 바꾸기

1. 매출 캘린더 → **설정** 탭
2. **메시지 템플릿** → **기념일 D-7** 입력란 수정
3. **[설정 저장]**

**사용 가능한 치환어:** `{{customerName}}` `{{label}}` `{{eventDate}}` `{{shopName}}` `{{orderLink}}`  
비워 두면 **기본 문구**가 사용됩니다.

### 자주 막히는 경우

| 증상 | 원인 | 해결 |
|------|------|------|
| D-7 대상 0명 | 기념일 없음 / 7일 후 해당 없음 | 고객에 기념일 등록 |
| 발송 스킵 `no_consent` | 마케팅 동의 OFF | 고객 수정에서 동의 ON |
| 발송 스킵 `autopilot_off` | Auto-Pilot OFF | 기념일 D-7 스위치 ON |
| 발송 스킵 `monthly_cap_exceeded` | 월 발송 상한 | 수퍼: 연동 센터에서 상한 조정 |
| 실제 문자 안 감 | Solapi 미설정 | env 설정 또는 mock으로 campaign만 확인 |

---

## 2. 구매 후 시퀀스 — D+1 · D+7 · D+30

### 기능명
**구매 후 시퀀스** (매출 캘린더 → **구매 후** 탭)

### 개요
주문이 **완료**되면 Trigger.dev가 다음 일정으로 후속 메시지를 보냅니다.

| 시점 | 목적 |
|------|------|
| **D+1** | 수령 확인·감사 |
| **D+7** | 재구매 제안 |
| **D+30** | 계절·시즌 추천 |

### 이용 순서

1. **매출 캘린더** → Auto-Pilot → **구매 후 D+1/7/30** **ON**
2. 주문 고객의 **마케팅 동의 ON** 확인
3. **배송 관리** (`/dashboard/delivery`) 또는 주문 화면에서 상태를 **완료**로 변경
4. (개발/운영) Trigger.dev에서 `revenue.order-delivered` run 시작 확인

> **중요:** 완료 처리 **직후** 시퀀스가 등록됩니다. D+1은 **1일 대기** 후 발송됩니다.

### 문구 수정

**매출 캘린더 → 설정** 탭에서 다음 템플릿을 수정합니다.

- 구매 후 D+1 / D+7 / D+30

치환어: `{{customerName}}` `{{orderNumber}}` `{{shopName}}` `{{productSummary}}` `{{orderLink}}`

### 자주 막히는 경우

| 증상 | 해결 |
|------|------|
| 시퀀스 안 시작 | `TRIGGER_SECRET_KEY` 확인 · 완료 상태인지 확인 |
| 스킵 `no_consent` | 고객 마케팅 동의 ON |
| 스킵 `already_sent` | 같은 주문·단계는 1회만 |

---

## 3. SNS AI 초안 — 인스타·네이버 원탭 복사

### 기능명
**SNS 초안** (매출 캘린더 → **SNS 초안** 탭)

### 개요
**완료된 주문**을 고르면 Gemini + NaverService로 **인스타 캡션**과 **네이버 블로그 원고** 초안을 만들고, **[복사]** 한 번으로 클립보드에 넣을 수 있습니다.

### 이용 순서

1. **매출 캘린더 → SNS 초안** 탭
2. **완료 주문** 버튼 중 하나 선택 (최근 완료 10건)
3. **콘텐츠 유형 (7종)** 선택  
   - 작품 소개 · 계절 추천 · 기념일 선물 · 제작 비하인드 · 고객 후기형 · 지역 SEO · 한정 프로모
4. **홍보 주제 1~3** 중 하나 선택 (설정 탭에서 문구 변경 가능)
5. **[AI 초안 생성]** 클릭
6. Instagram / 네이버 블로그 카드에서 **[복사]**
7. 인스타 앱·네이버 블로그에 **붙여넣기 → 게시**

### 페르소나·홍보 주제 설정

**매출 캘린더 → 설정** 탭

| 항목 | 설명 |
|------|------|
| **브랜드 페르소나** | 따뜻한 감성 / 고급 프리미엄 / 트렌디·힙 (3종) |
| **홍보 주제 1~3** | AI가 주문 정보와 합쳐 사용하는 키워드 |
| **[설정 저장]** | 다음 SNS 생성부터 반영 |

### 게시 알림

첫 방문 시 브라우저 **알림 허용**을 누르면, **[복사]** 후 “인스타/네이버에 게시해 주세요” 알림이 뜹니다.

### 자주 막히는 경우

| 증상 | 해결 |
|------|------|
| `GEMINI_KEY_MISSING` | Vercel에 Gemini API 키 설정 |
| 완료 주문 없음 | 배송·픽업 **완료** 처리 후 재시도 |
| 글 품질 아쉬움 | 페르소나·콘텐츠 유형·홍보 주제 변경 후 재생성 |

---

## 4. Floxync가 번 돈 — 성과 리포트

### 기능명
**성과 리포트** · **Floxync가 번 돈** 카드

### 개요
기념일·구매 후 링크의 `utm_campaign`(= `campaign_code`)으로 들어온 주문 금액을 **귀속 매출**로 기록합니다.

### 흐름 (자동)

```
① Floxync가 문자/링크 발송 → marketing_campaigns 생성 (campaign_code)
② 고객이 링크 클릭 → 주문 작성 화면 (?utm_campaign=xxx&customerId=...)
③ 주문 저장 → /api/revenue/attributions/match 자동 호출
④ marketing_attributions + 「Floxync가 번 돈」에 반영
```

### 확인 방법

1. **매출 캘린더** 상단 **Floxync가 번 돈** 카드
2. **성과 리포트** 탭 상세
3. (수퍼) **매출 엔진 Overview** `/dashboard/admin/revenue`

---

## 5. Auto-Pilot 한눈에 보기

| 스위치 | 위치 | ON일 때 |
|--------|------|---------|
| 기념일 D-7 | 매출 캘린더 상단 | 매일 09:00 D-7 자동 발송 |
| 구매 후 D+1/7/30 | 매출 캘린더 상단 | 완료 주문마다 시퀀스 시작 |

**공통 조건:** 고객 **마케팅 동의 ON**

---

## 6. 수퍼관리자 — 연동 센터

**경로:** 대시보드 → **마케팅 관리자** → **매출엔진** 탭  
(`/dashboard/marketing/admin`)

| 설정 | 설명 |
|------|------|
| Postiz API URL / Key | Phase 2 SNS 자동 게시 (예정) |
| Trigger Project Ref / Environment | Trigger.dev 프로젝트 연결 |
| **쿠폰·발송 상한** | 고객당 월 발송 수 · 예상 매출 상한 · 재발송 간격 |

---

## 7. 테스트 시나리오 (15분)

### A. 기념일

1. 테스트 고객 생성 · 마케팅 동의 ON · 기념일 = 오늘+7일
2. 매출 캘린더 · 기념일 Auto-Pilot ON
3. D-7 탭 **[새로고침]** → 대상 1명 확인
4. **[발송]** → Trigger/Solapi 또는 mock 로그 확인
5. 링크로 주문 → **Floxync가 번 돈** 증가 확인

### B. 구매 후

1. 구매 후 Auto-Pilot ON
2. 배송 관리에서 주문 **완료**
3. Trigger.dev `revenue.order-delivered` run 확인

### C. SNS

1. 완료 주문 선택 → AI 초안 생성 → 복사 → 알림 확인

---

## 8. 용어 정리

| 용어 | 설명 |
|------|------|
| **Auto-Pilot** | Floxync가 사람 개입 없이 실행 |
| **campaign_code** | 캠페인·UTM 식별자 (귀속의 핵심) |
| **귀속(Attribution)** | Floxync 링크 덕분에 들어온 주문 매출 |
| **mock(log)** | Solapi 없을 때 콘솔 기록만 (데모용) |
| **Trigger.dev** | 예약·지연 발송 오케스트레이션 |

---

## 9. Phase 2 — Instagram 자동 게시 (Postiz)

### 9-1. 수퍼관리자: Postiz VPS

1. `infra/postiz/.env.example` → `.env` 복사 후 도메인·JWT 설정
2. VPS에서 `docker compose -f infra/postiz/docker-compose.yml up -d`
3. Postiz 관리자 가입 → **Settings → Developers → Public API** 키 발급
4. **마케팅 관리자 → 매출엔진** 탭: Postiz API URL · Trigger ref 저장
5. Vercel/Trigger env: `POSTIZ_API_URL`, `POSTIZ_API_KEY`

### 9-2. 사장님: Instagram 연결

1. **매출 캘린더 → SNS 초안** 탭
2. **[Postiz 열기]** → Postiz에서 Instagram 계정 연결 (Facebook 로그인)
3. **[연결 확인]** → Floxync에 integration ID 동기화
4. **SNS Auto-Pilot ON** (월·수·금 10:00 자동 게시)
5. (선택) **게시 30분 전 승인 ON** → 승인 대기 목록에서 **[승인·게시]**

### 9-3. 승인 모드

Auto-Pilot이 초안을 만들면 **30분 후** 게시 예정으로 올라옵니다.  
**승인 대기 SNS** 카드에서 내용 확인 → **[승인·게시]** 또는 **[취소]**.

Postiz 실패 시 **revenue.postiz-fallback** 이 SNS 초안으로 저장됩니다.

### 9-4. 마케팅 페이지 게시 (n8n 제거)

**마케팅 → AI 생성 → 게시** 는 이제 **Postiz** 로 전송됩니다.  
Instagram 미연결 시 매출 캘린더에서 연결 안내가 표시됩니다.

---

## 10. Phase 3 — 재고 플래시

1. **매출 캘린더 → SNS 초안** 탭 하단 **재고 플래시 Auto-Pilot ON** (FLORA PRO)
2. 재고 **5개 이하** 상품이 **재고 임박** 카드에 표시
3. Trigger `revenue.flash-inventory` (매일 08:00) 가 `flash_sale` 캠페인 draft 생성
4. **플래시 승인 대기** 카드에서 **[승인·복사]** → 문구 복사 후 발송
5. **폐기·재고 리스크** 카드 — 임박 SKU · 재고 리스크 금액 · 폐기비(지출) 확인
6. 승인 시 `campaign_code` 가 UTM 귀속에 연결됩니다

---

## 11. Phase 4 — 성장 (플랜 · A/B · SEO · HQ)

### 11-1. 플랜별 매출 기능

| 플랜 | 기능 |
|------|------|
| Free | SNS 수동 초안 (월 5건 발송 상한) |
| ERP SMART | 기념일 D-7 · 구매 후 · 귀속 리포트 |
| FLORA PRO | SNS Auto-Pilot · 재고 플래시 · Limbic A/B · 네이버 SEO 5종 |

업그레이드: **매출 캘린더** 상단 배너 → **FLORA PRO 보기** (`/dashboard/subscription?highlight=revenue`)

### 11-2. Limbic A/B 카피 (PRO)

SNS 초안 생성 시 **Limbic A/B 카피** ON → 자극·균형·프리미엄·실용 톤 변형 2~4개 생성

### 11-3. 네이버 SEO 템플릿 (PRO)

**네이버 SEO 템플릿** 선택: 지역 꽃집 · 계절 · 기념일 · 기업 · 배달 등 5종

### 11-4. HQ 지점별 귀속 매출

**본사(HQ) 대시보드** → **Floxync가 번 돈 (지점별)** 카드 — 최근 30일 UTM 귀속 합계

---

## 12. SNS 성과 (예상 vs 귀속)

**성과 리포트** 또는 `GET /api/revenue/sns/stats` — 최근 30일:

- SNS 캠페인 수 · 게시 수
- SNS 귀속 주문 수 · 귀속 매출

---

## 13. 문제 해결 · 지원

| 문제 | 조치 |
|------|------|
| API 503 + schema hint | `revenue_engine_schema.sql` 재실행 (Phase 2 테이블 포함) |
| Trigger 태스크 없음 | `npm run trigger:dev` · 5개 태스크 등록 확인 |
| Postiz 연결 실패 | URL `/public/v1` · API 키 · Instagram Postiz 연결 |
| `POSTIZ_NOT_CONNECTED` | [Postiz 열기] → [연결 확인] |
| n8n 오류 | **제거됨** — publish API는 Postiz 사용 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-05-19 | Phase 2·3 가이드 추가 (Postiz · SNS Auto-Pilot · 플래시) |
| 2026-05-19 | Phase 1 전체 기능 기준 최초 작성 |
