# Floxync 매출 엔진 마스터 플랜

> **문서 버전:** v2.0  
> **작성일:** 2026-05-19  
> **상태:** 실행 계획 (Living Document)  
> **북극성:** Floxync를 쓰는 **모든 매장(일반 사용자)** 이 measurable한 **증분 매출**을 얻도록 한다.

---

## 0. 한 줄 정의

Floxync는 꽃집 ERP가 아니라 **매장 매출을 자동으로 올리는 운영 OS**다.  
SNS 자동화는 수단 중 하나이며, **기념일 재구매·구매 후 시퀀스·재고 플래시** 등 ERP 데이터 기반 레버가 우선이다.

```
"관리만 편해지는 앱은 많다. 매출이 올라가는 앱은 Floxync뿐."
```

---

## 1. 북극성 지표 (North Star)

### 1-1. 매장(테넌트) KPI

| 지표 | 정의 | 6개월 목표 |
|------|------|-----------|
| **증분 매출** | Floxync 캠페인·알림·링크로 귀속된 주문 금액 | 소형 +20만원/월+, 중형 +50만원/월+ |
| **재구매율** | 90일 내 2회 이상 주문 고객 비율 | +15%p |
| **캠페인→주문 전환** | 알림/게시 후 7일 내 주문 | 추적·리포트 가능 |

### 1-2. Floxync(플랫폼) KPI

| 지표 | 목표 |
|------|------|
| D30 리텐션 | 60%+ |
| 「매출이 늘었다」 자가 체감 | 70%+ |
| 유료 전환 1위 이유 | 「매출 올라서」 |

> **주의:** SNS 게시 수, Trigger.dev run 성공률은 북극성 KPI가 **아님**. 사장님은 「올린 글 수」가 아니라 「들어온 주문·돈」만 본다.

---

## 2. 매출 레버 우선순위 (ROI × 난이도)

월 매출 1,000만원 기준 사업계획 시뮬레이션을 **구현 순서**로 재정렬.

| 순위 | 레버 | 월 추가매출(목표) | ROI | 난이도 | 주 담당 |
|:---:|------|:---:|:---:|:---:|---------|
| 1 | 기념일 자동 리마인더 → 1클릭 재주문 | +63만 | 150배 | ★★☆ | **일반 사용자** + Trigger.dev + 알림톡 |
| 2 | 구매 후 자동 마케팅 (감사·재구매) | +25만 | 125배 | ★★☆ | **일반 사용자** |
| 3 | 플래시 세일 (유통기한·잔여 재고) | +15만 | ∞ | ★★☆ | **일반 사용자** |
| 4 | 스마트 쿠폰/포인트 | +40만 | 5배 | ★★★ | **일반 사용자** + **수퍼관리자** 정책 |
| 5 | SNS 홍보 (인스타 + 네이버 초안) | +50만 | ∞ | ★★★★ | Postiz(인스타) + Floxync(네이버) |
| 6 | 정기구독 꽃 | +110만 | ∞ | ★★★★ | Phase 4 |

**원칙:** 1→2→3→5 순. SNS(5)를 1번으로 두지 않는다.

---

## 3. 인프라 아키텍처 (v2.0 확정)

### 3-1. 3-tier 분리 — 역할이 겹치지 않음

| 레이어 | 기술 | 호스팅 | 역할 |
|--------|------|--------|------|
| **앱·데이터** | Next.js 15 + Supabase | Vercel + Supabase | UI, Auth, ERP 데이터, Attribution, AI 원고 |
| **오케스트레이션** | **Trigger.dev v3** | Trigger.dev Cloud (또는 셀프호스트) | 크론, 이벤트 시퀀스, 재시도, 분기, 외부 API 호출 |
| **SNS 게시** | **Postiz (오픈소스 셀프호스트)** | 별도 VPS (Docker) | 인스타·페이스북 등 OAuth + 예약 게시 |
| **한국 채널** | **NaverService (Floxync 직연)** | Vercel (기존 코드) | 네이버 검색 트렌드 + AI 블로그 원고 + 복사/알림 |

