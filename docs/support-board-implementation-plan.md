# Floxync 고객센터(1:1 문의 게시판) 구현 계획서

> 작성일: 2026-07-04  
> 상태: **승인 대기** (구현 전 사장님 확인용)  
> 범위: 사용자 문의 게시판 · FAQ 노출 · 관리자 답변·삭제 · 알림 · 이미지 첨부 · 다국어 답변

---

## 1. 배경 및 목적

### 1.1 현재 상태

| 기능 | 상태 |
|------|------|
| 사용자 → 관리자 문의 게시판 | ❌ 없음 (`mailto:admin@floxync.com` 만 존재) |
| FAQ (`support_faq`) | ⚠️ 관리자 CRUD만 (`/dashboard/admin/faq`), 사용자 화면 없음 |
| AI 지원 (`/api/ai/support`) | 챗봇만, 티켓·답변 추적 없음 |
| 글로벌 공지 | 본사→사용자 일방향 (문의와 별개) |
| 알림 종 | 공지용 — 문의 미연동 |
| 이메일 발송 | ✅ 재사용 가능 |

### 1.2 목적

- 사장님이 **앱 안에서** 본사에 문의하고 답변을 확인할 수 있게 한다.
- 문의 전 **FAQ**로 자가 해결을 유도한다.
- 관리자는 **알림·전용 화면**으로 신규 문의를 즉시 인지하고 답변·**삭제**할 수 있다.
- 본문·답변은 **비밀**, 제목만 공개하여 커뮤니티 참고는 가능하되 프라이버시를 지킨다.

### 1.3 참고한 업계 패턴

- FAQ 먼저 → 안 되면 비밀 티켓 (Zendesk, Intercom, Freshdesk, Help Scout 공통)
- 인앱 지원 + 이메일 알림 병행
- B2B SaaS: 테넌트·작성자 단위 RLS, 감사 로그

---

## 2. 핵심 요구사항 (확정)

### 2.1 노출 정책

> **작성자도 답변 여부 배지를 봅니다.** 목록의 **모든 글**(본인·타인)에 `접수중` / `답변완료` 배지가 붙습니다.  
> 작성자는 타인과 동일하게 목록에서 배지를 보고, **본인 글 상세**에서는 본문·답변 전문까지 추가로 열람합니다.

| 대상 | 목록(제목) | 글 내용 | 답변 내용 | 답변 여부 배지 |
|------|------------|---------|-----------|----------------|
| **모든 로그인 사용자** (작성자 포함) | ✅ 전체 제목 공개 | ❌ 본인 글만 | ❌ 본인 글의 답변만 | ✅ **전체 목록**에 `접수중` / `답변완료` |
| **작성자 (본인 글 상세)** | — | ✅ 본인 글 | ✅ 본인 글에 달린 답변 | ✅ (목록과 동일) |
| **슈퍼관리자** | ✅ 제목 + 매장명 | ✅ 전체 | ✅ 전체 | ✅ + 미답변 강조 |

**배지 규칙 (UI)**

| `status` | 배지 | 색상 예 |
|----------|------|---------|
| `open` (답변 없음) | **접수중** | 회색/amber |
| `answered` | **답변완료** | 초록 |
| `closed` (v1.1) | **종료** | slate |

목록 예시 (작성자·다른 사용자 모두 동일하게 제목+배지만):

```
🔒 ppBridge 연결 오류          [접수중]
🔒 영수증 언어 설정 문의        [답변완료]   ← 내 글이면 클릭 시 본문·답변 열람
🔒 구독 결제 오류              [접수중]     ← 남의 글이면 클릭 시 비밀글 안내
```

- 다른 사용자가 타인 글 클릭 시: **「비밀글입니다. 작성자와 관리자만 열람할 수 있습니다.」**
- 목록 API는 **제목·카테고리·상태·답변여부·작성일·문의번호**만 반환 (본문·이미지 URL 제외)

### 2.2 비밀글 기본값

