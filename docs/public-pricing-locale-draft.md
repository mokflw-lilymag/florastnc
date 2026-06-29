# 공개 요금 페이지 초안 (`/[locale]/pricing`)

> **목적:** 처음 방문·가입 전 사용자가 보는 요금 안내  
> **상태:** 구현 완료 (`PublicPricingView`, `public-pricing-copy.ts`)  
> **작성:** 2026-06  
> **연관 코드:** `src/lib/subscription/pricing.ts`, `src/app/[locale]/pricing/page.tsx`

---

## 1. 표시 규칙 (합의)

| 구분 | 기준 | 통화 | 결제 안내 |
|------|------|------|-----------|
| **공개 요금표** (랜딩·`/pricing`) | URL **`locale`** | `ko` → **KRW** / 그 외 → **USD** | 문구만 (결제는 가입 후) |
| **실제 구독 결제** (대시보드) | 매장 **`system_settings.country`** | `KR` → KRW·토스 / 그 외 → USD·Stripe | 기존 로직 유지 |

### 공통 각주 (모든 locale에 표시)

**ko**
> 표시 요금은 안내용입니다. 가입 후 **매장 운영 국가** 설정에 따라 청구됩니다.

**en**
> Prices shown are indicative. After signup, billing follows your **store operating country setting**.

**vi**
> Giá hiển thị chỉ mang tính tham khảo. Sau khi đăng ký, thanh toán theo **cài đặt quốc gia vận hành cửa hàng** của bạn.

**ja**
> 表示料金は参考用です。ご登録後、**店舗の運営国設定**に応じて請求されます。

---

## 2. 가격 숫자 (코드 기준 — `pricing.ts`)

### 2.1 원화 (KRW, 총액)

| 플랜 | 1개월 | 3개월 | 6개월 | 12개월 |
|------|------:|------:|------:|-------:|
| 무료 체험 | 0 | — | — | — |
| 리본 라이센스 (`ribbon_only`) | 15,000 | 45,000 | 90,000 | 120,000 |
| 플로비서 라이트 (`light`) | 25,000 | 75,000 | 150,000 | 300,000 |
| 플로비서 프로 (`pro`) | 40,000 | 120,000 | 240,000 | 440,000 |
| 프로 플러스 (`pro_plus`) | 60,000 | 180,000 | 360,000 | 660,000 |

### 2.2 달러 (USD, 총액 — Stripe)

| 플랜 | 1개월 | 3개월 | 6개월 | 12개월 |
|------|------:|------:|------:|-------:|
| Free trial | $0 | — | — | — |
| Print License (`ribbon_only`) | $15 | $45 | $90 | $120 |
| FloSecretary Light (`light`) | $25 | $75 | $150 | $300 |
| FloSecretary Pro (`pro`) | **$40** | **$120** | **$240** | **$440** |
| Pro Plus (`pro_plus`) | **$60** | **$180** | **$360** | **$660** |

### 2.3 연간 혜택 문구 (마케팅 — 기존 페이지와 동일)

| 플랜 | ko | en |
|------|----|----|
| 리본 | 연 결제 시 120,000원 (대폭 즉시할인!) | Annual prepay: $120 (save vs monthly) |
| 라이트 | 연 300,000원 (1달 추가연장 → 총 13개월) | Annual $300 — includes **1 bonus month** (13 months) |
| 프로 | 연 440,000원 (1달 할인 + 1달 연장 → 총 13개월) | Annual $440 — **1 bonus month** (13 months) |
| 프로+ | 연 660,000원 (1달 할인 + 2달 연장 → 총 14개월) | Annual $660 — **2 bonus months** (14 months) |

> 환율 실시간 연동 없음. USD는 고정표. 변경 시 사전 공지.

---

## 3. 페이지 공통 UI 문구

### 3.1 메타데이터

| 키 | ko | en | vi |
|----|----|----|-----|
| `title` | 이용 요금 · 플로싱크 | Pricing · FloXync | Bảng giá · FloXync |
| `description` | 하루 단 800원부터 무제한 비서까지, 플로싱크 요금 안내 | From free trial to full shop assistant — FloXync plans in USD | Từ dùng thử miễn phí đến trợ lý đầy đủ — bảng giá FloXync |

### 3.2 헤더

