# 매뉴얼 스크린샷 (`docs/manual-screenshots/`)

`floxync-manual.html`은 이 폴더의 **파일 이름 그대로** PNG를 찾습니다.  
브라우저: `http://localhost:3000/docs/manual` (또는 배포 URL `/docs/manual`)

## 올리는 방법 (추천 순서)

0. **SVG 목업** — `settings-05-printer.svg`, `appendix-apps.svg` 등 AI가 넣은 안내 그림은 이미 `/docs/manual`에 표시됩니다.
1. 매뉴얼에서 **회색 상자** 또는 캡션의 `파일명.png` 확인
2. 화면 캡처 후 **그 이름 그대로** 저장
3. 아래 중 하나
   - **직접:** 이 폴더(`docs/manual-screenshots/`)에 파일 복사
   - **Cursor:** 채팅에 PNG 첨부 + “`revenue-01-overview.png` 매뉴얼에 올려줘”
   - **여러 장:** ZIP으로 묶어 첨부 + “매뉴얼 캡처 일괄 올려줘”
4. `/docs/manual` 새로고침 → 회색 상자가 사진으로 바뀌면 완료

> HTML 수정 없이 **파일만 넣으면** 반영됩니다.

## 공통 촬영 규칙

- **1920×1080** 권장, **PNG**
- **라이트 테마**, 실제 고객 전화·주문번호는 가리기
- 파일명은 **소문자·하이픈** 그대로 (대소문자 구분)

---

## 전체 파일 체크리스트

### 우선 (매출·온보딩)

| 파일명 | 촬영 화면 | 경로 |
|--------|-----------|------|
| `revenue-01-overview.png` | Auto-Pilot + 탭 전체 | `/dashboard/revenue` |
| `revenue-02-anniversary-d7.png` | 기념일 D-7 탭 |同上 |
| `revenue-03-post-purchase.png` | 구매 후 D+1/7/30 탭 |同上 |
| `revenue-04-templates.png` | 설정 · 메시지 템플릿 4종 |同上 → 설정 |
| `revenue-05-instagram-connect.png` | Instagram 계정 연결(연결됨) |同上 → SNS |
| `revenue-06-report.png` | 성과 리포트 · Floxync 귀속 매출 |同上 |
| `crm-02-anniversary-form.png` | 기념일 + 추가 · 마케팅 동의 | `/dashboard/customers` |
| `settings-06-automation-solapi.png` | 솔라피·카카오 연동 카드 | 환경설정 → 연동 |

### 일상 운영

| 파일명 | 촬영 화면 | 경로 |
|--------|-----------|------|
| `home-01-dashboard.png` | 업무 홈 카드 + 매출 차트 | `/dashboard` |
| `crm-01-customer-list.png` | 고객 목록 | `/dashboard/customers` |
| `calendar-01-delivery-schedule.png` | 배송·픽업 캘린더 | `/dashboard/delivery` |
| `orders-01-ai-entry.png` | AI 주문 붙여넣기 | 새 주문 |
| `orders-02-detail-annotated.png` | 주문 상세 (버튼 번호 표시 권장) | 주문 목록 |
| `orders-03-photo-notify.png` | 완성 사진 · 알림 버튼 | 주문 상세 |

### 환경설정

| 파일명 | 촬영 화면 |
|--------|-----------|
| `settings-01-store-info.png` | 상점 정보 |
| `settings-02-order-policy.png` | 주문·할인·포인트 |
| `settings-03-delivery-fee.png` | 배송비 |
| `settings-04-categories.png` | 분류 관리 |
| `settings-05-printer.png` | 프린터·Bridge |
| `settings-07-regional.png` | 국가별 연동 카드 |

### 리본 프린터 (`/dashboard/printer`)

| 파일명 | 권장 내용 |
|--------|-----------|
| `ribbon-01-overview.png` | 좌측 패널 + 캔버스 + 하단 툴바 한 화면 |
| `ribbon-02-sidebar-printer.png` | 출력 프린터 + 리본 프리셋 |
| `ribbon-03-floating-toolbar.png` | Templates / Preview / PRINT 바 |

### 카드 디자인 (`/dashboard/design-studio`)

| 파일명 | 권장 내용 |
|--------|-----------|
| `design-01-header-canvas.png` | STUDIO 헤더 + 탭 + 캔버스 |
| `design-02-sidebar-paper.png` | 용지 규격 드롭다운 펼침 |
| `design-03-pdf-print.png` | PDF 미리보기 또는 폼텍 모달 |

### 선택

| 파일명 | 비고 |
|--------|------|
| `pos-future-diagram.png` | POS 비전 다이어그램 (실제 UI 아님) |

---

## 다국어 (추후)

언어별 UI가 다르면 하위 폴더를 쓸 예정입니다.

```
manual-screenshots/ko/   ← 한국어 UI (현재, 루트 = ko)
manual-screenshots/en/
manual-screenshots/ja/
```

지금은 **루트에 한국어 캡처**만 넣으면 됩니다.
