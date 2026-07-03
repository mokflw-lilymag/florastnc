# 랜딩 페이지 — 사장님 촬영 가이드

아래 파일을 촬영 후 `public/images/landing/` 폴더에 넣어 주세요.  
파일명을 **정확히** 맞추면 코드 수정 없이 자동 반영됩니다.

## 필수 (웹 캡처로 불가)

| 저장 파일명 | 촬영 내용 | 팁 |
|-------------|-----------|-----|
| `electron-tray.png` | Floxync Desktop 실행 후 **작업 표시줄 트레이 아이콘** + 우클릭 메뉴 | PC 부팅·백그라운드 섹션용 |
| `ribbon-physical.jpg` | **실제 출력된 리본** (보내는 분·축하 문구가 보이게) | 리본 섹션 신뢰도↑ |
| `pos-receipt-print.jpg` | **포스프린터에서 나온 주문서/인수증** 실물 | 원스톱 자동화 섹션 보조 |

## 선택 (있으면 훨씬 좋음)

| 저장 파일명 | 촬영 내용 |
|-------------|-----------|
| `shop-ambience.jpg` | 매장 카운터·꽃 작업대 분위기 (얼굴·전화번호 가리기) |
| `reminder-popup.png` | Windows **픽업/배송 알림 팝업** (Electron) |
| `android-app.jpg` | **네이티브 Android 앱** 화면 (웹 모바일과 다를 때) |

## 이미 자동 캡처됨 (게스트 체험 모드)

`npm run capture:landing` 으로 생성된 파일:

- `dashboard-hero.png` — 대시보드
- `order-new-pc.png` — PC 주문 접수
- `orders-list.png` — 주문 목록
- `expenses.png` — 지출
- `reports.png` — 리포트/정산
- `mobile-order-new.png` — 모바일 주문
- `mobile-dashboard.png` — 모바일 대시보드
- `ribbon-print.png` — 리본 출력 화면

## 로그인이 필요한 경우

실제 매장 데이터가 풍부한 스크린샷이 필요하면 **로그인 후** 알려 주세요.  
그때는 사장님 계정으로 캡처하거나, 샘플 데이터가 채워진 테넌트로 다시 찍겠습니다.