| 키 | ko | en | vi |
|----|----|----|-----|
| `backHome` | 홈으로 돌아가기 | Back to home | Về trang chủ |
| `badge` | 🌸 FLOSYNC RATE CARD | 🌸 FLOSYNC RATE CARD | 🌸 FLOSYNC RATE CARD |
| `h1` | 플로싱크 이용 요금 안내 | FloXync pricing | Bảng giá FloXync |
| `subtitle` | 사장님 매장의 주문 건수와 필요 기능에 맞는 **가장 합리적인 혜택**을 만나보세요. | Choose the plan that fits your order volume and daily workflow. | Chọn gói phù hợp quy mô đơn hàng và cách vận hành của bạn. |

---

## 4. 플랜 카드 문구

### 4.0 무료 체험 (`free`)

| 필드 | ko | en |
|------|----|----|
| 배지 | 체험 모드 | Free trial |
| 이름 | 무료 체험판 | Free trial |
| 설명 | 결제 없이 모든 기능을 둘러보고 출력 테스트를 진행해 볼 수 있는 체험 플랜 | Explore features and print tests without payment |
| 가격 | 무료 (0원) | Free ($0) |
| 부가 | (체험용 데이터 저장 제외) | (Trial data not saved to cloud) |
| 기능 1 | 월 5건 주문 저장 가능 | Up to 5 orders/month saved |
| 기능 2 | 장부/ERP 기능 조회 및 체험 | Browse ERP features (trial mode) |
| 기능 3 | 리본 인쇄 아이디당 총 5회 테스트 | 5 ribbon print tests per account |
| 기능 4 | 3개월 미접속 시 자동 탈퇴 및 데이터 삭제 | Inactive 3+ months: account & data may be removed |
| 푸터 | 기한 제한 없음 | No time limit |

### 4.1 리본 라이센스 (`ribbon_only`)

| 필드 | ko | en |
|------|----|----|
| 배지 | 리본 전용 | Print only |
| 이름 | 리본 라이센스 | Print License |
| 설명 | 장부는 필요 없고 리본·경조사 인쇄만 무제한으로 쓰는 매장 | Unlimited ribbon printing — no full ERP |
| 월 가격 표기 | 월 15,000원 | $15 / month |
| 연 혜택 | 연 결제 시: 120,000원 (대폭 즉시할인!) | Annual: $120 total |
| 기능 + | 리본 출력 무제한, 다양한 감열 프린터 지원 | Unlimited ribbon prints, thermal printers |
| 기능 − | 매장 장부·고객 관리 제외 | No shop ledger / CRM |
| 푸터 | 월 결제 또는 연간 즉시할인 선택 가능 | Monthly or annual billing |

### 4.2 플로비서 라이트 (`light`)

| 필드 | ko | en |
|------|----|----|
| 배지 | 소규모 매장 | Small shop |
| 이름 | 플로비서 라이트 | FloSecretary Light |
| 설명 | 주문량이 많지 않은 1인 숍이 부담 없이 입문 | Entry plan for solo florists |
| 월 가격 | 월 25,000원 | $25 / month |
| 연 혜택 | 연 300,000원 (1달 추가연장!) | Annual $300 (+1 bonus month) |
| 기능 | 월 주문 100건, 매장 관리·리본 전 기능, 모바일 사진 전송 | 100 orders/mo, full assistant + ribbon, mobile photos |
| 푸터 | 연 결제 시 1개월 보너스 (총 13개월) | 13 months on annual plan |

### 4.3 플로비서 프로 (`pro`) — **$40/월**

| 필드 | ko | en |
|------|----|----|
| 배지 | 성장형 매장 | Growing shop |
| 이름 | 플로비서 프로 | FloSecretary Pro |
| 설명 | 본격 주문 관리와 실속 혜택을 원하는 꽃집 | For shops scaling order volume |
| 월 가격 | 월 40,000원 | **$40 / month** |
| 연 혜택 | 연 440,000원 (1달 할인 + 1달 연장!) | Annual **$440** (+1 bonus month) |
| 기능 | 월 주문 200건, 매장·리본 전 기능 | 200 orders/mo, full features |
| 한국 전용* | 포스 프린터 무상 임대 (연결제·요청 시), 자연고장 무상 교체 | *Korea only — POS printer loan program |
| 푸터 | 연 결제 시 총 13개월 | 13 months on annual |

