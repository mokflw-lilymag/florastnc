# Floxync 매출 엔진 — 실행 태스크리스트

> **기준 문서:** [revenue_engine_master_plan.md](./revenue_engine_master_plan.md) v2.0  
> **갱신:** 2026-05-19  
> **상태 범례:** `[ ]` 대기 · `[~]` 진행중 · `[x]` 완료 · `[-]` 보류/스킵

---

## 진행 요약

| Phase | 목표 | 진행 |
|-------|------|------|
| **0** | Attribution + Trigger.dev 골격 | **완료** |
| **1** | 알림톡·기념일·복사 | **완료** (파일럿 운영만 남음) |
| **2** | Postiz VPS + n8n 제거 | **코드 완료** (VPS 배포 운영 TODO) |
| **3** | 재고 플래시 | **코드 완료** |
| **4** | 정기구독·HQ | 대기 |

**현재 스프린트 (W1-2):** Phase 0 전 항목

---

## Phase 0 — 기반 (4주) 「돈을 재는 눈 + Trigger.dev 골격」

**성공 기준:** `campaign_id`로 주문 매칭 가능 + Trigger.dev dev에서 cron 1회 실행 확인

### 수퍼관리자

| ID | 작업 | 산출물 | 상태 |
|----|------|--------|------|
| P0-S1 | `marketing_campaigns` · `marketing_attributions` · … 스키마 | `supabase/revenue_engine_schema.sql` | [x] |
| P0-S2 | Attribution API (목록·생성·주문 매칭) | `src/app/api/revenue/attributions/` · `src/lib/revenue/` | [x] |
| P0-S3 | 슈퍼 Revenue Overview | `/dashboard/admin/revenue` · `/api/admin/revenue/overview` | [x] |
| P0-S4 | Trigger.dev SDK + `trigger.config.ts` + npm scripts | `trigger.config.ts` · `package.json` | [x] |
| P0-S5 | `revenue.anniversary-d7` 스켈레톤 | `trigger/anniversary-d7.ts` | [x] |
| P0-S6 | n8n 신규 개발 중단 | master plan v2.0 | [x] |
| P0-S7 | `platform_config.revenue_integrations` + 연동 센터 탭 | `RevenueIntegrationsPanel` · marketing/admin | [x] |

### 일반 사용자

| ID | 작업 | 산출물 | 상태 |
|----|------|--------|------|
| P0-U1 | (인프라 단계 — UI 변경 없음) | — | [-] |
| P0-U2 | 매출 온보딩: 「고객 10명」「기념일 1건」 | `RevenueOnboardingChecklist` · 대시보드 | [x] |

### Phase 0 완료 체크

- [ ] Supabase SQL Editor에 `revenue_engine_schema.sql` 적용
- [ ] Trigger.dev 프로젝트 연결 (이미 `trigger.config.ts` 있으면):  
  `npx trigger.dev@latest init --yes --project-ref proj_XXXX --no-browser`
- [ ] `TRIGGER_PROJECT_REF` · `TRIGGER_SECRET_KEY` · `SUPABASE_SERVICE_ROLE_KEY` env 설정
- [ ] `npm run trigger:dev` 로 `revenue.anniversary-d7` 수동 1회 실행 확인
- [ ] 슈퍼 `/dashboard/admin/revenue` 에서 집계 API 200 확인

---

## Phase 1 — Quick Wins (6주) 「API 없이 돈 벌기」

**성공 기준:** 활성 매장 50% — 4주 내 Floxync 귀속 주문 1건+ / 「매출 도움」 60%+

### 1-A. 기념일 자동 수익

| ID | 작업 | 담당 | 상태 |
|----|------|------|------|
| P1-S1 | `revenue.anniversary-d7` 완성 (D-7 → campaign) | 수퍼 | [x] |
| P1-S2 | 알림톡/SMS (`messaging.ts` + Solapi env) | 수퍼 | [x] |
| P1-S3 | 쿠폰 상한·어뷰징 (`platform_config`) | 수퍼 | [x] |
| P1-S4 | 기념일 템플릿 Harness | 수퍼 | [x] |
| P1-U1 | 고객 UI: 기념일·마케팅 동의 | 일반 | [x] |
| P1-U2 | 「기념일 자동 수익」 Auto-Pilot ON/OFF | 일반 | [x] |
| P1-U3 | D-7 미리보기 → [발송] | 일반 | [x] |
| P1-U4 | `marketing_consent` 발송 전 검증 | 일반 | [x] |
| P1-U5 | 「이번 주 예상 매출」 카드 | 일반 | [x] |

### 1-B. 구매 후 시퀀스

| ID | 작업 | 상태 |
|----|------|------|
| P1-S5 | `revenue.order-delivered` (D+1 · D+7 · D+30 delay) | [x] |
| P1-S6 | 시퀀스 템플릿 Harness | [x] |
| P1-U6 | 구매 후 Auto-Pilot ON/OFF | [x] |
| P1-U7 | 시퀀스 문구 수정 | [x] |
| P1-U8 | 배송 완료 처리 UX | [x] |

