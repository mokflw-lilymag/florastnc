# Android( Capacitor ) 허브형 카드 메뉴 · 컨텍스트 내비게이션 구현 계획

## 0. 제품 범위 (반영됨)

- **이 앱은 매장·지점 등 일반 사용자(테넌트)용**이다. **슈퍼관리자·플랫폼 관리 업무는 PC 웹만** 사용한다는 전제를 둔다.
- Android WebView에서 **슈퍼관리자로 로그인한 경우**: 하단 `AndroidAppChrome` 비노출, 본문에 **PC 이용 안내 + 로그아웃**만 표시한다 (`DashboardMain` + `AndroidSuperAdminBlock`).
- **일반 PC(`lg`+) 레이아웃·사이드바·기존 대시보드(차트·통계)는 변경하지 않는다.** 분기는 `useIsCapacitorAndroid()` 및 서버에서 전달하는 `isSuperAdmin` 플래그로만 처리한다.

## 1. 목표

- **Android** 에서 메뉴를 **그룹 단위 카드(버튼형)** 로 정리해 한눈에 업무 영역을 구분한다.
- **주문** / **관리(상품·재고)** / **지출(매입·지출)** 세 허브로 묶고, **리본 프린터는 노출하지 않는다** (기존 정책 유지).
- 하위 페이지 상단에 **「메인(허브)으로」** 와 **「같은 그룹 내 바로가기」** 를 두어 이동 비용을 줄인다.
- **카드 디자인** 중심으로 허브를 구성한다.

## 2. 현황 및 구현 매핑

| 영역 | 파일·동작 |
|------|-----------|
| Android 식별 | `useIsCapacitorAndroid()`, `isCapacitorAndroid()` |
| 허브 설정 | `src/lib/android-tenant-nav.ts` — 그룹·prefix·플랜(`tier`) 필터 |
| 허브 UI | `src/components/layout/dashboard-android-hub.tsx` |
| 컨텍스트 바 | `src/components/layout/dashboard-android-context-nav.tsx` — `DashboardMain` 상단 삽입 |
| 슈퍼관리자 차단 | `src/components/layout/android-super-admin-block.tsx` |
| 홈 `/dashboard` | `src/app/dashboard/page.tsx` — Android·비관리자일 때 티커 + 허브만 |
| 하단 탭·더보기 | `src/components/layout/android-app-chrome.tsx` — 구독/환경설정/POS 제거, 매입·거래처 추가, `serverIsSuperAdmin` 시 미렌더 |
| 본문 래퍼 | `src/components/layout/dashboard-main.tsx` — `serverIsSuperAdmin`, 컨텍스트 바 |
| 레이아웃 | `src/app/dashboard/layout.tsx` — `DashboardMain` / `AndroidAppChrome` 에 `isSuperAdmin` 전달 |
| i18n | `androidChrome.hub`, `contextNav`, `superAdminBlock`, `tenant.purchases` / `tenant.suppliers` |
| 모바일 웹 전용 하단바 | `global-quick-nav.tsx` 는 현재 대시보드에 미사용 — 이중 바 문제 없음 |

## 3. 정보 구조 (IA)

### 3.1 허브 그룹과 라우트 매핑

| 그룹 | 카드(액션) | 대상 경로 |
|------|------------|------------|
| **주문** | 새 주문 | `/dashboard/orders/new` |
| | 주문 목록 | `/dashboard/orders` |
| | 배송·픽업 | `/dashboard/delivery` |
| **관리** | 상품 | `/dashboard/products` |
| | 재고 | `/dashboard/inventory` |
| **지출** | 매입 | `/dashboard/purchases` |
| | 지출 | `/dashboard/expenses` |
| | 본사 자재 요청 | `/dashboard/material-requests` |

- **CRM·리포트·세무·마케팅·카드 디자인 등**은 **더보기 시트**에서 진입.
- **플랜**: `sidebar` 와 동일하게 `tier: ["pro","erp_only"]` 가 붙은 링크는 만료/정지 시 비노출.

### 3.2 메인 허브 URL

- **옵션 A 채택**: `/dashboard` 가 Android·일반 사용자에서 **카드 허브**로 동작 (웹·PC는 기존 대시보드 유지).

## 4. UI/UX 명세 요약

- 허브: 섹션 제목 3개 + 2열 카드 그리드, 터치 최소 높이 확보.
- 컨텍스트 바: `/dashboard` 정확히 일치 시 숨김; 주문·관리·지출 prefix 시 **메인으로** + 그룹 내 칩.
- 하단: 홈·주문·배송·고객·더보기 + FAB 새 주문.

## 5. 구현 단계 체크리스트

### Phase 0 — 정리

- [x] `GlobalQuickNav` 미사용 확인, Android 하단은 `AndroidAppChrome` 단일.
- [x] 허브 외 메뉴는 더보기 시트에 배치.

### Phase 1 — 데이터·유틸

- [x] `src/lib/android-tenant-nav.ts` (허브·컨텍스트 prefix·플랜 허용).
- [x] `androidChrome` 문구 확장 (다국어 JSON 반영).

### Phase 2 — 컴포넌트

- [x] `DashboardAndroidHub`
- [x] `DashboardAndroidContextNav`
- [x] `/dashboard/page.tsx` Android 분기

### Phase 3 — 레이아웃 연동

- [x] `DashboardMain` 에 컨텍스트 바 + 슈퍼관리자 Android 차단
- [x] `android-app-chrome.tsx` 더보기 목록 정리
- [x] `layout.tsx` props 연결

### Phase 4 — 품질

- [ ] 실제 단말 WebView 수동 테스트
- [x] `ribbon_only` / 만료·무료 등으로 허브 카드가 전부 숨겨질 때 안내 + 구독 링크 (`DashboardAndroidHub` + `hub.empty*`)
- [x] 하단 세이프 에어리어 유지 (`pb-[calc(7.5rem+env(safe-area-inset-bottom))]`)

## 6. 범위 밖 · 후속

- 배송 **픽업 딥링크** (`?filter=pickup` 등).
- 네이티브 `android/` 프로젝트 변경은 불필요.

## 7. 완료 기준

- [x] Android 앱에서 일반 사용자 `/dashboard` 가 카드형 3그룹 허브로 동작한다.
- [x] 리본이 허브·하단·컨텍스트 바에 없다 (기존 가드 유지).
- [x] 주문·관리·지출 하위에서 **메인으로** 및 **같은 그룹 바로가기**가 동작한다.
- [x] **본사 자재 요청**(`/dashboard/material-requests`)이 지출 그룹 컨텍스트·허브 지출 카드에 포함된다.
- [x] 하단 내비 단일.
- [x] 슈퍼관리자 Android 접속 시 PC 안내 화면만 표시한다.

---

**문서 버전**: 2026-05-13 (구현 1차 반영)  
**관련 문서**: `docs/android_app_addition_plan.md`
