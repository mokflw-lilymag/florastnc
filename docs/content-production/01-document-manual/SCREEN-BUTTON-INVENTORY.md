# FloXync 테넌트 화면 · 버튼 인벤토리 (작업 정본)

> **용도:** Track M 백과사전 작성 시 「빠짐없이」 체크하는 작업 목록  
> **갱신:** 코드 TSX + `ko.json` 기준 · 2026-07-04 (v4.6)  
> **상태:** `⬜ 미작성` `🟡 요약만` `🟢 버튼레지스트리 완료`

---

## 사이드바 — 매장 운영 메뉴

| 메뉴 (KO) | 경로 | Doc ID | 상태 | 추정 항목 |
|-----------|------|--------|------|-----------|
| 업무 홈 | `/dashboard` | M01 | 🟢 v4.4 | 18 |
| 알림함 | `/dashboard/notifications` | M14 | 🟢 v4.4 | 8 |
| 새 주문 | `/dashboard/orders/new` | M02 | 🟢 v4.3 | 45 |
| 주문 현황 | `/dashboard/orders` | M03 | 🟢 v4.3 | 35 |
| 일일 마감 | `/orders/daily-settlement` | M12 | 🟢 v4.4 | 15 |
| 배송 · 픽업 | `/dashboard/delivery` | M05 | 🟢 v4.3 | 22 |
| 빠른 POS | `/dashboard/pos/quick` | M06 | 🟢 v4.3 | 20 |
| 모바일 주문 | `/orders/new-mobile` | M02m | 🟢 v4.3 | 40 |
| 고객 CRM | `/dashboard/customers` | M08 | 🟢 v4.4 | 20 |
| 상품 | `/dashboard/products` | M09 | 🟢 v4.4 | 18 |
| 재고 | `/dashboard/inventory` | M10 | 🟢 v4.4 | 15 |
| 거래처 | `/dashboard/suppliers` | — | 🟢 v4.4 | 12 |
| 매입 | `/dashboard/purchases` | — | 🟢 v4.4 | 12 |
| 정산 · 보고서 | `/dashboard/reports` | — | 🟢 v4.4 | 15 |
| 매입·매출 통계 | `/dashboard/analytics` | — | 🟢 v4.4 | 12 |
| 지출 | `/dashboard/expenses` | M11 | 🟢 v4.4 | 20 |
| 세무 | `/dashboard/tax` | — | 🟢 v4.4 | 10 |
| 리본 프린터 | `/dashboard/printer` | **M13a (PR)** | 🟢 v4.4 | 50~80 |
| 주문→리본 | `/orders/print-ribbon` | **M13c (PR)** | 🟢 v4.4 | 15 |
| 매출 캘린더 | `/dashboard/revenue` | — | 🟢 v4.5 | 25 |
| 환경 설정 | `/dashboard/settings` | M15–22 (P0) | 🟢 v4.3 | 55 |
| 구독 · 플랜 | `/dashboard/subscription` | M23 | 🟢 v4.3 | 10 |

> **연동 표:** [INTEGRATION-FLOWS.md](./INTEGRATION-FLOWS.md) · HTML `#integrations-hub`

---

## Tier PR — 리본 (v4.4)

| 앵커 | 내용 |
|------|------|
| `#nav-printer-sidebar` | 출력 프린터·프리셋·여백·인쇄대상·폰트·문구·로고 |
| `#nav-printer-canvas` | 좌우 리본·글자 회전·패널 Chevron |
| `#nav-printer-toolbar` | Templates · Preview/Design · 줌 · PRINT |
| `#nav-printer-dialogs` | 폰트·상용구·템플릿·브릿지·구독 |
| `#nav-ribbon-from-order-header` | print-ribbon 7항목 |

---

## Tier P2 — v4.4 레지스트리

| 화면 | 앵커 |
|------|------|
| M08 CRM | `#nav-customers-header` + 기존 서류 상세 |
| M09 상품 | `#nav-products-header` … `#nav-products-form` |
| M10 재고 | `#nav-inventory-header` … |
| 거래처 | `#nav-suppliers` 표 |
| 매입 | `#nav-purchases` 표 |
| 정산 | `#nav-reports-header` · `#nav-reports-kpi` |
| 통계 | `#nav-analytics` |
| 세무 | `#nav-tax` |
| M11 지출 | `#nav-expenses-filters` + AI 박스 |
| M12 일일마감 | `#nav-daily-settlement-header` + 기존 상세 |
| M14 알림 | `#nav-notifications` |

---

## 환경 설정 탭 (`/dashboard/settings`) — P0

