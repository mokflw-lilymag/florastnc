# 🏪 FloraSync × POS 연동 전략 기획서 (v1.0)

> **작성일**: 2026-04-17  
> **기획**: 총괄 디렉터 에이전트 + 구조 설계 에이전트 + 결제/보안 에이전트 공동 기획  
> **목표**: FloraSync SaaS를 독립 운영뿐 아니라, 오프라인 POS 시스템과 완전 연동하여 이중 입력 없는 통합 꽃집 운영 플랫폼 구축

---

## 1. 개요 및 배경

### 현재 상황 (As-Is)
FloraSync는 현재 웹 기반 독립 SaaS로 동작하며, 매장 사장님이 직접 주문/결제/배송을 수기 입력하는 방식입니다.

### 목표 상황 (To-Be)
오프라인 POS 단말기(이지체크, 토스POS 등)에서 결제가 완료되는 순간, FloraSync에 **자동으로** 다음 정보가 동기화됩니다:
- 결제 금액 및 방법
- 구매 상품 정보
- 고객 포인트 자동 적립/차감
- 일반 워킹 고객(비회원) 처리 및 회원 고객 자동 매칭

---

## 2. 연동 대상 POS 시스템

| 우선순위 | POS | API 방식 | 특기 사항 |
|---|---|---|---|
| **1순위** | **이지체크 (EasyCheck)** | REST API + Webhook | 꽃집 업계 점유율 1위. 카드·현금·간편결제 통합 |
| **2순위** | **토스 POS (TossPlace)** | REST API | 분석 대시보드 강점. 중소 매장 급성장 |
| **참고** | 일반 카드 단말기 (Van사) | Webhook (결제 알림) | 국민카드·신한카드 Van 연동. 향후 로드맵 |

---

## 3. 아키텍처 설계

### 3-1. 전체 데이터 흐름

```
[POS 단말기]
    |
    | HTTP Webhook (결제 완료 이벤트)
    ↓
[FloraSync - Next.js API Route]
  /api/pos/webhook/easycheck
  /api/pos/webhook/toss
    |
    | 데이터 파싱 & 검증 (HMAC 서명 검증)
    ↓
[POS Bridge Service]  ← 핵심 비즈니스 로직
    |
    |── 고객 매칭 엔진 (전화번호 기반)
    |── 주문 자동 생성
    |── 포인트 자동 적립
    |── 지출 자동 기록
    ↓
[Supabase DB]  →  [Realtime 구독]  →  [FloraSync 대시보드 즉시 반영]
```

### 3-2. 신규 DB 테이블 설계

```sql
-- POS 연동 설정 (매장별)
CREATE TABLE pos_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    pos_type TEXT NOT NULL, -- 'easycheck' | 'toss' | 'manual'
    api_key TEXT,           -- 암호화 저장
    api_secret TEXT,        -- 암호화 저장
    store_id TEXT,          -- POS 측 매장 식별자
    webhook_secret TEXT,    -- Webhook HMAC 검증 키
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- POS 원본 결제 트랜잭션 (원본 보존)
CREATE TABLE pos_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    pos_type TEXT,
    pos_transaction_id TEXT UNIQUE, -- POS 측 고유 결제번호
    raw_payload JSONB,              -- 원본 데이터 100% 보존
    mapped_order_id UUID REFERENCES orders(id), -- 연동된 주문
    status TEXT DEFAULT 'pending',  -- 'pending' | 'mapped' | 'failed' | 'ignored'
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. 핵심 기능 상세 설계

### 4-1. 고객 자동 매칭 엔진 (Customer Matching Engine)

결제 완료 시 수신되는 전화번호를 기준으로 3단계 매칭을 수행합니다.

```
수신된 전화번호
    |
    ├── [1단계] DB에서 동일 전화번호 고객 조회
    |       ↓ 있음 → 기존 회원으로 매핑 → 포인트 자동 적립
    |       ↓ 없음 ↓
    |
    ├── [2단계] '워킹 고객(Walk-in)' 임시 처리
    |       ↓ 주문은 정상 생성, 고객 링크는 null
    |       ↓ 관리자가 나중에 수동 고객 연결 가능
    |
    └── [3단계] (선택) 자동 신규 고객 등록
            사장님 설정에 따라 ON/OFF 가능
