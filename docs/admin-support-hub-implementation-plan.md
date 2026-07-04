# 관리자 지원 허브 · 고객센터 확장 구현 계획서

> 작성일: 2026-07-04  
> 범위: 제안 1~6, 셀프진단(제안5), 국가별 API 검토, 관리자 업무 효율화

---

## 1. 배경 및 목표

고객센터(1:1 문의)를 단순 Q&A가 아니라 **관리자가 한 화면에서 매장 상태를 파악하고 즉시 조치**할 수 있는 **지원 허브**로 확장합니다.

| 목표 | 설명 |
|------|------|
| 사장님 | 문의 전 30초 셀프점검, 카테고리별 안내·서식 |
| 관리자 | 건강상태·타임라인·빠른 작업·답변 템플릿을 한 패널에 |
| 운영 | 반복 문의 → FAQ 초안 자동 등록, 감사 로그 |

---

## 2. 국가별 API — 마케팅 제거 후 필요 여부

### 결론

**마케팅(Postiz 등) 제거와 무관하게, 한국 배송·메신저·쇼핑몰 연동용 국가별 API 설정은 아직 필요합니다.**

| 구분 | 경로 | 용도 |
|------|------|------|
| 관리자 | `/dashboard/admin/regional-keys` | 카카오T, 알림톡, 네이버 커머스 등 플랫폼 키 |
| 가이드 | `/dashboard/admin/regional-keys/guide` | 발급 방법 |
| 매장 설정 | `RegionalIntegrationPanel.tsx` | `regional-integrations.ts` 기반 연동 UI |
| 수요 분석 | `/dashboard/admin/regional-demand` | 지역별 수요 (별도) |

마케팅 SNS 연동이 빠졌어도 **배달·알림·이커머스**는 Floxync 핵심 기능이므로 삭제하지 않습니다.

### 선택적 정리 (향후)

- 한국(KR)만 운영한다면 사이드바에서 **「국가별 API 키」를 KR 전용 하위 메뉴로 축소**하거나 설정 화면에 통합 가능
- 해외 확장 시 `regional-integrations.ts` 그대로 활용

---

## 3. 제안 1~6 구현 현황

### 제안 1 — 문의 카테고리 세분화

| 카테고리 ID | 라벨 | 확인코드 | 상태 |
|-------------|------|----------|------|
| `remote-settings` | 환경설정 대리 | ✅ 동의+4~6자리 | ✅ |
| `login-help` | 로그인·비밀번호 | ✅ 동의+4~6자리 | ✅ |
| `subscription-help` | 구독·결제 | ❌ (첨부 권장) | ✅ |
| 기존 카테고리 | 버그/기능 등 | ❌ | ✅ |

- 서식: `src/lib/support-tickets/category-templates.ts`
- API: `POST /api/support/tickets` — 카테고리별 본문 빌드·해시 저장

### 제안 2 — 관리자 지원 허브 패널

**위치:** `/dashboard/admin/support/[id]` 상단 `AdminSupportHub`

| 기능 | API | 상태 |
|------|-----|------|
| 매장 건강상태 (플랜·구독·작성자) | `GET .../hub` | ✅ |
| 지원 타임라인 (감사 로그) | `GET .../hub` | ✅ |
| 환경설정 열기 | `POST .../open-settings` | ✅ |
| 비밀번호 초기화 | `POST .../reset-password` | ✅ |
| 구독 +7일 연장 | `POST .../extend-subscription` | ✅ |
| 매직 로그인 링크 | `POST .../magic-link` | ✅ |
| 매장 대시보드 열기 | `POST .../open-dashboard` | ✅ |
| FAQ 초안 등록 (비활성) | `POST .../create-faq` | ✅ |
| 답변 템플릿 5종 | `reply-templates.ts` | ✅ |

### 제안 3 — 답변 템플릿

`src/lib/support-tickets/reply-templates.ts` — 허브에서 클릭 시 답변 작성란에 삽입.

### 제안 4 — work-context 원격 지원

- 환경설정: `remote-settings-assist-banner.tsx` + `?supportTicket=id`
- 대시보드: `open-dashboard` → `/dashboard?supportTicket=id`
- 세션은 `work-context` API로 매장 컨텍스트 전환

### 제안 5 — 셀프진단 (문의 게시판 내)

**위치:** `/dashboard/support` 상단 `SupportSelfCheckPanel`

- API: `GET /api/support/self-check`
- 로직: `src/lib/support-tickets/self-check.ts`
- 가이드 문구: `SELF_CHECK_GUIDE_MARKDOWN` (구독·브릿지·로그인 등 안내)

사장님이 문의하기 전에 **매장 연결·구독·브릿지** 상태를 30초 안에 확인합니다.

### 제안 6 — FAQ 자동 초안·반복 문의 축소

