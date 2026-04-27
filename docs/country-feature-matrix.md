# Country Feature Matrix (Expanded Preset Design)

## Scope
- 기존 리서치 5개국: KR, VN, CN, JP, ES
- 확장 타겟(우선순위 시장): US, GB, FR, DE, CA, AU, SG, BR, MX, RU
- 목표: 운영국가 클릭 시 "그 나라에서 많이 쓰는 운영 스택" 기본 세팅 자동 적용

## Priority Legend
- `P0`: 운영국가 프리셋에 즉시 반영
- `P1`: 초기 확장 릴리즈에서 반영
- `P2`: 고도화/파일럿 후 반영

## Core Principle (중요)
1. **표시 언어(User preference)** 와 **운영 국가(Tenant policy)** 를 분리
2. 운영국가 선택 시, 채널/배송/결제/통화/세금/문서포맷 프리셋 적용
3. 자동 적용 후 반드시 "수동 오버라이드" 가능해야 함

## Country Stack Preset (실무 기준)

| Country | Default Locale | Currency | Chat/Inbound | Delivery | Payment | Tax/Receipt Notes |
|---|---|---|---|---|---|---|
| KR | ko | KRW | KakaoTalk (`P0`) | Kakao T (`P0`) | Card/Bank (`P0`) | VAT/면세 분기 (`P0`) |
| VN | vi | VND | Zalo (`P0`) | Grab (`P0`) | QR/Bank (`P1`) | VAT invoice flow (`P1`) |
| CN | zh | CNY | WeChat (`P0`) | Local courier aggregator (`P1`) | WeChat/Alipay (`P1`) | Fapiao/증빙 구조 (`P1`) |
| JP | ja | JPY | LINE (`P1`) | Yamato/Sagawa style ops (`P1`) | Card/Bank (`P1`) | 소비세 표시 엄격 (`P1`) |
| ES | es | EUR | WhatsApp (`P0`) | Glovo/Uber Direct style (`P1`) | Card/Bizum style (`P1`) | IVA reporting (`P1`) |
| US | en-US | USD | SMS/Instagram/WhatsApp (`P1`) | Uber/Doordash style (`P1`) | Stripe/Square style (`P1`) | Sales tax by state (`P0`) |
| GB | en-GB | GBP | WhatsApp (`P1`) | Local courier (`P1`) | Card/OpenBanking (`P1`) | VAT + postcode format (`P0`) |
| FR | fr-FR | EUR | WhatsApp/Instagram (`P1`) | Stuart/Chronopost style (`P1`) | Card/Bank (`P1`) | TVA (`P1`) |
| DE | de-DE | EUR | WhatsApp (`P1`) | DHL local same-day mix (`P1`) | Card/SEPA (`P1`) | USt/receipt strictness (`P1`) |
| CA | en-CA/fr-CA | CAD | SMS/WhatsApp (`P1`) | Uber local delivery (`P1`) | Card/Interac style (`P1`) | GST/HST/PST split (`P0`) |
| AU | en-AU | AUD | SMS/Instagram (`P1`) | DoorDash/Uber style (`P1`) | Card/PayID style (`P1`) | GST 10% common (`P0`) |
| SG | en-SG | SGD | WhatsApp (`P0`) | Grab (`P0`) | PayNow/Card (`P1`) | GST regime (`P1`) |
| BR | pt-BR | BRL | WhatsApp (`P0`) | iFood/Loggi style (`P1`) | PIX/Card (`P0`) | NFe/tax complexity (`P0`) |
| MX | es-MX | MXN | WhatsApp (`P0`) | Rappi/Uber style (`P1`) | SPEI/Card (`P1`) | CFDI invoicing (`P0`) |
| RU | ru-RU | RUB | Telegram/WhatsApp (`P1`) | Yandex Go style (`P1`) | Local bank/card (`P1`) | VAT receipt flow (`P1`) |

> 주의: 위 서비스명은 "운영 프리셋 설계 기준"이며, 실제 API 연동은 국가별 법/정책/계약 확인 후 enable.

## What Should Be Auto-Configured by Country

운영국가 클릭 시 아래 항목 자동 반영:

1. **Locale recommendation**
   - 예: CA -> `en-CA` 추천 (사용자가 원하면 `fr-CA`로 변경)
2. **Currency + number/date format**
   - 예: VN->VND, GB->GBP, RU->RUB
3. **Tax profile template**
   - VAT/GST/SalesTax 분기 프리셋
4. **Default communication channels**
   - 예: KR KakaoTalk, VN Zalo, BR WhatsApp
5. **Delivery integration preference**
   - 예: KR Kakao T, VN/SG Grab
6. **Payment method preference**
   - 예: BR PIX, SG PayNow, MX SPEI
7. **Document template pack**
   - 통화 기호, 주소 포맷, 전화 포맷, 영수증 문구

## Product Opinion (권장 전략)

### 1) "Hard-lock" 말고 "Smart preset + editable"
- 운영국가 클릭 시 추천값 자동 세팅
- 하지만 사용자는 언제든 채널/배송/결제를 수동 변경 가능
- 이유: 실제 매장은 혼합 운영(예: VN + WhatsApp 주문)이 많음

### 2) Onboarding에서 한 번에 보여주기
- 운영국가 선택 직후 "적용될 기본 세팅" 미리보기 제공:
  - 통화, 세금 타입, 추천 메신저, 추천 배송, 추천 결제
- 저장 전 체크박스로 개별 적용 on/off 지원

### 3) 연결 가능한 것만 활성화
- API 준비 전 채널은 "추천" 상태 배지로 표시
- 계약/API 준비 완료 시 "연결 가능"으로 상태 전환

## Implementation Roadmap (Next)

1. `countryPresetMap.ts` 신설 (국가별 프리셋 소스 오브 트루스)
2. 설정 저장 시 `applyCountryPreset(country, mode)` 적용
   - `mode`: `smart-merge` (기존 커스텀 보존) / `force-replace`
3. 환경설정 UI에 "운영국가 변경 영향 미리보기" 카드 추가
4. 채널/배송/결제 카드에 국가 추천 배지 + 1클릭 적용 버튼 추가

## Validation Checklist
- 파일럿 매장 3곳 이상에서 국가별 주문 흐름 검증
- 채널별 주문 파싱 정확도 / 배송 실패율 / 정산 누락률 측정
- 국가별 세금/문서 법적 필수 항목 QA
