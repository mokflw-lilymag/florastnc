# FloXync 사장님 운영 설정 메모 (까먹지 않기용)

> **마지막 정리:** 2026-05-19  
> 배포(Vercel)·Supabase·결제·기능 오픈 전에 이 목록을 위에서부터 체크하세요.  
> 상세 가이드는 각 문서 링크를 참고하세요.

---

## 🔴 지금 당장 (배포 전 필수)

### 1. Vercel 환경 변수

| 변수명 | 용도 | 필수 |
|--------|------|:----:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | 관리자 API·Storage | ✅ |
| `TOSS_SECRET_KEY` | **한국** 구독 결제 승인 | ✅ (KR 고객) |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | **한국** 구독 결제 창 | ✅ (KR 고객) |
| `STRIPE_SECRET_KEY` | **해외** 구독 카드 결제 | ✅ (KR 외 매장) |
| `GEMINI_API_KEY` | AI 기능 | ✅ |
| `NEXT_PUBLIC_APP_URL` | 앱 URL | 권장 |

- 토스: [토스페이먼츠](https://www.tosspayments.com) → 개발자센터 → 시크릿/클라이언트 키  
- Stripe: [Stripe Dashboard](https://dashboard.stripe.com/) → Developers → API keys  
  - 테스트: `sk_test_...`  
  - 라이브: `sk_live_...`  
  - 테스트 카드: `4242 4242 4242 4242`  
- 상세: `docs/stripe_subscription_setup.md`

**구독 결제 분기 (자동)**

| 매장 운영 국가 | 결제 |
|----------------|------|
| `KR` (설정 → 운영 국가) | 토스페이먼츠 · 원화 ₩ |
| `KR` 아님 (VN, US 등) | Stripe · USD |

---

### 2. Supabase SQL (디자인 템플릿 보관함)

아직 안 했다면 **SQL Editor**에서 **순서대로** 실행:

| 순서 | 파일 | 하는 일 |
|:----:|------|---------|
| 1 | `supabase/design_studio_gallery_templates.sql` | 테마·에셋 테이블 + 시드 |
| 2 | `supabase/design_studio_gallery_add_upload.sql` | `thumb_url` 컬럼 + Storage 버킷 `design_gallery` |

실행 후: 관리자 → **디자인 템플릿 보관함** → 파일 업로드·드래그앤드롭 동작 확인.

- 업로드 가이드: `supabase/README_design_gallery_upload.md`

---

### 3. Git / 배포

- [ ] 로컬 변경사항 커밋·푸시 (Stripe·랜딩 문서·갤러리 등)
- [ ] Vercel 배포 완료 확인
- [ ] 배포 URL에서 로그인 → 구독 페이지 스모크 테스트

---

## 🟡 기능별 — 열어둘 때 / 안 열어둘 때

### 협력사 수발주 (아직 비공개 권장)

- [ ] **메뉴 숨김 + 기능 플래그** — 코드 미적용 시 Pro 매장에 메뉴 그대로 노출됨  
- [ ] 런칭 전: `docs/roadmap-partner-orders-global.md` 로드맵 참고  
- [ ] 발주↔수주 **결제는 앱 밖** (계좌이체 / Wise / PayPal 링크 등) — FloXync는 기록만

### 디자인 템플릿 보관함

- [ ] SQL 2개 적용 (위 표)  
- [ ] 슈퍼관리자만 업로드 가능 (현재 구조)  
- [ ] 인쇄용: 긴 변 2400px / 목록 썸네일 600px 자동 압축

---

## 🟢 이미 해둔 것 (참고)

| 항목 | 상태 |
|------|------|
| 랜딩 「문서」→ `/docs/manual` | ✅ 코드 반영됨 |
| 구독: KR=토스 / 해외=Stripe | ✅ 코드 반영됨 (Stripe 키만 넣으면 됨) |
| 테마 추가 UX (slug 자동·유효성) | ✅ |
| 구독 만료일 수동 관리 (슈퍼관리자) | ✅ |

---

## 📋 일상 운영 체크

### 신규 해외 매장 온보딩

1. 매장 **설정 → 운영 국가** 올바른지 (KR이면 토스, 아니면 Stripe)
2. Stripe 라이브 키 있는지 Vercel 확인
3. 구독 페이지에서 USD·Stripe 창 뜨는지 테스트

### 신규 한국 매장

1. 운영 국가 `KR`
2. 토스 키 (매장 자체 PG는 **설정 > 토스** — 구독용 토스와 별개 개념)
3. 구독: 본사 토스 키로 결제창

### 디자인 갤러리 이미지 추가

1. 테마 선택 (표시 이름 먼저 → slug `flower` 등 영문)
2. **파일 드래그앤드롭** 또는 「외부 URL」 접어서 추가
3. 권장 제작 크기: 긴 변 **1800~2400px**, JPEG/PNG

---

## 💰 돈·결제 정리 (헷갈릴 때)

| 구분 | 누가 받나 | FloXync 역할 |
|------|-----------|--------------|
| **SaaS 구독료** | FloXync 본사 | 토스(KR) / Stripe(해외) |
| **협력사 수발주 대금** | 발주 꽃집 → 수주 꽃집 **직접** | 주문·상태 기록만 (나중에 오픈) |
| **매장 PG (토스 등)** | 각 매장 | 설정에 키 입력 — 본사 구독과 별도 |

**해외 SaaS:** 나라마다 FloXync **현지 법인 필수 아님** (Stripe로 청구 가능).  
**해외 수발주:** 매장끼리 Wise·PayPal·계좌 — FloXync는 링크·입금확인만 (예정).

---

## 📁 관련 문서 위치

| 문서 | 경로 |
|------|------|
| Stripe 구독 설정 | `docs/stripe_subscription_setup.md` |
| 갤러리 업로드 | `supabase/README_design_gallery_upload.md` |
| 수발주 글로벌 로드맵 | `docs/roadmap-partner-orders-global.md` |
| HQ API·토스 연동 | `docs/hq_api_setup_manual.md` |
| 마스터 사업 계획 | `docs/implementation_plan.md` |

---

## 🔧 로컬 개발 (.env.local)

로컬에서 해외 구독 테스트:

```env
STRIPE_SECRET_KEY=sk_test_...
```

매장 `system_settings` 의 `country` 를 `VN` 등으로 바꾼 뒤 `/dashboard/subscription` 접속.

---

## ☐ 나중에 할 일 (급하지 않음)

- [ ] 슈퍼관리자 **환경설정**에서 「협력사 수발주」전역 ON/OFF
- [ ] 테넌트별 **수발주 베타** 체크박스
- [ ] Stripe **Webhook** (`checkout.session.completed`) — 브라우저 이탈 대비
- [ ] 협력사 수발주: 수주사 **PayPal / Wise / 계좌** 프로필 필드
- [ ] `supabase/.temp/` git 추적 해제 (임시 파일 정리)

---

## 📞 문제 생기면

| 증상 | 확인 |
|------|------|
| 디자인 갤러리 500 / 빈 목록 | SQL 2개 적용 여부, `design_gallery` 버킷 |
| 해외 구독 안 됨 | `STRIPE_SECRET_KEY`, 운영 국가 KR 아닌지 |
| 한국 구독 안 됨 | `TOSS_SECRET_KEY`, 운영 국가 KR |
| Stripe 창 안 뜸 | 브라우저 F12 → Network → `/api/payments/stripe/checkout` |

---

**이 파일을 북마크해 두시고, 배포·설정할 때마다 🔴 섹션부터 체크하세요.**
