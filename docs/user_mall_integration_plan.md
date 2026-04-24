# 🛍️ 외부 쇼핑몰(카페24·네이버) 연동 — 설계 및 구현 보고서

> **최종 업데이트**: 2026-04-24  
> **상태**: 카페24 ✅ 구현 완료 / 네이버 커머스 ⏳ API 준비 완료 (테스트 대기)

---

## 1. 🗄️ 데이터베이스 — `shop_integrations` 테이블

사용자(꽃집)마다 각자의 쇼핑몰 API 키를 안전하게 보관하는 전용 테이블입니다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (PK) | 고유 식별자 |
| `shop_id` | uuid (FK → tenants) | 꽃집 식별자 (tenant_id) |
| `platform` | text | `cafe24` 또는 `naver_commerce` |
| `client_id` | text | 사용자가 입력한 Client ID |
| `client_secret` | text | 사용자가 입력한 Client Secret |
| `mall_id` | text | 카페24 쇼핑몰 ID (예: lilymagflower) |
| `access_token` | text | OAuth 인증 후 발급된 액세스 토큰 |
| `refresh_token` | text | 토큰 갱신용 리프레시 토큰 |
| `is_active` | boolean | 연동 활성화 여부 |
| `last_sync_at` | timestamptz | 마지막 동기화 시각 |
| `updated_at` | timestamptz | 설정 수정 시각 |

> **Unique Constraint**: `(shop_id, platform)` — 1개 꽃집 당 플랫폼별 1개 연동만 허용

---

## 2. 🖥️ 연동 관리 UI — MallIntegrationCard

**경로**: `대시보드 > 설정 > 쇼핑몰 연동 관리`  
**파일**: `src/app/dashboard/settings/components/MallIntegrationCard.tsx`

### 제공 기능
- **플랫폼 토글**: 카페24 / 네이버 스마트스토어 ON/OFF 스위치
- **인증 폼**: Mall ID, Client ID, Client Secret 입력 필드
- **[인증 테스트 및 저장]** 버튼: 입력값을 DB에 upsert
- **[카페24 로그인 연동]** 버튼: OAuth2 인증 팝업 → 토큰 발급
- **[주문 수동 동기화]** 버튼: 연동 완료 후 즉시 주문 가져오기 (파란색)
- **상태 표시**: 연동 전 → "카페24 로그인 연동" / 연동 후 → "재인증"

---

## 3. ⚙️ 카페24 연동 파이프라인 (✅ 구현 완료)

### 3-1. 인증 흐름 (OAuth2)

```
[사용자] → [카페24 로그인 연동] 클릭
  ↓
[카페24 OAuth 페이지] — 사용자 로그인 & 권한 동의
  ↓ (redirect_uri로 code 전달)
[/api/sync/cafe24/callback] — code + state(tenantId:mallId) 수신
  ↓
[카페24 Token API] — code → access_token + refresh_token 발급
  ↓
[shop_integrations DB] — 토큰 저장 완료
  ↓
[✅ 연동 성공! 안내 HTML 표시]
```

**주요 파일**: `src/app/api/sync/cafe24/callback/route.ts`

#### 핵심 설계 결정
1. **state 파라미터 활용**: 카페24 OAuth redirect 시 `state`에 `tenantId:mallId`를 포함시켜 콜백에서 복원
2. **Redirect URI 고정**: 카페24 정책상 IP/http 불가 → `https://floxync.com/api/sync/cafe24/callback` 고정
3. **상세 에러 진단**: 각 실패 단계별 HTML 에러 페이지로 디버깅 용이하게 설계

### 3-2. 주문 동기화 API

**엔드포인트**: `POST /api/sync/cafe24`  
**파일**: `src/app/api/sync/cafe24/route.ts`

- **조회 범위**: 최근 7일 주문
- **API 버전**: `X-Cafe24-Api-Version: 2026-03-01`
- **데이터 매핑**: 카페24 JSON → Floxync `orders` 테이블 스키마로 변환
- **중복 방지**: `order_number` 유니크 제약(23505 에러) 자동 스킵

#### 매핑 규칙

| 카페24 필드 | → Floxync 필드 | 비고 |
|---|---|---|
| `order_id` | `order_number` | `C24-` 접두어 부착 |
| `buyer_name` | `orderer.name` | |
| `buyer_cellphone` | `orderer.contact` | |
| `items[].product_name` | `items[].name` | |
| `initial_order_amount` | `summary.subtotal` | |
| `actual_order_amount` | `summary.total` | |
| `shipping_fee` | `summary.deliveryFee` | |
| `receivers[0].name` | `delivery_info.recipientName` | |
| `receivers[0].address_full` | `delivery_info.address` | |

---

## 4. ⚙️ 네이버 커머스 연동 파이프라인 (⏳ API 준비 완료)

### 4-1. 인증 방식 (HMAC 서명)

네이버 커머스 API는 OAuth가 아닌 **HMAC-SHA256 서명** 방식을 사용합니다.  
Client ID와 Secret만 저장하면 별도의 브라우저 로그인 없이 바로 API 호출이 가능합니다.

```
Signature = HMAC-SHA256(clientSecret, "{path}\n{timestamp}")
Authorization: {clientId}:{signature}
```

**파일**: `src/app/api/sync/naver/route.ts`

### 4-2. 주문 동기화 API

**엔드포인트**: `POST /api/sync/naver`

