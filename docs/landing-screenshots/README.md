# 랜딩 페이지 스크린샷 가이드

`LuminousLanding.tsx` 기준으로 랜딩에 넣을 이미지의 **캡처 URL**과 **저장 파일명**을 정리한 문서입니다.

- **소스 컴포넌트:** `src/components/landing/LuminousLanding.tsx`
- **이미지 저장 위치:** `public/images/landing/`
- **로컬 기본 URL:** `http://localhost:3000` (Electron dev 동일)
- **대시보드 경로:** `/ko` 접두사 없음 → `/dashboard/...`

## 파일명 규칙

```
public/images/landing/landing-{섹션}-{설명}.png
```

| 용도 | 권장 해상도 | 캡처 창 크기 |
|------|-------------|--------------|
| PC 화면 | 2400×1500 (16:10) | 1440×900 |
| 모바일 | 1170×2532 (9:19.5) | DevTools 390×844 이상 |

### 공통 촬영 규칙

- **라이트 테마**만 사용
- 실제 고객명·전화번호·주문번호는 **마스킹** 또는 더미 데이터
- PNG, 모서리는 후처리 시 **32px 라운드** (랜딩 CSS와 동일)
- HTML 수정 없이 `public/images/landing/`에 파일만 넣은 뒤, `LuminousLanding.tsx`의 `src`를 연결

---

## 마스터 목록

| # | 랜딩 섹션 | 앵커 | 파일명 | 캡처 URL | 화면에 보여줄 것 | 비고 |
|---|-----------|------|--------|----------|------------------|------|
| 1 | 히어로 | (상단) | `landing-hero-dashboard.png` | `/dashboard` | 오늘 주문·픽업/배송·매출 요약 카드 | 히어로 배지 「새 주문 5건」과 맞추기 |
| 2 | 원스톱 자동화 | `#feature-automation` | `landing-automation-order-flow.png` | `/dashboard/orders/new` | 주문 입력 폼 + 상품·배송 정보 | 기존 `ai-order-concierge-ui.png` 대체 가능 |
| 3 | (보조) 주문→인쇄 | `#feature-automation` | `landing-automation-print-preview.png` | `/dashboard/orders/print-preview/{주문ID}` | 주문서·인수증 미리보기 | 실제 주문 ID 필요 |
| 4 | 리본 자동화 | `#feature-ribbon` | `landing-ribbon-print-ui.png` | `/dashboard/printer` | 리본 미리보기·인쇄 설정 | 기존 `smart-print-bridge-engine.png` 대체 |
| 5 | (보조) 리본 출력물 | `#feature-ribbon` | `landing-ribbon-output-sample.png` | `/dashboard/orders/print-ribbon` | 감열 리본 출력 화면 | 실사 합성용 |
| 6 | PC 백그라운드 연결 | `#feature-connection` | `landing-desktop-orders-bg.png` | `/dashboard/orders` | 주문현황 목록(오늘·내일 필터) | 메인 이미지 |
| 7 | 픽업/배송 팝업 | `#feature-connection` | `landing-desktop-pickup-popup.png` | Electron 로그인 직후 | 「오늘 내일 픽업/배송」 팝업 | **Electron 전체 창** 캡처 |
| 8 | 영수증 OCR | `#feature-receipt` | `landing-receipt-ocr-expenses.png` | `/dashboard/expenses` | 영수증 촬영/OCR 결과·지출 등록 | 기존 `ai-expense-magic-visual-v2.png` 대체 |
| 9 | 정산 엔진 | `#feature-settlement` | `landing-settlement-daily.png` | `/dashboard/orders/daily-settlement` | 일일 정산·매출 집계 | 기존 `settlement-engine-dashboard.png` 대체 |
| 10 | (보조) 매출 분석 | `#feature-settlement` | `landing-settlement-analytics.png` | `/dashboard/analytics` | 차트·기간별 리포트 | 와이드 미리보기용 |
| 11 | 스마트 알림 | `#feature-notification` | `landing-mobile-notification.png` | `/dashboard/mobile` | 알림·예약 리마인드 UI | **세로 9:19.5**, 폰 프레임 안 |
| 12 | 다매장 관리 | `#feature-multi-store` | `landing-hq-branches-dashboard.png` | `/dashboard/hq` | 본사 대시보드·지점별 실적 | **HQ 권한** 계정 필요 |
| 13 | (보조) 지점 이관 | `#feature-multi-store` | `landing-hq-order-transfer.png` | `/dashboard/hq/transfers` 또는 `/dashboard/orders/transfers` | 지점 간 이관 목록/상태 | |
| 14 | 회원사 수발주 | `#feature-partner-network` | `landing-partner-order-popup.png` | Electron + 테스트 발주 | 수주 요청 팝업(반려/수락&인쇄) | **발주→수주 테스트 데이터** 필요 |
| 15 | (보조) 수발주 목록 | `#feature-partner-network` | `landing-partner-orders-inbox.png` | `/dashboard/orders/partner-orders` | 수주함·발주함 탭 | |
| 16 | (보조) 발주 다이얼로그 | `#feature-partner-network` | `landing-partner-order-place.png` | `/dashboard/orders` → 회원사 발주 | 수주 꽃집 선택 다이얼로그 | |
| 17 | Windows 데스크탑 | `#details` | `landing-platform-windows-desktop.png` | Electron 전체 창 `/dashboard` | 카운터 PC용 전체 UI + 트레이 | #6과 다른 구도 권장 |
| 18 | Android 모바일 | `#details` | `landing-platform-mobile-orders.png` | `/dashboard/mobile/orders/new` | 모바일 주문 입력 | 세로 9:19.5 |
| 19 | (보조) 모바일 픽업 | `#details` | `landing-platform-mobile-pickup.png` | `/dashboard/mobile/pickup` | 픽업·완료 사진 | 「완료 알림 전송됨!」 배지와 맞춤 |
| 20 | (보조) 모바일 영수증 | `#details` | `landing-platform-mobile-receipt.png` | `/dashboard/mobile` (지출/OCR) | 영수증 촬영 화면 | |
| 21 | 대시보드 미리보기 | (후기 위) | `landing-dashboard-wide.png` | `/dashboard` | 사이드바+위젯 **와이드 풀뷰** | #1과 다른 줌/탭으로 차별화 |