- `is_private = true` 고정 (MVP에서는 변경 불가)
- UI에 🔒 아이콘 표시 (시각적 안내)

### 2.3 번역 (답변)

**하이브리드 방식 (권장)**

1. 관리자는 **한국어 또는 영어**로 답변 1건 작성 (원문)
2. 저장 시 **작성자 `uiLocale`** 기준으로 서버에서 자동 번역 생성
3. 사용자 화면 표시 순서:
   - **상단**: 사용자 언어 번역문
   - **하단**: 원문 (한국어/영어) — 구분선 + 「원문」 라벨
4. 관리자가 번역문을 수동 수정할 수 있는 필드 (선택, v1.1)

- 번역 엔진: 기존 **Gemini** (`/api/ai/support`와 동일 인프라) 또는 전용 `translate` API
- 원문·번역문 모두 DB 저장 (`body_original`, `body_translated`, `locale`)

### 2.4 이미지 첨부

| 항목 | 값 |
|------|-----|
| 최대 해상도 | **1200px** (긴 변, 비율 유지) |
| 포맷 | **WebP** 우선, 미지원 시 JPEG |
| 품질 | **0.65 ~ 0.75** |
| 파일당 목표 | **≤ 400KB** (초과 시 품질 낮춰 재압축) |
| 문의당 첨부 | 최대 **3장** |
| 답변당 첨부 | 최대 **3장** |
| 티켓당 총합 | **≤ 2MB** |
| 저장 위치 | Supabase Storage `support-tickets/{tenant_id}/{ticket_id}/` |
| DB | **URL·메타만** (용량 최소화) |
| 접근 | RLS + **서명 URL** (작성자·관리자만) |

- 클라이언트: `canvas` 리사이즈 + `toBlob('image/webp')` 압축 후 업로드
- 작품 사진이 아닌 스크린샷 수준이므로 **최대한 압축** 우선

### 2.5 삭제 정책 (소프트 · 영구 · 자동)

문의 데이터는 **3단계**로 관리합니다. 90일 자동 삭제만 두는 것보다, **소프트 + (필요 시) 즉시 영구 + 90일 자동 정리** 조합을 권장합니다.

#### 단계 요약

| 단계 | 누가 | 화면 | DB·Storage | 복구 |
|------|------|------|------------|------|
| **① 일반 삭제 (소프트)** | 슈퍼관리자 | 목록·사용자 화면에서 **즉시 숨김** | `deleted_at` 설정, **첨부는 유지** | ✅ 관리자 복구 가능 |
| **② 영구 삭제 (하드)** | 슈퍼관리자 | 휴지통에서만 가능 | 행 **DELETE** + Storage **물리 삭제** | ❌ 불가 |
| **③ 자동 영구 삭제** | 시스템 (cron) | — | 소프트 삭제 후 **90일** 경과분 일괄 하드 삭제 | ❌ 불가 |

#### ① 소프트 삭제 (일상용)

- 관리자 문의 상세 **「삭제」** → 확인 후 `deleted_at`, `deleted_by` 기록
- 사용자·관리자 **일반 목록**에서 제거
- 답변·첨부 메타는 DB에 남음 (실수 복구·감사용)
- **감사 로그**: `action = deleted`

#### ② 영구 삭제 (하드) — 수동

**소프트 삭제된 글만** 대상 (실수 방지).

- 경로: `/dashboard/admin/support/trash` (휴지통) 또는 상세 **「영구 삭제」**
- 확인 **2단계**:
  1. 「이 문의를 영구 삭제합니다」
  2. 제목 일부 입력 또는 `영구삭제` 타이핑
- 처리:
  - `support_tickets` / `support_ticket_replies` **물리 DELETE**
  - Storage `support-tickets/...` **파일 전부 삭제**
  - 감사 로그: `action = purged` (메타만 남김, 본문은 저장 안 함)

**언제 쓰나**