### 1-C. AI 초안 + 복사 (SNS v0.5)

| ID | 작업 | 상태 |
|----|------|------|
| P1-S7 | `/api/marketing/suggest-from-order` | [x] |
| P1-S8 | NaverService → `marketing_drafts` API | [x] |
| P1-S9 | 7종 콘텐츠 Harness | [x] |
| P1-U9 | 작품 사진 → AI 추천 글 | [x] |
| P1-U10 | 인스타/네이버 원탭 복사 | [x] |
| P1-U11 | 게시 알림 | [x] |
| P1-U12 | 페르소나·홍보 주제 3개 | [x] |

### Phase 1 UI

| ID | 작업 | 상태 |
|----|------|------|
| P1-UI1 | 「매출 캘린더」 `/dashboard/revenue` | [x] |
| P1-UI2 | 성과 리포트 — 「Floxync가 번 돈」 | [x] |
| P1-PILOT | 3~5 매장 4주 파일럿 + 리포트 | [~] |

**사용 가이드:** [revenue_engine_user_manual.md](./revenue_engine_user_manual.md) · **파일럿:** [revenue_engine_pilot_checklist.md](./revenue_engine_pilot_checklist.md)

---

## Phase 2 — SNS v1 (8주) 「Postiz VPS + n8n 제거」

**성공 기준:** 주 3회+ 자동 게시 매장 30%+ / n8n 코드·env 완전 제거

| ID | 작업 | 상태 |
|----|------|------|
| P2-S1 | Postiz VPS Docker + HTTPS | [~] |
| P2-S2 | `trigger/lib/postiz-client.ts` | [x] |
| P2-S3 | `revenue.daily-autopilot` | [x] |
| P2-S4 | `/api/integrations/postiz/*` OAuth 프록시 | [x] |
| P2-S5 | `platform_config` — n8n_master_url 삭제 | [x] |
| P2-S6 | Meta 앱 플랫폼 단위 | [~] |
| P2-S7 | 연동 센터 완성 (Trigger · Postiz · 알림톡) | [x] |
| P2-S8 | n8n: `publish/route.ts` · `autonomous-orchestrator.ts` 제거 | [x] |
| P2-S9 | `revenue.postiz-fallback` | [x] |
| P2-U1 | 인스타 1회 연결 | [x] |
| P2-U2 | SNS Auto-Pilot ON/OFF | [x] |
| P2-U3 | 게시 30분 전 승인 모드 | [x] |
| P2-U4 | 네이버 원고 알림 → 복사 | [x] |
| P2-U5 | SNS 예상 vs 실제 주문 | [x] |

---

## Phase 3 — 재고·마진 (6주)

| ID | 작업 | 상태 |
|----|------|------|
| P3-S1 | `revenue.flash-inventory` | [x] |
| P3-S2 | 플래시 캠페인 Attribution | [x] |
| P3-S3 | 플래시 할인 상한 | [x] |
| P3-U1 | 재고 Auto-Pilot ON/OFF | [x] |
| P3-U2 | 플래시 승인 UI | [x] |
| P3-U3 | 폐기비 리포트 | [x] |

---

## Phase 4 — 성장 (ongoing)

| ID | 작업 | 상태 |
|----|------|------|
| P4-S1 | 정기구독 + 토스 | [x] |
| P4-S2 | AI A/B (Limbic Map) | [x] |
| P4-S3 | 네이버 SEO 템플릿 패키지 | [x] |
| P4-S4 | HQ 지점별 Revenue | [x] |
| P4-U1~U4 | 정기구독·HQ UX | [x] |

---

## 기술 부채 (n8n → Trigger + Postiz)

| ID | 항목 | Phase | 상태 |
|----|------|-------|------|
| TD-1 | `N8N_MASTER_URL` env 제거 | 2 | [x] |
| TD-2 | `AutonomousOrchestrator` 제거 | 2 | [x] |
| TD-3 | `/admin/marketing` n8n UI → 연동 센터 | 2 | [x] |
| TD-4 | Meta 키 문서 로테이션 | 2 | [ ] |

---

## 환경 변수 체크리스트

| 변수 | Phase | 위치 |
|------|-------|------|
| `TRIGGER_PROJECT_REF` | 0 | Vercel · Trigger.dev |
| `TRIGGER_SECRET_KEY` | 0 | Vercel · Trigger.dev |
| `SUPABASE_SERVICE_ROLE_KEY` | 0 | Trigger.dev (배치) |
| `KAKAO_ALIMTALK_*` | 1 | Trigger.dev |
| `POSTIZ_API_URL` · `POSTIZ_API_KEY` | 2 | Trigger.dev · platform_config |
| `NAVER_CLIENT_ID` · `SECRET` | 1 | Vercel (기존) |

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-05-19 | v1.3 — Phase 2·3 코드 완료 (Postiz VPS·Meta 심사는 운영 TODO) |
| 2026-05-19 | v1.1 — Phase 0 코드 구현 완료 (SQL·Trigger 대시보드 연결은 운영 TODO) |