### 4.4 프로 플러스 (`pro_plus`) — **$60/월** · BEST

| 필드 | ko | en |
|------|----|----|
| 배지 | 대형/무제한 | Unlimited |
| 이름 | 프로 플러스 | Pro Plus |
| 라벨 | BEST 추천 👑 | BEST 👑 |
| 설명 | 한도 없는 주문과 VIP 혜택을 원하는 프리미엄 매장 | Unlimited orders, premium tier |
| 월 가격 | 월 60,000원 | **$60 / month** |
| 연 혜택 | 연 660,000원 (1달 할인 + 2달 연장!) | Annual **$660** (+2 bonus months) |
| 기능 | 주문 무제한, 매장·리본 전 기능 | Unlimited orders, all features |
| 푸터 | 연 결제 시 총 14개월 | 14 months on annual |

> **한국 전용 혜택** (POS 임대 등): `locale === 'ko'` 일 때만 카드에 노출 (현행 페이지와 동일).

---

## 5. 하단 CTA 블록

| 키 | ko | en |
|----|----|----|
| 제목 | 베타 테스터 신청 및 가입 | Join the beta |
| 본문 | 지금 가입하시면 정식 런칭 전까지 무료 체험. 런칭 후에도 베타 우대가 적용됩니다. | Free during beta. Early-member benefits after launch. |
| CTA 1 | 베타 테스터 신청서 쓰러 가기 | Apply for beta |
| CTA 2 | 이메일로 문의 | Email us |
| 다운로드 제목 | 앱 및 프로그램 다운로드 (무료/체험 가능) | Download apps (free trial) |
| 윈도우 | 윈도우 프로그램 다운로드 | Windows desktop app |
| 안드로이드 | 안드로이드 모바일 앱 다운로드 | Android app |

---

## 6. 베트남어 (`vi`) — 핵심만 (전체는 en 구조 복제 후 번역)

| 플랜 | Tên | Giá/tháng (USD) |
|------|-----|-----------------|
| Dùng thử | Dùng thử miễn phí | $0 |
| In ruy băng | Giấy phép in | $15 |
| Light | FloSecretary Light | $25 |
| Pro | FloSecretary Pro | **$40** |
| Pro Plus | Pro Plus | **$60** |

각주 vi: *Thanh toán thực tế theo cài đặt quốc gia vận hành cửa hàng sau khi đăng ký.*

---

## 7. 구현 메모 (개발 시)

1. **`locale === 'ko'`** → `PLAN_KRW_TOTAL` + `₩` 포맷  
2. **`locale !== 'ko'`** → `PLAN_USD_TOTAL_CENTS` + `formatUsdTotal`  
3. 문구는 `src/i18n/messages/` 또는 `src/lib/pricing/public-pricing-copy.ts` 로 분리  
4. `generateMetadata`도 locale별 title/description  
5. 랜딩 `LuminousLanding` 「이용 요금」→ locale별 라벨 (`Pricing` / `Bảng giá`)  
6. **단일 소스:** 숫자는 반드시 `pricing.ts` import — 페이지에 금액 하드코딩 금지  

### 의사 코드

```ts
const useKrw = locale === "ko";
const totals = useKrw ? PLAN_KRW_TOTAL : PLAN_USD_TOTAL_CENTS;
const format = useKrw ? formatKrw : formatUsdTotal;
```

---

## 8. 체크리스트 (QA)

- [ ] `/ko/pricing` → 전부 한국어 + 원화
- [ ] `/en/pricing` → 영어 + $ (프로 $40, 프로+ $60)
- [ ] `/vi/pricing` → 베트남어 + $
- [ ] 각주: 매장 국가에 따른 실제 청구 안내
- [ ] POS 임대 문구는 ko만
- [ ] 가격 숫자가 `pricing.ts`와 일치
- [ ] 구독 대시보드(매장 KR)와 ko 공개표 원화 일치

---

## 9. `floxync-positioning-messaging` 반영 시 한 줄

> **공개 요금:** `locale=ko`는 원화 안내, 그 외 locale은 USD 고정표. 실제 결제는 가입 후 매장 운영 국가(KR→토스/KRW, 해외→Stripe/USD).