- 개인정보·카드번호가 포함된 스크린샷 즉시 제거
- 스팸·중복 문의를 복구할 필요 없을 때
- 사장님 요청으로 「완전히 지워 달라」는 경우

#### ③ 90일 자동 영구 삭제 (cron)

- 대상: `deleted_at IS NOT NULL` 이고 **90일 초과**인 티켓
- 주 1회 Trigger.dev 또는 Supabase cron 작업
- ②와 동일하게 DB + Storage 물리 삭제
- 감사 로그에 `action = auto_purged` (ticket_no, deleted_at만 기록)

> **활성 문의**(소프트 삭제 안 된 글)는 자동 삭제 **하지 않음**.  
> 90일 규칙은 **휴지통에 들어간 글**에만 적용.

#### 첨부 파일만 90일 (선택, P3)

- **삭제되지 않은** 오래된 티켓의 첨부만 별도 정리할 수 있음 (용량 절감)
- 본문 텍스트는 유지 — MVP에서는 **휴지통 90일 자동 purge만**으로 충분

#### 관리자 UI (권장)

```
문의 관리          [휴지통 (3)]
  └ 상세 [삭제]           → 소프트
휴지통
  └ [복구] [영구 삭제]    → 하드 (2단계 확인)
  └ 안내: "90일 후 자동으로 영구 삭제됩니다"
```

#### API 추가 (계획)

| Method | Path | 설명 |
|--------|------|------|
| DELETE | `/api/admin/support/tickets/[id]` | 소프트 삭제 |
| POST | `/api/admin/support/tickets/[id]/restore` | 복구 |
| DELETE | `/api/admin/support/tickets/[id]/purge` | **영구 삭제** (soft만) |
| (cron) | `purge-expired-support-tickets` | 90일 자동 purge |

### 2.6 관리자 신규 문의 인지

| 채널 | 내용 |
|------|------|
| **① 알림 종** | 빨간 배지 + 「새 문의: {제목}」 → `/dashboard/admin/support/{id}` |
| **② 문의 관리 메뉴** | 사이드바 「고객 문의」, 미답변 필터·건수 |
| **③ 이메일** | `admin@floxync.com` (또는 슈퍼관리자 목록) — 제목·매장·링크만 (본문 생략 가능) |
| **④ (선택) Electron 토스트** | Desktop 앱 사용 중일 때 우측 하단 토스트 |

- 폴링: 60초 (기존 알림 종 패턴) + v1.1에서 Realtime 검토

### 2.7 사용자 답변 수신

- 알림 종: 「문의에 답변이 등록되었습니다」
- 이메일: `storeEmail` / 프로필 이메일 — 게시판 링크 + 번역문 요약

---

## 3. FAQ (게시판 하단)

### 3.1 데이터

- 기존 테이블 `support_faq` 재사용
- 사용자 페이지: `is_active = true` 만 조회

### 3.2 카테고리 (9종)

| 순서 | 카테고리 | 아이콘 예 |
|------|----------|-----------|
| 1 | 시작하기·계정 | 🚀 |
| 2 | 주문·접수·고객 | 📋 |
| 3 | 배송·픽업 | 🚚 |
| 4 | 지출·정산·세무 | 💰 |
| 5 | 인쇄·ppBridge·영수증 | 🖨️ |
| 6 | 리본·라벨 프린트 | 🎀 |
| 7 | 구독·결제·요금제 | 💳 |
| 8 | 다매장·본사·수발주 | 🏪 |
| 9 | 연동·알림·메신저 | 🔗 |

- 관리자 FAQ 화면 카테고리 드롭다운을 위 목록으로 통일
- 초기 시드 SQL 또는 관리자 시드 스크립트로 대표 Q&A 2~3개/카테고리

### 3.3 UX

- 문의 작성 모달 **위** 또는 **옆**에 「비슷한 FAQ」3건 추천 (같은 카테고리)
- FAQ: 카테고리 탭 + 아코디언 + 검색

