# 매뉴얼 스크린샷 (`docs/manual-screenshots/`)

`floxync-manual.html`(저장소에서는 `docs/floxync-manual.html`)은 `docs/manual-screenshots/` 기준으로 아래 파일명을 찾습니다.  
브라우저에서 매뉴얼을 열 때 **`docs` 폴더를 기준으로 연다**(또는 로컬 서버의 `/docs/...`)면 `manual-screenshots/*.png` 경로가 올바르게 로드됩니다.

## 리본 프린터 (`/dashboard/printer`)

| 파일명 | 권장 내용 |
|--------|-----------|
| `ribbon-01-overview.png` | 좌측 전체 패널 + 가운데 좌우 리본 캔버스 + 하단 둥근 툴바가 한 화면에 들어가게 (1920×1080 권장) |
| `ribbon-02-sidebar-printer.png` | 「출력 프린터」드롭다운·갱신 버튼·Bridge 버전 문구 + 바로 아래 「리본 프리셋」 |
| `ribbon-03-floating-toolbar.png` | 화면 하단 중앙 고정 바: Templates, Preview/Design, 줌 %, PRINT 버튼만 크게 |

**촬영 팁**

- 다크 모드가 아닌 **기본 라이트 테마**에서 찍으면 인쇄용 매뉴얼과 잘 맞습니다.
- 개인정보(이메일·전화)가 보이면 **가짜 계정** 또는 블러 처리 후 저장합니다.

## 카드 디자인 스튜디오 (`/dashboard/design-studio`)

| 파일명 | 권장 내용 |
|--------|-----------|
| `design-01-header-canvas.png` | 상단 PROFESSIONAL STUDIO 바, 앞면/내지 탭, 저장·프린터 버튼 + 캔버스 일부 |
| `design-02-sidebar-paper.png` | 왼쪽 「용지 규격 및 방향」이 펼쳐진 상태에서 프리셋 드롭다운 열림 |
| `design-03-pdf-print.png` | PDF 인쇄 미리보기 창 또는 폼텍 셀 선택 모달 |

**촬영 팁**

- `?orderId=` 로 연 주문이 있으면 메시지 블록이 보여 **설명용으로 좋습니다**. 실제 고객 주문 ID는 캡처에 넣지 마세요.
- 폼텍 설명이 필요하면 URL에 `&target=formtec` 를 붙인 뒤 캡처합니다.

## 자동화 (선택)

저장소 루트에서 개발 서버가 떠 있다면, Playwright 등으로 위 구역만 잘라 저장하는 스크립트를 추가할 수 있습니다. (로그인·테넌트 시드가 필요합니다.)
