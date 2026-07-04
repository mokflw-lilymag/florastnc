# 1. 문서 매뉴얼 제작 계획

> **구조 설계 (정본):** [MANUAL-ARCHITECTURE-v3.md](./MANUAL-ARCHITECTURE-v3.md) — **전체 메뉴 백과 + 상황별 가이드**  
> **v2 반영 내역:** [REVISION-PLAN.md](./REVISION-PLAN.md)

## 0) 두 가지 쓰는 법

| 종류 | 앵커 | 예시 |
|------|------|------|
| **상황별** (급할 때) | `#sit-*` | 영수증 인쇄, 리본 설정, 배송비, 빠른 POS, 배송 마무리 |
| **메뉴별** (찾아보기) | `#nav-*`, `#settings-*` | 주문 목록, 고객 CRM, 환경 설정 탭 |

## 1) 방법 (How)

### 작성 원칙
- **독자**: 꽃집 사장님 + 신입 직원 (ERP 용어 최소화)
- **톤**: 옆에서 알려주는 사수 (`skills/07_manual_expert_smile_agent.md` 준수)
- **구조**: 기능당 **6블록** — 개요 / 화면 구성 / 이용 순서 / 입력 필드 / 팁·주의 / FAQ
- **UI 표기**: 앱과 100% 동일 — `[저장]`, `주문 → 신규 주문`
- **사실 확인**: 작성 전 해당 `page.tsx`·설정 키·API 확인 (환각 금지)

### 파일 형식
| 단계 | 형식 | 위치 |
|------|------|------|
| 초안 | Markdown | `drafts/NN-slug.md` |
| 검수 | 사장님 코멘트 인라인 | 동일 파일 |
| 배포 | HTML (기존 매뉴얼 스타일) | `src/app/docs/manual` 또는 static HTML |

### 제작 워크플로
```
코드·화면 확인 → AI 초안(drafts) → 사장님 검수 → 스크린샷 삽입 → HTML 변환 → /docs/manual 반영
```

### 스크린샷
- `npm run capture:manual` (추후 스크립트) 또는 Playwright 게스트/데모 계정
- 해상도: PC 1440×900, 모바일 390×844
- 민감정보(전화·실매출) 블러 처리

### 버전 관리
- 문서 상단에 `앱 버전: v0.1.x`, `최종 검수일` 표기
- 메뉴 개편 시 해당 장만 `status: outdated` 표시

---

## 2) 컨텐츠 제목·내용 (목차)

### Tier S — 상황별 가이드 (우선)

| # | 제목 | 앵커 |
|---|------|------|
| S01 | 영수증·주문서 인쇄 (외부 기기 접수 포함) | `#sit-pos-printer` |
| S02 | 리본 프린터 (PC만) | `#sit-ribbon-printer` |
| S03 | 배송비 규칙 설정 | `#sit-delivery-fee` |
| S04 | 빠른 POS 현장 결제 | `#sit-quick-pos` |
| S05 | 픽업·배송 마무리 (실배송비·결제·지출) | `#sit-pickup-delivery` |

초안: `drafts/sit-0N-*.md` → HTML `#sit-*`

### Tier A — 필수 (1~2주 내)

| # | 제목 | 내용 요약 | 앱 경로 |
|---|------|-----------|---------|
| A01 | **시작하기 — 로그인·매장 설정·첫 화면** | 로그인, 언어, 대시보드 읽는 법, 모바일 QR | `/login`, `/dashboard` |
| A02 | **환경설정 — 매장 정보·프린터·PP 브릿지** | 사이트명, 로고, PP ON, install.bat, 프린터 선택 | `/dashboard/settings` |
| A03 | **주문 접수 (PC)** | 신규 주문, 픽업/배달/현장, 결제, 저장 후 인쇄 | `/dashboard/orders/new` |
| A04 | **주문 접수 (모바일)** | 휴대폰 UI, 빠른 입력, 외부 접수와 매장 인쇄 연동 | `/dashboard/mobile`, `/dashboard/orders/new-mobile` |
| A05 | **주문 목록·상태 변경·재출력** | 검색, 상태, 영수증/주문서 재인쇄 | `/dashboard/orders` |
| A06 | **배달·픽업 관리** | 배차, 기사용 인수증, 배달비 | `/dashboard/delivery` |
| A07 | **고객 관리 (CRM)** | 등록, 포인트, 기념일 | `/dashboard/customers` |
| A08 | **상품·카테고리** | 상품 등록, 가격, 이미지 | `/dashboard/products`, `/dashboard/settings/categories` |

### Tier B — 운영 심화 (3~4주)

| # | 제목 | 내용 요약 | 앱 경로 |
|---|------|-----------|---------|
| B01 | **재고·발주·거래처** | 재고 조정, 발주, 입고 | `/dashboard/inventory`, `/dashboard/purchases`, `/dashboard/suppliers` |
| B02 | **경비·간편 경비** | 영수증 첨부, 카테고리 | `/dashboard/expenses` |
| B03 | **리포트·매출** | 일/월 매출, 인식 기준 | `/dashboard/reports` |
| B04 | **리본 프린터** | 문구 입력, 인쇄, 브릿지 ON | `/dashboard/printer` |
| B05 | **일정·스케줄** | 배송 일정 캘린더 | `/dashboard/schedule` |
| B06 | **요금제·구독** | 플랜, 결제, 갱신 | `/dashboard/subscription` |

### Tier C — 본사·다매장 (선택)

| # | 제목 | 내용 요약 |
|---|------|-----------|
| C01 | 본사 대시보드·지점 비교 | `/dashboard/hq` |
| C02 | 지점 간 수발주·정산 | `/dashboard/hq/transfers` |
| C03 | 공통 상품·자재 요청 | shared-products, material-requests |

### Tier D — 부록

| # | 제목 | 내용 |
|---|------|------|
| D01 | PP 브릿지 설치 FAQ | install.bat, 8004, 백신 |
| D02 | 윈도우 앱 vs 웹만 쓰기 | 기능 차이 표 |
| D03 | 용어 사전 | `_shared/glossary.md` 확장 |

---

## 3) AI 요청 템플릿 (사장님 → 에이전트)

```text
docs/content-production/01-document-manual/drafts/A03-new-order-pc.md 초안 작성해줘.
- skills/07_manual_expert_smile_agent.md 준수
- src/app/dashboard/orders/new 실제 필드명 기준
- PP브릿지 자동 인쇄 흐름 포함
```

---

## 4) 검수 체크리스트 (사장님)

- [ ] 메뉴 경로가 내 화면과 같다
- [ ] 버튼 누르면 설명대로 동작한다
- [ ] 신입이 혼자 15분 안에 따라 할 수 있다
- [ ] 프린터/브릿지 없는 매장도 이해할 수 있다 (해당 장은 예외 명시)
