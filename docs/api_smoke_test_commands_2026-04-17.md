# API 스모크 테스트 명령어 (PowerShell)

작성일: 2026-04-17  
환경: Windows PowerShell, 로컬 개발 서버(`http://localhost:3000`)

## 0) 공통 준비

```powershell
$BASE = "http://localhost:3000"
```

## 1) POS Webhook (easycheck) 테스트

### 1-1. 기본 호출 (store_code 누락 케이스 확인)

```powershell
$body = @{
  transaction_id = "tx-test-001"
  amount = 15000
} | ConvertTo-Json

Invoke-RestMethod `
  -Method POST `
  -Uri "$BASE/api/pos/webhook/easycheck" `
  -ContentType "application/json" `
  -Body $body
```

기대값:
- `400` 또는 처리 불가 메시지
- 서버 로그에서 원인 파악 가능

### 1-2. store_code 포함 호출

```powershell
$body = @{
  store_code = "TEST_STORE_001"
  transaction_id = "tx-test-002"
  amount = 15000
} | ConvertTo-Json

Invoke-RestMethod `
  -Method POST `
  -Uri "$BASE/api/pos/webhook/easycheck" `
  -ContentType "application/json" `
  -Body $body
```

기대값:
- 등록된 연동이 없으면 `received: true, note: unregistered_store`
- 등록된 연동이 있으면 정상 처리 응답

## 2) KakaoT Webhook 테스트

```powershell
$body = @{
  trackingId = "TRACKING_TEST_001"
  eventType = "DELIVERED_DONE"
  driverName = "홍길동"
  driverPhone = "010-0000-0000"
  trackingUrl = "https://example.com/track/1"
  photoUrl = "https://example.com/photo/1.jpg"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method POST `
  -Uri "$BASE/api/delivery/webhook/kakao" `
  -ContentType "application/json" `
  -Body $body
```

기대값:
- 대상 주문이 없으면 `404`
- 주문이 있으면 상태 업데이트 성공 응답

## 3) 결제 Confirm 테스트

주의:
- 이 API는 로그인 세션이 필요
- Toss 실결제 키/값 없으면 실패 가능

### 3-1. orderId 형식 오류 확인

```powershell
$body = @{
  paymentKey = "pay_test_invalid_order"
  orderId = "wrong-format"
  amount = 1000
} | ConvertTo-Json

Invoke-RestMethod `
  -Method POST `
  -Uri "$BASE/api/payments/confirm" `
  -ContentType "application/json" `
  -Body $body
```

기대값:
- `400`과 함께 주문번호 형식 오류 메시지

### 3-2. 중복 호출 가드 확인

```powershell
$body = @{
  paymentKey = "pay_test_duplicate_001"
  orderId = "tenant_basic_1m_123456"
  amount = 1000
} | ConvertTo-Json

# 1차 호출
Invoke-RestMethod `
  -Method POST `
  -Uri "$BASE/api/payments/confirm" `
  -ContentType "application/json" `
  -Body $body

# 즉시 2차 호출
Invoke-RestMethod `
  -Method POST `
  -Uri "$BASE/api/payments/confirm" `
  -ContentType "application/json" `
  -Body $body
```

기대값:
- 2차 호출에서 `202` 또는 중복 처리 안내 메시지

## 4) AI Support fallback 로그 확인

```powershell
$body = @{
  content = "주문 등록이 안돼요"
  history = @()
  tenantId = "test-tenant"
  userName = "테스트사장님"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method POST `
  -Uri "$BASE/api/ai/support" `
  -ContentType "application/json" `
  -Body $body
```

기대값:
- 응답 실패 시 로그에서 `[AI Support][FAQ_FALLBACK]`, `[AI Support][FALLBACK_STATUS]` 확인 가능

## 5) 기록 규칙

- 각 테스트 케이스 실행 시간 기록
- 실패 케이스는 요청 바디/응답 메시지/서버 로그 3종 함께 기록
- 다음 라운드에서 재현 가능한 최소 입력값 유지