---

## URL 빠른 복사

### PC (브라우저 또는 Electron)

```
http://localhost:3000/dashboard
http://localhost:3000/dashboard/orders
http://localhost:3000/dashboard/orders/new
http://localhost:3000/dashboard/orders/daily-settlement
http://localhost:3000/dashboard/orders/partner-orders
http://localhost:3000/dashboard/orders/transfers
http://localhost:3000/dashboard/printer
http://localhost:3000/dashboard/expenses
http://localhost:3000/dashboard/analytics
http://localhost:3000/dashboard/hq
http://localhost:3000/dashboard/hq/transfers
```

### 모바일 (브라우저 폭 390px 또는 실제 폰)

```
http://localhost:3000/dashboard/mobile
http://localhost:3000/dashboard/mobile/orders/new
http://localhost:3000/dashboard/mobile/pickup
```

### 동적 ID 필요

```
http://localhost:3000/dashboard/orders/print-preview/{주문ID}
```

---

## 기존 에셋 ↔ 신규 파일 매핑

| 기존 (`public/images/`) | 신규 권장 파일 | 랜딩 섹션 |
|---------------------------|----------------|-----------|
| `floxync-dashboard-hero.png` | `landing/landing-hero-dashboard.png` | 히어로 |
| `ai-order-concierge-ui.png` | `landing/landing-automation-order-flow.png` | #feature-automation |
| `smart-print-bridge-engine.png` | `landing/landing-ribbon-print-ui.png` | #feature-ribbon |
| `shop-sync-api-ui-v2.png` | `landing/landing-desktop-orders-bg.png` | #feature-connection |
| `ai-expense-magic-visual-v2.png` | `landing/landing-receipt-ocr-expenses.png` | #feature-receipt |
| `settlement-engine-dashboard.png` | `landing/landing-settlement-daily.png` | #feature-settlement |

기능 상세 페이지(`src/data/landing-features.ts`)는 기존 `public/images/*.png` 경로를 그대로 사용합니다. 랜딩 메인과 분리 운영 가능합니다.

---

## 캡처 시 계정·역할

| URL | 필요 조건 |
|-----|-----------|
| `/dashboard/hq`, `/dashboard/hq/transfers` | 본사(HQ) 조직 계정 |
| `/dashboard/orders/partner-orders`, 수주 팝업 | `can_receive_orders` 등록 매장 + 테스트 발주 |
| `/dashboard/orders/print-preview/{id}` | 완료된 샘플 주문 1건 |
| Electron 팝업 (#7, #14) | 수주점 Electron 로그인 + 대기 중 `external_orders` |

---

## 우선 제작 (필수 8장)

1. `landing-hero-dashboard.png`
2. `landing-automation-order-flow.png`
3. `landing-ribbon-print-ui.png`
4. `landing-desktop-orders-bg.png`
5. `landing-receipt-ocr-expenses.png`
6. `landing-settlement-daily.png`
7. `landing-partner-order-popup.png`
8. `landing-hq-branches-dashboard.png`

나머지는 보조·합성용입니다.

---

## 랜딩 코드 연결 예시

캡처 후 `LuminousLanding.tsx`에서 플레이스홀더 URL을 교체합니다.

```tsx
<img
  alt="Flower Shop Dashboard"
  className="w-full h-auto rounded-[36px] shadow-inner"
  src="/images/landing/landing-hero-dashboard.png"
/>
```

### 현재 플레이스홀더가 있는 위치 (`alt` 기준)

| alt 텍스트 | 권장 파일 |
|------------|-----------|
| `Flower Shop Dashboard` | `landing-hero-dashboard.png` |
| `One-stop Automation Dashboard` | `landing-automation-order-flow.png` |
| `Ribbon Printing Solution` | `landing-ribbon-print-ui.png` |
| `Background Service Connection` | `landing-desktop-orders-bg.png` |
| `Receipt AI OCR` | `landing-receipt-ocr-expenses.png` |
| `Settlement Engine` | `landing-settlement-daily.png` |
| `Smart Notification Screen` | `landing-mobile-notification.png` |
| `Windows PC App` | `landing-platform-windows-desktop.png` |
| `Mobile App Screen` | `landing-platform-mobile-orders.png` |
| `Dashboard Full View` | `landing-dashboard-wide.png` |

### 이미지 슬롯 없음 (신규 추가 검토)

| 앵커 | 권장 파일 |
|------|-----------|
| `#feature-multi-store` | `landing-hq-branches-dashboard.png` |
| `#feature-partner-network` | `landing-partner-order-popup.png` |

---

## 이미지가 필요 없는 구간

| 구간 | 이유 |
|------|------|
| `#features-summary` | Material 아이콘 8칸 그리드 |
| `#testimonials` | 아이콘 아바타 |
| 4가지 선물 섹션 | 이모지 카드 |
| `#test-user-apply` | 폼 중심 |
| 푸터 | 로고만 |

---

*최종 업데이트: 2026-06-25*