> **Postiz + Trigger.dev 동시 운용 = 권장.** Trigger.dev가 「두뇌」, Postiz가 「SNS 팔」이다. n8n 1대가 하던 일을 역할 분리한 것.

### 3-2. 전체 토폴로지

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Floxync (Vercel)                             │
│  Next.js App Router · Server Actions · Supabase RLS                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ 매출 캘린더  │  │ NaverService │  │ /api/revenue/* Attribution  │  │
│  │ Auto-Pilot  │  │ (직연)       │  │ /api/marketing/*            │  │
│  └──────┬──────┘  └──────────────┘  └─────────────────────────────┘  │
│         │ tasks.trigger() / schedules                                │
└─────────┼───────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Trigger.dev (Cloud / Self-host)                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ cron:anniversary │  │ cron:daily-pilot │  │ event:order-     │   │
│  │ -d7 (매일 09:00) │  │ (SNS·네이버 배치) │  │ delivered        │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘   │
│           │                     │                      │             │
│           ├─ 알림톡/SMS API ────┤                      │             │
│           ├─ NaverService 호출 ─┤ (Floxync 내부)       │             │
│           └─ Postiz REST API ───┴──────────────────────┘             │
└─────────┬───────────────────────────────────────────────────────────┘
          │ POST /api/posts (예약)
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Postiz VPS (Hetzner / DigitalOcean 등)                  │
│  Docker: Postiz + Postgres + Redis + Temporal                        │
│  OAuth: Instagram · Facebook · (기타 Postiz 지원 채널)               │
│  ❌ 네이버 블로그 — Postiz 미지원 → Floxync NaverService 사용         │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
     Instagram / Facebook 실제 게시
```

### 3-3. 채널별 담당 매트릭스 (한국 서비스 기준)

| 채널 | 담당 | Phase 1 | Phase 2+ | 비고 |
|------|------|---------|----------|------|
| **알림톡 / SMS** | Trigger.dev → 카카오/SMS API | ✅ | ✅ | 한국 꽃집 1순위 액션 |
| **인스타그램** | Trigger.dev → Postiz API | 복사만 | 자동 예약 | Meta OAuth는 Postiz VPS |
| **네이버 블로그** | Floxync `NaverService` | AI 원고 + 복사 | + 알림톡 링크 | 공식 쓰기 API 제한적 |
| **네이버 검색 트렌드** | Floxync `NaverService` | ✅ | ✅ | `openapi.naver.com` |
| **페이스북** | Postiz (선택) | — | Phase 3+ | 인스타 우선 |

### 3-4. 연동 단순화 원칙

| 원칙 | 설명 |
|------|------|
| ERP-first | Floxync DB 데이터부터 monetize |
| Notify-first | 한국 꽃집: 알림톡/문자 > SNS |
| Copy-before-post | 자동 게시 전 「복사+알림」으로 가치 증명 |
| **Trigger + Postiz** | 스케줄·로직 = Trigger.dev, 글로벌 SNS = Postiz **1곳** |
| **Naver in Floxync** | 네이버는 Postiz에 맡기지 않음 — Floxync 직연 |
| No n8n | n8n VPS·웹훅 v13~v19 **전면 폐기** |
| No Ayrshare (초기) | Launch $299/월 — 파일럿 단계엔 Postiz 셀프호스트 |
| No tenant webhook | 사장님은 API URL·키를 몰라도 됨 |

### 3-5. Revenue Engine 4-layer (논리 구조)

```
┌─────────────────────────────────────────────────────────┐
│              Floxync Revenue Engine                      │
├─────────────────────────────────────────────────────────┤
│  DATA LAYER (Supabase)                                   │
│  주문 · 고객 · 기념일 · 작품사진 · 재고 · 포인트          │
├─────────────────────────────────────────────────────────┤
│  TRIGGER LAYER (Trigger.dev)                             │
│  D-7 기념일 · 배송완료 · 재고 임박 · Auto-Pilot 배치     │
├─────────────────────────────────────────────────────────┤
│  ACTION LAYER                                            │
│  알림톡 · SMS · AI 초안 · Naver 원고 · Postiz SNS 게시  │
├─────────────────────────────────────────────────────────┤
│  ATTRIBUTION LAYER (필수)                                │
│  UTM · 전용 링크 · campaign_id → 주문 매칭 → 대시보드    │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Trigger.dev — 구체 운용

### 4-1. 왜 Trigger.dev인가

| 비교 | Vercel Cron | Trigger.dev | n8n (폐기) |
|------|-------------|-------------|------------|
| 실행 시간 | 짧음 (함수 제한) | **긴 배치·재시도** | VPS 상시 |
| 설계 방식 | cron + API 1회 | **TypeScript 태스크** | 드래그 노드 |
| 버전 관리 | 코드 | **코드 (Git)** | JSON export |
| Postiz 호출 | 가능하나 retry 약함 | **step retry 내장** | 가능 |
| 운영 부담 | 낮음 | **낮음 (Cloud)** | VPS 유지 |

> Inngest는 이벤트 시퀀스(`order.delivered` → D+7)에 강하지만, **크론·배치·Postiz 연동 중심**이면 Trigger.dev 단일 스택으로 통일한다.

### 4-2. Floxync 태스크 목록 (계획)

| 태스크 ID | 트리거 | 하는 일 |
|-----------|--------|---------|
| `revenue.anniversary-d7` | `0 9 * * *` (KST) | D-7 기념일 고객 → 알림톡 + 1클릭 주문 링크 + Attribution |
| `revenue.order-delivered` | `order.status = delivered` | D+1 감사, D+7 재구매, D+30 시즌 (delay step) |
| `revenue.daily-autopilot` | `0 10 * * *` | Auto-Pilot ON 매장: AI 캡션 → Postiz 예약 / 네이버 초안 저장 |
| `revenue.flash-inventory` | `0 8 * * *` | 재고 임박 → 플래시 초안 + 알림 (Phase 3) |
| `revenue.postiz-fallback` | Postiz 실패 webhook | 알림톡 + 「인스타용 복사」 degrade |

### 4-3. 프로젝트 구조 (예정)

```
florasync-saas/
├── trigger/
│   ├── anniversary-d7.ts
│   ├── order-delivered.ts
│   ├── daily-autopilot.ts
│   └── lib/
│       ├── supabase-admin.ts
│       ├── alimtalk.ts
│       ├── postiz-client.ts
│       └── naver-draft.ts
├── trigger.config.ts
└── src/ ... (기존 Next.js)
```

### 4-4. 환경 변수 (Trigger.dev + Floxync 공유)

| 변수 | 위치 | 용도 |
|------|------|------|
| `TRIGGER_SECRET_KEY` | Vercel + Trigger.dev | 태스크 트리거 인증 |
| `POSTIZ_API_URL` | Trigger.dev | `https://postiz.yourdomain.com` |
| `POSTIZ_API_KEY` | Trigger.dev | Postiz 관리자 API 키 |
| `NAVER_CLIENT_ID` / `SECRET` | Vercel | 네이버 검색·트렌드 |
| `KAKAO_ALIMTALK_*` | Trigger.dev | 알림톡 발송 |
| `SUPABASE_SERVICE_ROLE_KEY` | Trigger.dev | 배치용 DB (RLS 우회 최소화 설계) |

---

## 5. Postiz 셀프호스팅 — 구체 운용

### 5-1. VPS 스펙·비용 (2026 기준 가이드)

| 항목 | 권장 |
|------|------|
| VPS | Hetzner CX22 / DO Basic 2vCPU 4GB |
| 월 비용 | **$5~12** |
| 스택 | Docker Compose: Postiz + Postgres + Redis + Temporal |
| 도메인 | `postiz.internal.florasync.com` (HTTPS 필수) |
| 백업 | Postgres 일 1회 스냅샷 |

> Vercel/Supabase에 Postiz를 올릴 수 **없음**. 반드시 별도 VPS.

### 5-2. Floxync ↔ Postiz 연동 흐름

```
1. 수퍼관리자: Postiz VPS 기동 + API 키 → platform_config 저장
2. 일반 사용자: Floxync UI 「인스타 연결」 → Postiz OAuth 프록시 (Floxync 서버)
3. Trigger.dev daily-autopilot:
   a. Supabase: tenant + instagram_connected + autopilot_on
   b. AI 캡션 + 작품 이미지 URL 생성
   c. POST Postiz /api/posts { channel, content, media, scheduleAt }
   d. 결과 → marketing_campaigns + attribution_id 기록
4. 실패 시 → revenue.postiz-fallback 태스크
```

### 5-3. 테넌트 OAuth 프록시 (수퍼관리자 구현)

- Meta 앱은 **플랫폼 단위 1개** (테넌트별 App ID 입력 금지)
- Floxync `/api/integrations/postiz/connect` → Postiz OAuth URL redirect
- 콜백에서 `tenant_id ↔ postiz_integration_id` 매핑 Supabase 저장
- 토큰 갱신은 Postiz VPS가 담당, Floxync는 integration_id만 참조

### 5-4. Postiz vs Ayrshare (의사결정 기록)

| | Postiz 셀프호스트 | Ayrshare |
|---|-------------------|----------|
| 월 비용 | **$5~12 (VPS)** | $299+ (10 프로필) |
| 채널 | 30+ (네이버 ❌) | 30+ (네이버 ❌) |
| 운영 | VPS 직접 | SaaS |
| **Floxync Phase 2** | **✅ 채택** | 파일럿 이후 검토 |

---

## 6. 네이버 — Floxync 직연 (Postiz 밖)

### 6-1. API 현실

| 기능 | API | 자동화 가능 |
|------|-----|-------------|
| 블로그 검색·트렌드 | 네이버 검색 Open API | ✅ |
| AI 블로그 원고 | Gemini (`NaverService`) | ✅ |
| **블로그 자동 포스팅** | 제휴 파트너 한정 | ❌ (Phase 4+도 복사 우선) |

### 6-2. 한국형 SNS UX (Phase 1~2)

```
Trigger.dev daily-autopilot
  └─ NaverService.generateBlogPost()
       └─ Supabase marketing_drafts (type: naver_blog)
            └─ 알림톡: 「네이버용 글이 준비됐어요 [복사하기]」
                 └─ Floxync UI: 원탭 복사 → 사장님이 네이버에 붙여넣기
```

**자동 포스팅(Puppeteer 등)은 의도적 제외** — ToS·유지보수·장애 리스크.

---

## 7. 역할 정의

| 역할 | 대상 | 목적 |
|------|------|------|
| **수퍼관리자** | Floxync 본사 (플랫폼 운영) | Trigger.dev·Postiz VPS·알림톡·Attribution·Harness |
| **일반 사용자** | 꽃집 사장님 / 매장 직원 (테넌트) | Auto-Pilot ON, 고객·콘텐츠·승인 — **돈 버는 행동** |
| **HQ/조직 관리자** | 다매장 본사 (선택) | 지점별 성과 비교, 공통 캠페인 (Phase 4+) |

---

## 8. 단계별 로드맵 — 역할별 할 일

---

### Phase 0 — 기반 (4주) 「돈을 재는 눈 + Trigger.dev 골격」

**목표:** Attribution + 오케스트레이션 뼈대. n8n 신규 개발 중단.

#### 수퍼관리자 할 일

| # | 작업 | 산출물 |
|---|------|--------|
| 0-S1 | `marketing_attributions` 등 공통 스키마 | `supabase/revenue_engine_schema.sql` |
| 0-S2 | Attribution API (`/api/revenue/attributions`) | 서버 라우트 |
| 0-S3 | 플랫폼 대시보드 — 전체 테넌트 증분 매출 위젯 | `/dashboard/admin` |
| 0-S4 | **Trigger.dev init** (`npx trigger.dev@latest init`) | `/trigger`, `trigger.config.ts` |
| 0-S5 | `revenue.anniversary-d7` 스켈레톤 (로그만) | `trigger/anniversary-d7.ts` |
| 0-S6 | **n8n 신규 워크플로 개발 중단** 공지 | 본 문서 |
| 0-S7 | `platform_config` 스키마: `postiz_api_url`, `trigger_env` | SQL + admin UI 골격 |

#### 일반 사용자 할 일

| # | 작업 | 산출물 |
|---|------|--------|
| 0-U1 | (인프라 단계) | — |
| 0-U2 | 온보딩: 「고객 10명」「기념일 1건」 | 설정/온보딩 |

**성공 기준:** `campaign_id`로 주문 매칭 가능 + Trigger.dev dev 환경에서 cron 1회 실행 확인

---

### Phase 1 — Quick Wins (6주) 「API 없이 돈 벌기」

**목표:** 2주 내 사장님 체감 매출. Postiz 없이 Trigger.dev + 알림 + 복사.

#### 1-A. 기념일 자동 수익

| 수퍼 | # | 작업 |
|------|---|------|
| | 1-S1 | `revenue.anniversary-d7` 완성 — Supabase 조회 → 알림톡 → Attribution |
| | 1-S2 | 알림톡/SMS 플랫폼 연동 (테넌트 발신 프로필) |
| | 1-S3 | 쿠폰 상한·어뷰징 정책 |
| | 1-S4 | 기념일 템플릿 Harness |

| 일반 | # | 작업 |
|------|---|------|
| | 1-U1 | 고객 기념일·선호·알레르기 입력 |
| | 1-U2 | 「기념일 자동 수익」 Auto-Pilot ON/OFF |
| | 1-U3 | D-7 미리보기 → [자동 발송] / [1클릭 주문] |
| | 1-U4 | 마케팅 수신 동의 확인 |
| | 1-U5 | 「이번 주 예상 매출」 카드 |

#### 1-B. 구매 후 시퀀스

| 수퍼 | # | 작업 |
|------|---|------|
| | 1-S5 | `revenue.order-delivered` — D+1, D+7, D+30 delay steps |
| | 1-S6 | 시퀀스 템플릿 Harness |

| 일반 | # | 작업 |
|------|---|------|
| | 1-U6 | 「구매 후 자동 감사/재구매」 ON/OFF |
| | 1-U7 | 시퀀스 문구 수정 (선택) |
| | 1-U8 | 배송 완료 처리 습관 |

#### 1-C. AI 초안 + 네이버/인스타 복사 (SNS v0.5)

| 수퍼 | # | 작업 |
|------|---|------|
| | 1-S7 | `/api/marketing/suggest-from-order` — AI 캡션 |
| | 1-S8 | `NaverService` → `marketing_drafts` 저장 API |
| | 1-S9 | 7종 콘텐츠 Harness |

| 일반 | # | 작업 |
|------|---|------|
| | 1-U9 | 작품 사진 → AI 추천 글 |
| | 1-U10 | 「인스타용 복사」「네이버용 복사」 |
| | 1-U11 | 게시 알림 — 「11시, ○○ 꽃다발 올리기」 |
| | 1-U12 | 페르소나·홍보 주제 3개 |

**Phase 1 성공 기준:** 활성 매장 50% — 4주 내 Floxync 귀속 주문 1건+ / 「매출 도움」 60%+

---

### Phase 2 — SNS 자동화 v1 (8주) 「Postiz VPS + n8n 제거」

**목표:** Instagram 자동 예약 게시. Trigger.dev가 Postiz 호출.

#### 수퍼관리자 할 일

| # | 작업 |
|---|------|
| 2-S1 | **Postiz VPS** Docker Compose 배포 + HTTPS |
| 2-S2 | `trigger/lib/postiz-client.ts` — createScheduledPost, getStatus |
| 2-S3 | `revenue.daily-autopilot` — AI → Postiz 예약 + 실패 fallback |
| 2-S4 | Floxync ↔ Postiz OAuth 프록시 (`/api/integrations/postiz/*`) |
| 2-S5 | `platform_config.postiz_api_url` · API 키 (n8n_master_url **삭제**) |
| 2-S6 | Meta 앱 심사·토큰 — **플랫폼 단위** |
| 2-S7 | `/dashboard/admin/marketing` → **연동 센터** (Postiz·Trigger·알림톡) |
| 2-S8 | `publish/route.ts`, `autonomous-orchestrator.ts` n8n 호출 **제거** |
| 2-S9 | `revenue.postiz-fallback` 태스크 |

#### 일반 사용자 할 일

| # | 작업 |
|---|------|
| 2-U1 | 「인스타그램 연결」 1회 (Facebook 로그인) |
| 2-U2 | SNS Auto-Pilot ON/OFF |
| 2-U3 | (선택) 게시 30분 전 승인 모드 |
| 2-U4 | 「네이버용 글」 알림 → 복사·게시 |
| 2-U5 | 주 1회 SNS 예상 vs 실제 유입 주문 |

**Phase 2 성공 기준:** 주 3회+ 자동 게시 매장 30%+ / n8n 코드·env **완전 제거**

**의도적 제외:** TikTok, YouTube, 7채널 동시, 네이버 자동 포스팅

---

### Phase 3 — 재고·마진 (6주)

| 수퍼 | 3-S1~S3 | `revenue.flash-inventory` + 플래시 Attribution + 할인 상한 |
| 일반 | 3-U1~U3 | 재고 Auto-Pilot, 플래시 승인, 폐기비 리포트 |

**성공 기준:** 플래시 매장 평균 폐기비 -20%

---

### Phase 4 — 성장 (ongoing)

| 수퍼 | 정기구독(토스), AI A/B, HQ 리포트, locale Harness |
| 일반 | 정기구독 유도, 네이버 플레이스 안내, (HQ) 지점 비교 |

---

## 9. UI 재정의: 「매출 캘린더」

### 일반 사용자 메인

```
┌─ 이번 주 Floxync가 벌어줄 돈 ─────────────────┐
│  기념일 3건 (예상 ₩180,000)   [자동 ON]        │
│  재구매 2건 (예상 ₩110,000)   [초안 보기]      │
│  인스타 2건 (Postiz 예약)     [연결됨 ✓]       │
│  네이버 1건 (원고 준비)       [복사하기]       │
│  ───────────────────────────────────────────  │
│  합계 예상: ₩340,000   실제: ₩120,000 ✓       │
└───────────────────────────────────────────────┘
```

**탭:** 매출 캘린더 · 고객 재구매 · SNS 홍보 · 성과 리포트

### 수퍼관리자 — 연동 센터

| 패널 | 내용 |
|------|------|
| Trigger.dev | 프로젝트 ID, 마지막 run, 실패 알림 |
| Postiz VPS | URL, 헬스체크, API 키 로테이션 |
| 알림톡/SMS | 발신 프로필, fallback |
| 네이버 Open API | Client ID (검색·트렌드) |
| Harness | 프롬프트·쿠폰 상한 |

---

## 10. 구독 플랜 ↔ 매출 정렬

| Floxync 플랜 | 일반 사용자 | Floxync 수익 |
|-------------|------------|-------------|
| **Free** | AI 초안 + 기념일 알림 월 5건 + 복사 | 전환 유도 |
| **Standard** | 기념일 무제한 + 구매 후 시퀀스 + 매출 리포트 | 월 구독 |
| **Pro** | + 인스타 Postiz 자동 + Attribution 상세 | 월 구독 ↑ |
| **Premium** | + 플래시 + 정기구독 + 네이버 SEO 패키지 | 월 구독 ↑↑ |

---

## 11. Fallback·Compliance·파일럿

### 11-1. 실패 degrade (필수)

```
Postiz API 실패
  → Trigger.dev revenue.postiz-fallback
  → 알림톡 「자동 게시 실패 — [인스타용 복사]」
  → marketing_campaigns.status = 'degraded'

알림톡 실패 → SMS fallback (platform_config)
```

### 11-2. 마케팅 수신 동의

- `customers.marketing_consent` opt-in
- Trigger.dev 배치: `marketing_consent = true` 만 발송

### 11-3. 파일럿 (Phase 1 종료)

- 3~5 실매장 × 4주
- 주간: 예상 vs 실제 + Trigger.dev run 로그 + Postiz 게시 성공률
- `docs/revenue_engine_pilot_report_YYYYMMDD.md`

---

## 12. 기술 부채 — n8n → Trigger.dev + Postiz

| 항목 | 현재 | Phase 2 완료 시 |
|------|------|-----------------|
| `N8N_MASTER_URL` | env | **삭제** |
| `publish/route.ts` | n8n webhook | Postiz client 또는 Trigger trigger |
| `autonomous-orchestrator.ts` | n8n dispatch | **삭제** → `revenue.daily-autopilot` |
| `/admin/marketing` n8n UI | webhook URL 입력 | **연동 센터**로 교체 |
| Meta 키 하드코딩 문서 | `meta_automation_progress.md` | 시크릿 로테이션 후 키 삭제 |

---

## 13. 당장 멈출 것 / 시작할 것

### 멈춤 (Pause)

- n8n 워크플로 v13~v19 추가 개발
- Ayrshare 계약 (Postiz 셀프호스트 우선)
- 7채널 동시 연동
- 테넌트별 API 키·웹훅 URL UX
- 네이버 블로그 Puppeteer 자동 포스팅

### 시작 (Next 6 Weeks)

| 주 | 수퍼관리자 | 일반 사용자-facing |
|----|-----------|-------------------|
| W1-2 | Attribution SQL·API + **Trigger.dev init** + anniversary 스켈레톤 | 온보딩 체크리스트 |
| W3-4 | anniversary-d7 완성 + 알림톡 + order-delivered | 기념일 UI·Auto-Pilot |
| W5-6 | AI 캡션 + NaverService drafts | 매출 캘린더 1탭·복사 UX·파일럿 |

| 주 | 수퍼 (Phase 2 preview) |
|----|------------------------|
| W7-8 | Postiz VPS 스테이징 + postiz-client + OAuth 프록시 |

---

## 14. 역할별 체크리스트

### 수퍼관리자

- [ ] Attribution DB·API·슈퍼 위젯
- [ ] **Trigger.dev** 태스크 (anniversary, order-delivered, daily-autopilot)
- [ ] 알림톡/SMS + Fallback
- [ ] **Postiz VPS** + Floxync OAuth 프록시
- [ ] **NaverService** drafts API + 알림
- [ ] n8n **완전 제거**
- [ ] 연동 센터 UI
- [ ] 파일럿·ROI 리포트

### 일반 사용자

- [ ] 고객·기념일·마케팅 동의
- [ ] Auto-Pilot ON (기념일 / 구매후 / SNS)
- [ ] 주간 매출 캘린더
- [ ] (Phase 2) 인스타 1회 연결
- [ ] 네이버·인스타 「복사해서 게시」
- [ ] 성과 리포트 — 「Floxync가 번 돈」

---

## 15. 관련 문서·코드

| 구분 | 경로 |
|------|------|
| 사업계획 | `docs/business_plan_competitive_analysis.md` |
| 마케팅 UI (테넌트) | `src/app/dashboard/marketing/page.tsx` |
| 연동 센터 (슈퍼) | `src/app/dashboard/admin/marketing/page.tsx` |
| Publish API (n8n → 제거 예정) | `src/app/api/ai/marketing/publish/route.ts` |
| Orchestrator (n8n → 제거 예정) | `src/lib/ai/autonomous-orchestrator.ts` |
| **네이버 직연** | `src/services/marketing/naver-service.ts` |
| Trigger.dev (예정) | `trigger/`, `trigger.config.ts` |
| Postiz client (예정) | `trigger/lib/postiz-client.ts` |
| Revenue 스키마 (예정) | `supabase/revenue_engine_schema.sql` |

---

## 16. 변경 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| v1.0 | 2026-05-19 | 초안: 북극성·Phase 0~4·수퍼/일반 역할 분리 |
| v2.0 | 2026-05-19 | **전면 개편:** Trigger.dev + Postiz 셀프호스트 + Naver Floxync 직연 확정. Inngest/n8n/Ayrshare 옵션 정리. 인프라 토폴로지·태스크·env·Phase별 작업 구체화 |
| v2.1 | 2026-05-19 | [revenue_engine_task_list.md](./revenue_engine_task_list.md) 추가 · Phase 0 코드 착수 |

---

**다음 액션:** [revenue_engine_task_list.md](./revenue_engine_task_list.md) Phase 0 — Supabase SQL 적용 + Trigger.dev 프로젝트 연결 + `npm run trigger:dev`

---

## 17. 실행 태스크리스트

상세 ID·체크박스·주차별 진행은 **[revenue_engine_task_list.md](./revenue_engine_task_list.md)** 를 단일 소스로 따른다.