### 3.4 관리자 FAQ 등록 방법 (현재 · 구현 후)

#### 지금 (이미 있음)

슈퍼관리자(관리자 모드) 사이드바:

**본사 · 가맹 운영 → FAQ · AI 지식** (`/dashboard/admin/faq`)

| 단계 | 작업 |
|------|------|
| 1 | 우측 상단 **「FAQ 추가」** 버튼 클릭 |
| 2 | **카테고리** 입력 또는 기존 카테고리 선택 |
| 3 | **카테고리 아이콘** (예: 🖨️), **카테고리 순서**, **질문 순서** |
| 4 | **질문**, **답변** 작성 |
| 5 | **노출(활성)** 켜기 — `is_active = true` 여야 사용자에게 보임 |
| 6 | (선택) **추천 FAQ** — `is_featured` 상단 고정 |
| 7 | 저장 |

수정·삭제: 목록 행 오른쪽 **연필 / 휴지통** 아이콘.

> ⚠️ **현재** FAQ는 DB에만 저장되고, **사용자 화면에는 아직 안 나옵니다.**  
> 고객센터(`/dashboard/support`) 구현 후, 같은 `support_faq` 데이터가 게시판 **아래 FAQ 탭**에 자동 노출됩니다.

#### 구현 후 (고객센터 오픈 시)

- FAQ 추가 경로는 **동일** (`/dashboard/admin/faq`)
- 계획서 9종 카테고리로 드롭다운 정리 (직접 타이핑 대신 선택)
- 고객센터 하단 + 문의 작성 시 「비슷한 FAQ」에 즉시 반영
- (선택) 고객 문의 관리 화면에서 「이 문의를 FAQ로 등록」버튼 → FAQ 추가 모달에 질문·답변 프리필

#### FAQ 카테고리 입력 예 (9종)

```
시작하기·계정 | 주문·접수·고객 | 배송·픽업 | 지출·정산·세무
인쇄·ppBridge·영수증 | 리본·라벨 프린트 | 구독·결제·요금제
다매장·본사·수발주 | 연동·알림·메신저
```

---

## 4. 데이터베이스 설계

### 4.1 `support_tickets`

```sql
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no TEXT NOT NULL UNIQUE,          -- SR-20260704-0001
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  author_user_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,                     -- 목록 공개
  body TEXT NOT NULL,                      -- 비밀 본문
  body_locale TEXT DEFAULT 'ko',
  status TEXT NOT NULL DEFAULT 'open',     -- open | answered | closed
  is_private BOOLEAN NOT NULL DEFAULT true,
  has_admin_reply BOOLEAN NOT NULL DEFAULT false,
  attachment_paths JSONB DEFAULT '[]',   -- [{path, size, mime, width, height}]
  admin_read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,                  -- 소프트 삭제
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_reply_at TIMESTAMPTZ
);
```

인덱스: `tenant_id`, `author_user_id`, `status`, `created_at DESC`, `deleted_at IS NULL`

### 4.2 `support_ticket_replies`

```sql
CREATE TABLE public.support_ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id),
  author_role TEXT NOT NULL,               -- user | admin
  body_original TEXT NOT NULL,
  body_translated TEXT,
  original_locale TEXT,
  target_locale TEXT,
  attachment_paths JSONB DEFAULT '[]',
  is_internal_note BOOLEAN DEFAULT false,  -- v1.1 관리자 내부 메모
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.3 `support_ticket_reads` (선택)

- 관리자가 목록에서 읽음 처리용 (`admin_read_at` 대체 가능)

### 4.4 `support_ticket_audit` (삭제·복구 로그)

```sql
CREATE TABLE public.support_ticket_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  action TEXT NOT NULL,  -- created | replied | deleted | restored
  actor_user_id UUID,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.5 RLS 정책 요약

