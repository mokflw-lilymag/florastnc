# 사장님이 올려 주실 화면 캡처 목록

AI가 넣어 둔 **SVG 목업**은 이미 `/docs/manual`에 보입니다.  
아래 PNG를 **같은 파일명**으로 `docs/manual-screenshots/`에 넣으면 자동으로 실제 화면으로 바뀝니다.

**촬영 규칙:** PC 1440×900 또는 1920×1080 · 라이트 테마 · 고객 전화·실주문번호 가리기

---

## 🔴 우선 (상황별 가이드 S0~S10 — SVG 목업 적용됨)

| 파일명 | 촬영 화면 | 어떻게 열기 |
|--------|-----------|-------------|
| `sit-00-login.png` | 로그인·첫 대시보드 | floxync.com 로그인 후 |
| `sit-01-print-flow.png` | (선택) 프린터에서 주문서 나오는 순간 | 테스트 주문 1건 후 |
| `sit-02-ribbon.png` | 리본 프린터 화면 + PRINT 버튼 | 왼쪽 **리본 프린터** |
| `sit-03-delivery-fee.png` | 환경 설정 → **배송** 탭 전체 | **환경 설정** → 배송 |
| `sit-04-quick-pos.png` | **⚡ 빠른판매 POS** 전체 | `/dashboard/pos/quick` |
| `sit-05-delivery-close.png` | **배송·픽업** + 실제 배송비 입력 창 | 왼쪽 **배송** 메뉴 |
| `sit-06-mobile-order.png` | 모바일 새 주문 화면 | 앱 또는 모바일 브라우저 |
| `sit-07-daily-settlement.png` | 일일 마감 정산 카드 4장 | 주문 목록 → 일일 마감 |
| `sit-08-ai-order.png` | AI 주문 붙여넣기 영역 | 새 주문 |
| `sit-09-customer.png` | 고객 CRM 목록 | 왼쪽 **고객** |
| `sit-10-revenue.png` | 매출 캘린더 첫 화면 | 왼쪽 **매출 캘린더** |
| `nav-notifications.png` | 알림·공지 목록 | 상단 종 아이콘 |

> 현재 HTML은 **`.svg` 목업**을 씁니다. PNG를 같은 이름으로 넣으면 `manual-png-to-svg.py` 역변환 또는 HTML `src`를 `.png`로 바꿔 교체하세요.

---

## 🟡 v4.5 백과 (P3·P4 — SVG 없음, 촬영 시 추가)

| 파일명 | 화면 |
|--------|------|
| `revenue-01-overview.png` | 매출 캘린더 Auto-Pilot 전체 |
| `outsource-01-dialog.png` | 외부발주 다이얼로그 |
| `partner-order-01-dialog.png` | 회원사 수발주 발주 DLG |
| `branch-transfer-01-dialog.png` | 지점 이관 요청 DLG |
| `hq-01-dashboard.png` | 본사 개요 KPI·차트 |
| `hq-02-transfers.png` | 다매장 수발주 정산 |

---

## 🟡 v4.4 백과 (P2·PR — SVG 없음, 촬영 시 추가)

| 파일명 | 화면 |
|--------|------|
| `products-01-list.png` | 상품 관리 목록+통계 |
| `inventory-01-list.png` | 재고 관리 |
| `expenses-01-ai-receipt.png` | 지출 · AI 영수증 배너 |
| `reports-01-kpi.png` | 정산·보고서 KPI |
| `ribbon-01-overview.png` | 리본 PR-A~D (이미 SVG 있음) |
| `daily-settlement-01-cards.png` | 일일 마감 4카드 |

---

| 파일명 | 화면 |
|--------|------|
| `home-01-dashboard.png` | 업무 홈 `/dashboard` |
| `settings-05-printer.png` | 환경 설정 → 프린터/브릿지 (**연결됨** 상태) |
| `orders-01-ai-entry.png` | 새 주문 AI 붙여넣기 |
| `orders-02-detail-annotated.png` | 주문 상세 (버튼 보이게) |
| `calendar-01-delivery-schedule.png` | 배송·픽업 일정 |
| `crm-01-customer-list.png` | 고객 목록 |

전체 목록: [README.md](./README.md)

---

## 올리는 방법

1. 캡처 → 파일명 **그대로** 저장  
2. `d:\mapp\floxync.com\docs\manual-screenshots\` 에 복사  
3. 브라우저에서 `/docs/manual` **새로고침**  
4. 또는 Cursor에 PNG 첨부 + 「`sit-03-delivery-fee.png` 매뉴얼에 반영해줘」

---

## 검수 부탁 (캡처와 별도)

상황별 가이드 따라 해 보시고 틀린 순서 있으면 알려주세요.

- [ ] S0 첫날 30분 — 테스트 주문까지  
- [ ] S01 휴대폰 주문 → 매장 인쇄  
- [ ] S02 리본 — 모바일 안 됨 맞는지  
- [ ] S05 실배송비 저장 → **지출**에 들어가는지  
- [ ] S07 일일 마감 숫자가 매장 금고와 맞는지  