- **조회 범위**: 최근 24시간 주문 상태 변경
- **데이터 매핑**: 네이버 JSON → Floxync `orders` 테이블 스키마로 변환
- **주문번호 접두어**: `NV-`

### ⚠️ 남은 과제: 고정 IP

네이버 커머스 API는 **서버 IP 화이트리스트 등록이 필수**입니다.  
Vercel은 서버리스이므로 고정 IP가 없어, 프록시 서버가 필요합니다.

| 해결 방안 | 비용 | 상태 |
|---|---|---|
| Oracle Cloud 무료 VM 프록시 | 무료 | 🔜 예정 (다음 작업) |
| Cloudflare Workers | 무료~$5/월 | 대안 |
| QuotaGuard (Vercel 애드온) | $20/월~ | 대안 |

---

## 5. 📥 통합 동기화 시스템

### 주문 페이지 자동/수동 동기화

**파일**: `src/app/dashboard/orders/page.tsx`

#### 자동 폴링
- 주문 페이지 진입 시 **3초 후 1회** 자동 동기화 (사일런트)
- 이후 **5분 간격**으로 자동 폴링
- 새 주문 발견 시 토스트 알림 + 주문 목록 자동 갱신

#### 수동 동기화
- 주문 페이지 상단 **[쇼핑몰 동기화]** 버튼 (파란색)
- 카페24 + 네이버 API를 **동시 호출** (`Promise.allSettled`)
- 결과를 합산하여 토스트로 표시

#### 에러 처리
- 연동 미설정 사용자: 에러 무시 (조용히 스킵)
- 네트워크 오류 (자동 폴링): 조용히 무시
- 네트워크 오류 (수동 클릭): 에러 토스트 표시

---

## 6. 🔑 환경 변수 설정

### Vercel 대시보드 (필수)

| 변수명 | 설명 | 등록 위치 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ 등록됨 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 | ✅ 등록됨 (2026-04-24 추가) |

> **주의**: `SUPABASE_SERVICE_ROLE_KEY`가 Vercel에 없으면 콜백 라우트에서 500 에러 발생  
> `.env.local`은 로컬 전용이므로 Vercel 대시보드에서 **반드시** 별도 등록 필요

### 로컬 .env.local (참고용)

```
CAFE24_CLIENT_ID=Ru6eXOKoIafrufljCKS2vE
CAFE24_CLIENT_SECRET=fKDHWE71RikMdYRsXHbS0E
CAFE24_WEBHOOK_SECRET=e7600f08-20df-48e6-bbc8-ede746d8eaf1
NAVER_COMMERCE_CLIENT_ID=6CDGcSZe35CCFo9JmLNL7S
NAVER_COMMERCE_CLIENT_SECRET=$2a$04$vjYmxxwNUHRThdmdBLNDF.
```

---

## 7. 🐛 트러블슈팅 히스토리

### 해결된 이슈

| 날짜 | 이슈 | 원인 | 해결 |
|---|---|---|---|
| 2026-04-24 | OAuth 콜백 500 에러 | `SUPABASE_SERVICE_ROLE_KEY` Vercel 미등록 | Vercel 환경변수 추가 + Redeploy |
| 2026-04-24 | OAuth 콜백에서 mall_id 누락 | state에 tenantId만 전달됨 | state에 `tenantId:mallId` 형식 적용 |
| 2026-04-24 | DB client_secret 잘못 저장 | Webhook Secret을 Client Secret 란에 입력 | DB 직접 수정 (`fKDHWE71RikMdYRsXHbS0E`) |
| 2026-04-24 | 카페24 API 버전 오류 | `2024-03-01` 버전 만료 | `2026-03-01`으로 변경 |
| 2026-04-24 | 빌드 에러 (implicit any) | `KeyCardProps` 등 타입 미정의 | TypeScript 인터페이스 추가 |
| 2026-04-24 | 빌드 에러 (static method) | `engine.generateMarketingCopy` 인스턴스 호출 | `MarketingEngine.generateMarketingCopy` 정적 호출로 변경 |

---

## 8. 📁 관련 파일 맵

```
src/
├── app/
│   ├── api/sync/
│   │   ├── cafe24/
│   │   │   ├── route.ts          ← 카페24 주문 동기화 API
│   │   │   └── callback/
│   │   │       └── route.ts      ← 카페24 OAuth 콜백 (토큰 발급)
│   │   └── naver/
│   │       └── route.ts          ← 네이버 커머스 주문 동기화 API
│   └── dashboard/
│       ├── orders/
│       │   └── page.tsx          ← 주문 목록 (동기화 버튼 + 자동 폴링)
│       └── settings/
│           └── components/
│               └── MallIntegrationCard.tsx  ← 연동 설정 UI
```

---

## 9. 🚀 향후 작업 계획

1. **Oracle Cloud 무료 VM 프록시 구축** — 네이버 커머스 고정 IP 문제 해결
2. **토큰 자동 갱신** — 카페24 Refresh Token 만료 시 자동 재발급 로직
3. **Webhook 수신** — 카페24 주문 Webhook으로 실시간 알림 (폴링 대체)
4. **네이버 커머스 실제 테스트** — 네이버 쇼핑몰 보유 사용자 확보 후 E2E 테스트
5. **연동 가이드 팝업** — "API 키는 어디서 발급받나요?" 인라인 안내 UI

---

**작성자**: Antigravity AI  
**Copyright © 2026 Floxync. All Rights Reserved.**