| 탭 (KO) | 앵커 | 항목 | 매뉴얼 상태 |
|---------|------|------|-------------|
| 상점 정보 | `#settings-store` | 14 | 🟢 v4.2 |
| 주문/할인/포인트 | `#settings-policy` | 5 | 🟢 v4.2 |
| 배송비 설정 | `#settings-delivery` | 5 | 🟢 v4.2 |
| 분류 관리 | `#settings-categories` · `#settings-categories-page` | 7+탭3 | 🟢 v4.3 |
| 프린터/브릿지 | `#settings-printer` | 15 | 🟢 v4.2 |
| 이메일 | `#settings-email` | 5 | 🟢 v4.2 |
| 회원사 수발주 | `#settings-partner` | 6 | 🟢 v4.2 |
| 연동 및 자동화 | `#settings-automation` | — | ⬜ 준비중 |
| 백업 및 초기화 | `#settings-data` | 5 | 🟢 v4.2 |
| 구독·플랜 | `#nav-subscription` | 4+ | 🟢 v4.3 |
| 연동 지도 | `#integrations-hub` | 3표 | 🟢 v4.2 |

---

## Tier P3 — 매출·발주 (v4.5)

| 앵커 | 내용 |
|------|------|
| `#nav-revenue` | 매출 캘린더 zone 표 · `#revenue-engine` 교차 링크 |
| `#nav-revenue-autopilot` … `#nav-revenue-sms` | 3-2장 zone 앵커 |
| `#nav-outsource-dialog` | 외부발주 DLG 5항목 |
| `#nav-partner-order-dialog` | 회원사 수발주 발주 DLG |
| `#nav-branch-transfer-dialog` | 지점 이관 DLG (5-5) |

---

## Tier P4 — 본사 (v4.5)

| 앵커 | 경로 |
|------|------|
| `#hq-hq-dashboard` | `/dashboard/hq` KPI·차트·지점 클릭 |
| `#hq-org-team-fields` | `/dashboard/hq/team` 담당자 추가·삭제 |
| `#hq-transfers-fields` | `/dashboard/hq/transfers` 새로고침·표 |
| `#hq-shared-products` | 공동상품·자재·카테고리 |
| `#hq-material-requests` | 본사 자재 요청 취합 |
| `#hq-branch-expenses` | 지점별 지출 관제탑 |

---

## 매뉴얼 HTML 반영 체크 (v4.5)

- [x] P0 환경설정 + 분류 전용 + 구독
- [x] P1 M01~M06 · M02 · M02m · M03
- [x] PR M13a 사이드·캔버스·툴바·다이얼로그
- [x] PR M13c print-ribbon
- [x] P2 CRM·상품·재고·거래처·매입·정산·통계·세무·지출·일일마감·알림
- [x] P3 매출 캘린더 (`#nav-revenue` + `#revenue-engine` zone)
- [x] P3 발주·이관 다이얼로그 3종
- [x] P4 본사 HQ 화면 레지스트리 6앵커
- [x] P5 누락 5화면 + 얕은 레지스트리 보강 (v4.6)
- [ ] 실제 PNG 스크린샷 (사장님 촬영)

---

## 합계 (테넌트)

| Tier | 화면 수 | HTML 상태 |
|------|---------|-----------|
| P0 | 10 | 🟢 |
| P1 | 8 | 🟢 |
| PR | 2 | 🟢 |
| P2 | 11 | 🟢 |
| P3 | 4 | 🟢 |
| P4 | 6 | 🟢 |

## Tier P5 — v4.6 추가 화면

| 화면 | 경로 | 앵커 | 상태 |
|------|------|------|------|
| 매장 일정 | `/dashboard/schedule` | `#nav-schedule` | 🟢 v4.6 |
| 모바일 픽업 | `/dashboard/mobile/pickup` | `#nav-mobile-pickup` | 🟢 v4.6 |
| 지점 이관 내역 | `/dashboard/orders/transfers` | `#nav-orders-transfers` | 🟢 v4.6 |
| 회원사 수발주 내역 | `/dashboard/orders/partner-orders` | `#nav-partner-orders-page` | 🟢 v4.6 |
| 본사 게시판 | `/dashboard/org-board` | `#nav-org-board` | 🟢 v4.6 |

## v4.6 레지스트리 보강

| 화면 | 앵커 | 비고 |
|------|------|------|
| 빠른 POS | `#nav-pos-quick-header` … | 3존 풀 표 |
| 정산 보고서 | `#nav-reports-kpi` | KPI·스텁 표기 |
| 통계 | `#nav-analytics-header` … | 컨트롤+차트 |
| 세무 | `#nav-tax-header` … | 도우미+KPI |

- [x] P5 누락 5화면
- [x] POS·세무·통계·정산 깊이 보강
- [x] 사이드바·HQ 링크·S→M 📖 링크
- [ ] 실제 PNG 스크린샷 (사장님 촬영)