| 역할 | tickets SELECT | tickets INSERT | tickets DELETE |
|------|----------------|----------------|----------------|
| 인증 사용자 | 제목 필드만 타인 글 + 본인 글 전체 | 본인 tenant | ❌ |
| 작성자 | 본인 글 body | — | ❌ |
| 슈퍼관리자 | 전체 | — | ✅ (소프트 삭제) |

- **API Route에서 service role + 앱 레벨 권한 검증** 병행 (기존 `platform_announcements` 패턴)
- 목록·상세는 **전용 API**로 필드 마스킹 (RLS만으로는 제목 공개/본문 비공개 분리가 까다로움)

### 4.6 Storage 버킷

- `support-tickets` (private)
- 정책: 업로드 — 작성자·관리자 / 다운로드 — 서명 URL

---

## 5. API 설계

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/support/tickets` | 목록 (마스킹된 필드) |
| POST | `/api/support/tickets` | 문의 생성 + 첨부 업로드 URL 발급 |
| GET | `/api/support/tickets/[id]` | 상세 (권한 검사) |
| POST | `/api/support/tickets/[id]/replies` | 사용자 추가 댓글 (선택 v1.1) |
| GET | `/api/support/faq` | FAQ 목록 (공개) |
| GET | `/api/admin/support/tickets` | 관리자 전체 목록 |
| GET | `/api/admin/support/tickets/[id]` | 관리자 상세 |
| POST | `/api/admin/support/tickets/[id]/reply` | 관리자 답변 + 번역 + 알림·이메일 |
| DELETE | `/api/admin/support/tickets/[id]` | 소프트 삭제 |
| POST | `/api/admin/support/tickets/[id]/restore` | 휴지통에서 복구 |
| DELETE | `/api/admin/support/tickets/[id]/purge` | **영구 삭제** (소프트된 글만) |
| GET | `/api/support/inbox` | 알림 종용 (미읽음 문의·답변) |

---

## 6. 화면 설계

### 6.1 사용자 `/dashboard/support`

```
┌─────────────────────────────────────────┐
│ 고객센터                    [문의하기]   │
├─────────────────────────────────────────┤
│ 🔍 검색  │ 카테고리 필터 │ 내 문의만    │
├─────────────────────────────────────────┤
│ SR-... │ 🖨️ 인쇄 │ 🔒 제목... │ 답변완료 │
│ SR-... │ 💳 구독 │ 🔒 제목... │ 접수중   │
├─────────────────────────────────────────┤
│ 📚 자주 묻는 질문                        │
│ [시작하기] [주문] [인쇄] ... (탭)        │
│ ▼ Q: ppBridge가 안 돼요                  │
│   A: ...                                 │
└─────────────────────────────────────────┘
```

- **문의하기** 모달: 카테고리, 제목, 내용, 이미지(최대 3), FAQ 추천
- **상세** (`/dashboard/support/[id]`): 본문·이미지·답변 스레드 (권한 없으면 차단)

### 6.2 관리자 `/dashboard/admin/support`

```
┌─────────────────────────────────────────┐
│ 고객 문의 관리          미답변 3건       │
├─────────────────────────────────────────┤
│ 필터: 상태 │ 카테고리 │ 매장명 검색       │
├─────────────────────────────────────────┤
│ 매장명 │ SR-... │ 제목 │ 카테고리 │ 상태 │
│ [상세] → 답변 작성 │ [삭제]              │
└─────────────────────────────────────────┘
```

- 상세: 매장·플랜·국가·문의 본문·이미지·답변 폼·**삭제 버튼**
- 삭제: `AlertDialog` 확인 후 소프트 삭제

### 6.3 사이드바

| 역할 | 메뉴 |
|------|------|
| 일반 사용자 | 「고객센터」 `/dashboard/support` |
| 슈퍼관리자 | 「고객 문의」 `/dashboard/admin/support` + 기존 「FAQ 관리」 |

### 6.4 알림 종 확장

- `NotificationInboxItem`에 `source: 'support_ticket' | 'support_reply'` 추가
- 관리자: `open` 신규 / 사용자: 본인 티켓 `answered`

---

## 7. 이메일 템플릿

### 7.1 관리자 — 신규 문의

- 제목: `[Floxync] 새 문의 — {매장명} — {제목}`
- 본문: 문의번호, 카테고리, 링크 (본문 전문 생략 권장)

### 7.2 사용자 — 답변 등록

- 제목: `[Floxync] 문의하신 내용에 답변이 등록되었습니다`
- 본문: 제목, 번역문 요약, 게시판 링크

---

## 8. 추가 제안 (MVP 이후)

| 우선순위 | 기능 | 설명 |
|----------|------|------|
| P1 | 문의번호 `SR-YYYYMMDD-####` | 전화·메일 시 식별 |
| P1 | FAQ 작성 전 추천 | 문의 감소 |
| P2 | 7일 후 자동 `closed` | 재오픈 버튼 |
| P2 | 답변 만족도 👍/👎 | 품질 통계 |
| P2 | 관리자 내부 메모 | 사용자 비노출 |
| P3 | 휴지통 90일 자동 영구 삭제 (cron) | Storage·DB 정리 |
| P3 | Realtime 알림 | 폴링 대체 |
| P3 | 하루 5건 스팸 제한 | 어뷰징 방지 |