```

### 4-2. 포인트 자동 연동 규칙

| 케이스 | 포인트 처리 |
|---|---|
| 기존 회원 결제 | `결제금액 × 포인트 적립률(설정값)` 자동 적립 |
| 워킹 고객(비회원) | 포인트 미적립 (또는 사후 회원 연동 후 소급 적립) |
| 포인트 사용 결제 | POS에서 할인 적용값 수신 → 고객 포인트 차감 |

### 4-3. 주문 자동 생성 규칙

POS 결제 완료 이벤트로 FloraSync 주문이 자동 생성될 때 기본값:

```typescript
const mappedOrder = {
  source: 'pos',           // 주문 출처 명시
  receipt_type: 'store_pickup',  // 기본값: 매장 구매
  status: 'completed',     // POS 결제 완료 = 주문 완료
  payment: {
    method: posPayload.paymentMethod,  // card / cash / kakaopay 등
    status: 'paid'
  },
  items: posPayload.items.map(mapPosItem),
  orderer: matchedCustomer || { name: '워킹 고객', contact: posPayload.phone }
};
```

---

## 5. 보안 설계

### 5-1. Webhook 인증
- 모든 POS Webhook 수신 시 **HMAC-SHA256 서명 검증** 필수
- 검증 실패 시 즉시 `401` 반환 및 로그 기록
- `pos_integrations.webhook_secret`은 **Supabase Vault** 또는 환경변수로 암호화 보관

### 5-2. API Key 관리
- 매장별 POS API Key는 `pos_integrations` 테이블에 저장
- Supabase RLS로 `tenant_id` 기반 접근 제어
- 관리자 페이지에서만 설정 가능, 일반 사용자 열람 불가

---

## 6. UI/UX 설계

### 6-1. 설정 페이지 (`/dashboard/settings/pos`)
- POS 종류 선택 (이지체크 / 토스 / 수동)
- API Key 입력 (암호화 마스킹 표시)
- 연동 테스트 버튼 (Ping 테스트)
- 동기화 상태 및 마지막 연동 시각 표시

### 6-2. 대시보드 통합
- 기존 주문 목록에 POS 연동 주문 뱃지 추가 (`📟 POS 자동`)
- 고객 상세 페이지에 POS 결제 이력 통합 표시
- 워킹 고객 주문에 "고객 연결" 버튼 제공

### 6-3. 실시간 알림
- POS 결제 완료 → 대시보드에 실시간 토스트 알림
- 고객 매칭 성공/실패 여부 표시

---

## 7. 구현 로드맵

### Phase 1 — 기반 인프라 (2주)
- [ ] `pos_integrations`, `pos_transactions` DB 테이블 생성
- [ ] Webhook 수신 API Route 골격 구축 (`/api/pos/webhook/[provider]`)
- [ ] HMAC 서명 검증 미들웨어 구현
- [ ] 설정 페이지 UI 구현

### Phase 2 — 이지체크 연동 (3주)
- [ ] 이지체크 Webhook payload 파싱 로직
- [ ] 고객 매칭 엔진 구현
- [ ] 주문 자동 생성 로직
- [ ] 포인트 자동 적립 로직
- [ ] 실시간 대시보드 반영

### Phase 3 — 토스POS 연동 (2주)
- [ ] 토스POS API 인증 플로우 구현 (OAuth 2.0 기반)
- [ ] 결제 이벤트 매핑
- [ ] Phase 2 엔진 재사용

### Phase 4 — 고도화 (2주)
- [ ] 워킹 고객 사후 회원 연결 UI
- [ ] POS 연동 통계/분석 페이지
- [ ] 결제 실패/오류 재처리 메커니즘
- [ ] 일괄 동기화 배치 (Cron) 추가

---

## 8. 예상 기술 스택

| 영역 | 기술 |
|---|---|
| Webhook 수신 | Next.js App Router API Route (Edge Runtime) |
| 서명 검증 | Web Crypto API (`crypto.subtle`) |
| 비즈니스 로직 | TypeScript Service Class (`PosIntegrationService`) |
| 실시간 반영 | Supabase Realtime (postgres_changes) |
| 암호화 | Supabase Vault 또는 AES-256-GCM |
| POS 통신 | `fetch` (REST) + 이지체크/토스 공식 SDK |

---

## 9. 열린 질문들 (Open Questions)

> **사장님께 확인이 필요한 사항들**

1. **이지체크 계약**: 이지체크 파트너 API는 별도 계약이 필요합니다. 현재 이지체크 계정이 있으신가요?
2. **포인트 적립률**: 결제 금액 대비 몇 %를 포인트로 적립하길 원하시나요? (매장별 설정 vs 전체 통일)
3. **워킹 고객 전략**: 비회원 구매 시 자동으로 신규 고객 등록을 할까요, 아니면 수동으로 연결하는 방식을 선호하시나요?
4. **결제 취소 동기화**: POS에서 결제 취소 시 FloraSync 주문도 자동으로 취소 처리할까요?

---

*본 기획서는 총괄 디렉터 에이전트가 구조 설계 에이전트 및 결제/보안 에이전트와 협의하여 작성한 최초 버전입니다. 구현 진행에 따라 지속 업데이트됩니다.*