- 관리자 허브 **「FAQ 등록」** → `support_faq`에 `is_active=false` 초안 생성
- 향후: FAQ 관리 화면에서 활성화·수정 (기존 admin FAQ API 활용)

---

## 4. 아키텍처 요약

```
사장님 (/dashboard/support)
  ├─ SupportSelfCheckPanel → GET /api/support/self-check
  ├─ 문의 모달 (카테고리·동의·확인코드)
  └─ FAQ 아코디언

관리자 (/dashboard/admin/support/[id])
  ├─ AdminSupportHub → GET /api/admin/support/tickets/[id]/hub
  │     └─ 빠른 작업 POST 엔드포인트들
  ├─ 문의 본문·답변 목록
  └─ 답변 작성 (+ 템플릿 삽입)

DB
  ├─ support_tickets (+ remote_assist_code_hash, remote_assist_consent_at)
  ├─ support_ticket_replies
  ├─ support_ticket_audit (타임라인)
  └─ support_faq
```

### 필수 SQL (미적용 시)

```sql
-- supabase/support_tickets_remote_settings.sql
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS remote_assist_code_hash text,
  ADD COLUMN IF NOT EXISTS remote_assist_consent_at timestamptz;
```

기본 스키마: `supabase/support_tickets_schema.sql`

---

### P1 — 완료 (2026-07-04)

- [x] 관리자 문의 목록 건강 뱃지 (미답변·만료·정지)
- [x] 구독 연장 +7/+14/+30일 버튼

### P2 — 완료 (2026-07-04)

- [x] FAQ 초안 필터·허브 연동 (`?highlight=&filter=draft`)
- [x] 동일 매장 연관 문의 (허브 패널)

### P3 — 완료 (2026-07-04)

- [x] 원격 지원 세션 2시간 자동 만료 (`org_work_context_at` SQL)
- [x] 사이드바 「한국 연동 API」로 메뉴 단순화

### 추가 SQL (P3)

```sql
-- supabase/org_work_context_at.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_work_context_at timestamptz;
```

---

## 5. 추가 제안 (로드맵)

| 우선순위 | 제안 | 효과 |
|----------|------|------|
| P1 | **관리자 문의 목록에 건강 뱃지** (만료/정지/미답변) | 목록에서 우선순위 판단 |
| P1 | **구독 연장 +14/+30 버튼** (허브에 이미 API 있음) | UI만 추가 |
| P2 | **FAQ 관리 전용 페이지** (초안 활성화·편집) | 제안6 완결 |
| P2 | **문의 병합·연관 티켓** | 동일 매장 반복 문의 추적 |
| P2 | **Slack/이메일 실시간 알림** | `notifyAdminNewTicket` 확장 |
| P3 | **셀프진단 실패 시 카테고리 자동 추천** | UX 개선 |
| P3 | **원격 지원 세션 타임아웃·강제 종료** | 보안 |
| P3 | **국가별 API 사이드바 KR 단순화** | 관리자 메뉴 정리 |

---

## 6. 보안 체크리스트

- [x] 확인용 비밀번호는 **해시만** DB 저장 (`remote_assist_code_hash`)
- [x] 본문에 평문 비밀번호 저장 금지 (서식은 「설정한 4~6자리」 문구만)
- [x] 슈퍼관리자만 hub·빠른 작업 API 접근
- [x] work-context 전환 시 감사 로그
- [ ] 원격 세션 자동 만료 (P3)

---

## 7. 테스트 체크리스트

### 사장님

- [ ] 고객센터 셀프점검 카드 로드
- [ ] `login-help` — 동의·확인코드 없이 접수 거부
- [ ] `subscription-help` — 첨부 가능·서식 자동
- [ ] `remote-settings` — 환경설정 대리 플로우

### 관리자

- [ ] 허브 건강상태·타임라인 표시
- [ ] 확인코드 맞을 때 환경설정/비밀번호 초기화
- [ ] 구독 연장·매직링크·FAQ 등록
- [ ] 답변 템플릿 클릭 → 작성란 반영

### 빌드

```bash
npm run build
```

---

## 8. 관련 파일

| 영역 | 경로 |
|------|------|
| 계획 (고객센터 기본) | `docs/support-board-implementation-plan.md` |
| Lib | `src/lib/support-tickets/*` |
| 사용자 UI | `src/app/dashboard/support/` |
| 관리자 UI | `src/app/dashboard/admin/support/` |
| API | `src/app/api/support/`, `src/app/api/admin/support/` |
| SQL | `supabase/support_tickets_*.sql` |

---

## 9. 완료 정의 (Definition of Done)

- [x] 제안 1~6 코드·UI 반영
- [x] 셀프진단 가이드 문의 게시판 노출
- [x] 관리자 허브 통합 패널
- [ ] `npm run build` 성공
- [ ] 프로덕션 Supabase에 remote_settings SQL 적용 확인