---

## 9. 구현 단계 (일정안)

### Phase 1 — 기반 (3~4일)

- [ ] SQL: 테이블·인덱스·RLS·Storage 버킷
- [ ] `ticket_no` 발급 함수
- [ ] 이미지 압축 유틸 (`compressSupportImage.ts`)

### Phase 2 — 사용자 (3~4일)

- [ ] `/dashboard/support` 목록·작성·상세
- [ ] FAQ 섹션 (카테고리 탭)
- [ ] API: tickets CRUD (마스킹)

### Phase 3 — 관리자 (3~4일)

- [ ] `/dashboard/admin/support` 목록·상세·답변
- [ ] **삭제(소프트) + 감사 로그**
- [ ] 답변 시 Gemini 번역 + 원문 병기

### Phase 4 — 알림·이메일 (2~3일)

- [ ] 알림 종 inbox 확장
- [ ] 관리자·사용자 이메일
- [ ] 미답변 배지

### Phase 5 — FAQ·시드·QA (2~3일)

- [ ] FAQ 카테고리 9종 시드
- [ ] i18n 라벨 (ko/en 우선)
- [ ] 빌드·E2E 시나리오 테스트

**총 예상: 2.5 ~ 3.5주** (1인 기준)

---

## 10. 테스트 시나리오 (QA)

1. 사용자 A 문의 등록 + 이미지 3장 압축 업로드
2. 관리자 알림 종·이메일 수신
3. 사용자 B 목록에서 A 글 **제목만** 보임, 상세 진입 차단
4. 관리자 답변(한국어) → 사용자(uiLocale=en) 번역+원문 표시
5. 사용자 A 알림·이메일 수신
6. 관리자 **삭제** → 목록에서 제거, Storage 정리, 작성자 상세 404
7. 삭제된 글 감사 로그 확인

---

## 11. 보안 체크리스트

- [ ] 타인 본문·답변·이미지 URL API 우회 불가
- [ ] 관리자 삭제는 `is_super_admin` (또는 동등 권한)만
- [ ] 첨부 서명 URL 만료 (예: 1시간)
- [ ] XSS: 본문 sanitize (markdown 또는 plain text)
- [ ] Rate limit: POST tickets 10/시간/tenant

---

## 12. 승인 후 착수 순서

1. 본 계획서 승인
2. `supabase/support_tickets_schema.sql` 작성·적용
3. Phase 1 → 5 순차 구현
4. `npm run build` 통과 후 배포

---

## 부록: 문의번호 형식

```
SR-{YYYYMMDD}-{4자리 순번}
예: SR-20260704-0007
```

일별 시퀀스는 DB sequence 또는 `MAX+1` (트랜잭션 락).
