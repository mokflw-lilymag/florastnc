# FloXync SaaS: 플랫폼(앱 회사) 설정 vs 사용자(매장·테넌트) 설정 가이드

이 문서는 **현재 저장소 코드 기준**으로, 누가 무엇을 설정하는지, 데이터가 어디에 저장되는지, 화면·권한·플랜 제약을 **운영·온보딩·개발** 관점에서 정리합니다.

---

## 1. 용어와 역할

| 용어 | 의미 (코드 기준) |
|------|------------------|
| **플랫폼 관리자 / 슈퍼** | `profiles.role === 'super_admin'` 이거나, 아래 **플랫폼 슈퍼 이메일** 목록에 포함된 로그인 사용자. 레이아웃·API에서 `effectiveIsSuperAdmin()`으로 판별합니다. |
| **플랫폼 슈퍼 이메일** | DB 역할과 무관하게 앱에서 슈퍼로 취급하는 이메일. 코드: `src/lib/platform-super-emails.ts`의 `PLATFORM_SUPER_EMAILS`. |
| **테넌트(매장)** | `tenants` 행 하나. `profiles.tenant_id`로 직원 계정이 매장에 묶입니다. |
| **조직(HQ) 사용자** | `organization_members`에 한 건 이상 있는 사용자. `tenant_id`가 없을 수 있으며(본사 전용 계정), 이 경우 사이드바는 본사 메뉴 위주로 제한될 수 있습니다. |
| **지점 업무 컨텍스트** | `profiles.org_work_tenant_id`가 설정되면, 본사 계정이 특정 지점 테넌트의 업무 모드로 동작합니다. |

**슈퍼 판별 구현** (서버·클라이언트 공통 개념):

```8:12:src/lib/auth-api-guards.ts
export function effectiveIsSuperAdmin(profile: { role?: string } | null, email: string | undefined): boolean {
  if (profile?.role === "super_admin") return true;
  if (isPlatformSuperEmail(email)) return true;
  return false;
}
```

**대시보드 레이아웃**에서는 위 함수로 `isSuperAdmin`을 계산합니다 (`src/app/dashboard/layout.tsx`).

---

## 2. 사이드바·내비게이션: 누구에게 어떤 메뉴가 보이나

`src/components/layout/sidebar.tsx` 기준:

- **`isSuperAdmin === true`**: **관리자 전용 `adminGroups`만** 표시됩니다. 일반 매장 메뉴(주문, 상품 등)는 사이드바에 나오지 않습니다.
- **슈퍼가 아니고 `hqMenuOnly`**: 본사만 연결된 경우 등으로 **`hqGroup`(본사 메뉴)** 만 표시.
- **슈퍼가 아니고 조직 사용자(`isOrgUser`)**: **`hqGroup` + 테넌트 메뉴** (`tenantNavFiltered`).
- **그 외 일반 매장 사용자**: **`tenantNavFiltered`** 만.

테넌트 링크 일부는 **구독 플랜**에 따라 필터됩니다 (`filterTenantLink`: `tier`에 `pro` / `erp_only` / `ribbon_only` 등).

**요약**: 플랫폼 운영자는 슈퍼 계정으로 로그인했을 때 **항상 “운영 콘솔” 네비**를 보고, 매장 직원은 **매장 업무** 네비를 봅니다.

---

## 3. 플랫폼(앱 회사) 관리자가 다루는 것

아래는 **의도상 플랫폼 측**에서 관리하는 영역입니다. 대부분 **슈퍼 전용 UI**이거나, URL로 열어도 **RLS·API에서 막히는** 구성입니다.

### 3.1 슈퍼 전용 화면 (`AccessDenied` 또는 동등한 차단)

| 경로 | 내용 | 비고 |
|------|------|------|
| `/dashboard/system-settings` | “글로벌/보안/알림/감사” 탭 UI | **현재는 데모성 폼**에 가깝고, 저장 로직·DB 연동은 구현되어 있지 않습니다 (`src/app/dashboard/system-settings/page.tsx`). |
| `/dashboard/tenants` | 테넌트 생성, 구독 플랜·기간·상태 수정 | `tenants` 테이블 직접 클라이언트 insert/update + 목록은 `/api/admin/tenants` (서비스 롤) |
| `/dashboard/admin/tenants` | 테넌트 현황(글로벌 관리 그룹) | 슈퍼만 |
| `/dashboard/admin/organizations` | 테넌트 ↔ 조직(`organization_id`) 연결 | 슈퍼만 |
| `/dashboard/admin/billing` | 구독/결제 관리(관리자) | 슈퍼만 |
| `/dashboard/billing-admin` | 별도 빌링 관리 UI | 슈퍼만 |
| `/dashboard/admin/regional-keys` | 국가별 연동 API 키 → `platform_config` | 슈퍼만 |
| `/dashboard/admin/regional-keys/guide` | API 키 발급 가이드(읽기 전용) | URL 접근 가능 여부는 RLS·정책에 따름; 운영상 슈퍼 문서로 취급 권장 |
| `/dashboard/admin/regional-demand` | 연동 수요 분석, `platform_config` 기록 등 | 슈퍼만 |
| `/dashboard/admin/translations` | 번역 관리 | 슈퍼만 |
| `/dashboard/admin/tenant-master-seed` | 마스터 시드(대량 데이터) | 슈퍼만 |
| `/dashboard/announcements` | 공지 UI(목업 카드 중심) | 슈퍼만 |
| `/dashboard/admin/design-templates` | 디자인 템플릿 | 슈퍼가 아니면 리다이렉트 처리 (`useEffect` + 렌더 가드) |

**글로벌 관리** 사이드바 그룹(연동 수요, API 키, 테넌트 현황, 구독/결제, 번역)은 위와 동일하게 **슈퍼 네비 안**에만 노출됩니다.

### 3.2 슈퍼 메뉴에 있으나 “페이지 자체”는 전역 차단이 약한 경우

| 경로 | 저장 대상 | 주의 |
|------|-----------|------|
| `/dashboard/marketing/admin` | `platform_config` (key-value) | 컴포넌트에 `AccessDenied`가 없습니다. **RLS가 허용하지 않으면** 저장 시 토스트로 실패 안내 (`src/app/dashboard/marketing/admin/page.tsx`). 운영 정책상 **슈퍼만** 사용하도록 URL·권한을 제한하는 것이 안전합니다. |
| `/dashboard/admin/marketing` | `platform_config` (Meta/TikTok/Google/Naver OAuth, n8n 웹훅 등) | 사이드바 기본 링크는 `/dashboard/marketing/admin` 쪽입니다. 이 경로는 **직접 URL**로 들어올 수 있으므로, Supabase **RLS·정책**으로 쓰기를 슈퍼로 한정하는 것을 권장합니다. |
| `/dashboard/admin/staff` | `profiles`, `hq_roles` 등 | 슈퍼 전용 `AccessDenied`는 없고, **로그인 사용자의 `tenant_id` 기준**으로 본사(HQ) 직원 목록을 불러옵니다. “플랫폼 전체 스태프”가 아니라 **특정 테넌트(본사 테넌트) 소속 프로필** 관리에 가깝습니다. 운영 시 어떤 계정이 이 페이지를 써야 하는지 정해야 합니다. |
| `/dashboard/admin/checklist` | 체크리스트 데이터 | `super_admin`이 아니면 일부 항목이 필터됩니다 (`src/app/dashboard/admin/checklist/page.tsx`). |
| `/dashboard/admin/faq`, `/dashboard/admin/manual` | 안내용 UI | 별도 `AccessDenied` 없음. **메뉴는 슈퍼 사이드바에만** 있으므로 실사용은 슈퍼 중심이 됩니다. |

### 3.3 플랫폼 전역 데이터: `platform_config`

**키-값 테이블**으로, 국가별 API 키·마케팅 연동·AI/오케스트레이터가 읽는 설정 등이 여기 쌓입니다.

- 쓰기 UI 예: `regional-keys`, `regional-demand`, `marketing/admin`, `admin/marketing`
- 읽기 예: `src/lib/ai/autonomous-orchestrator.ts` 등

**운영 체크리스트**: 슈퍼가 아닌 역할에 대해 `SELECT`/`INSERT`/`UPDATE` RLS가 어떻게 열려 있는지 Supabase 대시보드에서 반드시 확인하세요.

### 3.4 플랫폼 API·서비스 롤

| API | 목적 |
|-----|------|
| `GET /api/admin/tenants` | 테넌트 목록 + 프로필 이메일 병합. **`effectiveIsSuperAdmin`이 아니면 403**. 조회는 **서비스 롤** (`createAdminClient`)로 수행해 RLS 한계를 우회합니다 (`src/app/api/admin/tenants/route.ts` 주석 참고). |

### 3.5 코드에 박힌 “플랫폼 운영” 상수

- **플랫폼 슈퍼 이메일**: `src/lib/platform-super-emails.ts` — 배포 전 운영 이메일 목록을 정리해야 합니다.
- **리본 프린터 관리자**: `src/app/dashboard/printer/page.tsx` 에 하드코딩된 이메일 + `super_admin` 이 `isAdmin` 경로에 사용됩니다. 매장이 아닌 **플랫폼 측 프린터 실험/관리** 성격입니다.

---

## 4. 사용자(매장·테넌트)가 다루는 것

### 4.1 테넌트별 설정: `system_settings`

`src/hooks/use-settings.ts`가 **현재 로그인 사용자의 `tenant_id`**로 다음 행을 읽고 씁니다.

| `id` (행 식별) | `tenant_id` | 내용 |
|----------------|---------------|------|
| `settings_{tenant_id}` 또는 레거시 `general` | 해당 테넌트 | 매장 일반 설정 JSON (`SystemSettings`: 대표자, 사업자번호, 배송비, 갤러리, 카카오, 구글시트, 세금, 통화, 국가, 대시보드 티커, 주문 알림음 등) |
| `product_categories` | 해당 테넌트 | 상품 카테고리 트리 |
| `material_categories` | 해당 테넌트 | 자재 카테고리 |
| `expense_categories` | 해당 테넌트 | 지출 카테고리 |

**매장 설정 화면**: `/dashboard/settings` 및 하위(예: `/dashboard/settings/pos`).  
구현은 `src/app/dashboard/settings/page.tsx`와 `components/` 아래 카드들(배송, POS, 주문 정책, 자동화, 몰 연동, **국가별 연동 패널** 등)로 나뉩니다.

**중요**: 설정 화면의 **국가별 연동(Regional)** 은 UI상 매장에서 보이지만, **실제 “플랫폼에 등록된 키”를 참조**하는 패턴이 많습니다. 키 입력은 슈퍼 화면(`regional-keys`)에서 하고, 매장에서는 **연동 사용·매핑**만 한다고 이해하면 됩니다. 자세한 발급 절차·**공통(Meta·Google) vs 국가별 `regional_key_*` vs 매장 `shop_integrations`** 구분은 `docs/regional_api_key_issuance_guide.md` 상단 표를 참고하세요.

### 4.2 테넌트 메타: `tenants` (매장이 일부 수정 가능한 필드)

`settings/page.tsx` 내에서 `tenants`를 `update`하는 로직이 있습니다(로고 URL, 매장명 등 **브랜딩·노출** 관련).  
반면 **플랜·구독 종료일·상태(suspended)** 는 슈퍼 화면(`/dashboard/tenants` 등)에서 조정되는 것이 일반적입니다.

### 4.3 구독·결제(매장 관점)

- **`/dashboard/subscription`**: 토스 결제 SDK 로드, 플랜 선택 등 **매장이 스스로 결제**하는 UX (`src/app/dashboard/subscription/page.tsx`).
- 플랫폼이 직접 금액을 조정하거나 테넌트 레코드를 만지는 흐름은 **3.1의 관리자 화면** 쪽에 가깝습니다.

### 4.4 플랜(`tenants.plan`)에 따른 기능 게이트

예시 (코드 패턴):

- **주문·상품·고객 등 ERP 라인**: `pro` 또는 `erp_only`가 아니면 `AccessDenied requiredTier="ERP"` (`orders`, `products`, `customers` 페이지 등).
- **리본 프린터·디자인 스튜디오**: `pro` 또는 `ribbon_only` 등 (`printer` 페이지).

슈퍼는 레이아웃에서 **`effectivePlan`을 `pro`처럼** 취급하는 분기가 있어, 기능 제한 UI를 피하도록 되어 있습니다 (`dashboard/layout.tsx`의 `effectivePlan`).

### 4.5 조직(HQ) 기능 (매장이 아니라 “본사·다매장”)

조직에 속한 사용자는 사이드바에 **본사 그룹**이 추가될 수 있습니다 (`hqGroup`: 공유 상품, 지점 경비, 자재 요청, 조직 게시판 등).  
데이터 접근은 `organization_members`, `tenants.organization_id`, API 라우트 `src/app/api/hq/*` 등으로 이어집니다.

**경계**: “본사가 여러 지점을 묶는 정책·카탈로그”는 **조직 관리자(org_admin)** 와 **플랫폼 슈퍼**의 역할이 겹칠 수 있습니다. 테넌트를 어느 조직에 붙일지는 슈퍼 화면 `admin/organizations`에서 다룹니다.

---

## 5. 한눈에 보는 분류표

| 구분 | 주 담당 | 주 저장소 / API | 대표 UI |
|------|-----------|-----------------|--------|
| 국가별 외부 API 키·글로벌 연동 기본값 | 플랫폼 | `platform_config` | `/dashboard/admin/regional-keys`, `marketing/admin` |
| 테넌트 생성·플랜·정지·구독 기간 | 플랫폼 | `tenants`, `/api/admin/tenants` | `/dashboard/tenants`, `/dashboard/admin/tenants` |
| 조직 ↔ 매장 소속 | 플랫폼 | `tenants.organization_id` | `/dashboard/admin/organizations` |
| 번역·시드·빌링 대시보드(관리자) | 플랫폼 | DB 여러 곳 + 관리 API | `admin/translations`, `tenant-master-seed`, `admin/billing` |
| 매장 업무 설정·카테고리·POS 등 | 매장(테넌트) | `system_settings`, 일부 `tenants` | `/dashboard/settings`, `settings/pos` |
| 내 구독 결제 | 매장 | 결제 API + `tenants` 갱신(서버) | `/dashboard/subscription` |
| 본사·지점 운영 | 조직/지점 역할 | `hq/*` API, `organization_members` | `/dashboard/hq/*`, `org-board`, `material-requests` |

---

## 6. 온보딩·계정 이슈 (레이아웃 기준)

`src/app/dashboard/layout.tsx`:

- **슈퍼가 아니고**, `profiles.tenant_id`도 없고, **조직 멤버도 아니면** → **`/onboarding`으로 리다이렉트**됩니다.
- **구독 만료·정지**는 `subscription_end`, `status`로 판단하며, **슈퍼·본사전용(org only) 모드** 등에서는 게이트 적용이 달라집니다 (`applySubscriptionGate`).

---

## 7. 보안·운영 권장 사항

1. **`platform_config` RLS**: 마케팅 관리 페이지처럼 UI 가드가 약한 경로가 있으므로, **쓰기는 슈퍼(또는 서비스 롤 전용)** 으로 제한하는 정책이 사실상 필수입니다.
2. **`PLATFORM_SUPER_EMAILS`**: DB `role`을 바꾸지 않아도 슈퍼 권한이 생깁니다. **비밀 관리·최소 인원·감사**가 필요합니다.
3. **`system_settings` RLS**: 테넌트 A가 테넌트 B의 설정을 읽지 못해야 합니다. 정책은 Supabase에서 검증하세요.
4. **서비스 롤 키**: `/api/admin/tenants`처럼 서버에서만 사용하고, 클라이언트에 노출되면 안 됩니다.
5. **`system-settings` 페이지**: UI만 있고 저장이 없을 수 있으므로, “플랫폼 글로벌 설정”을 실제로 하려면 **추가 구현 또는 Supabase 직접 편집**이 필요합니다.

---

## 8. 관련 문서·코드 인덱스

| 문서 / 파일 | 설명 |
|-------------|------|
| `docs/regional_api_key_issuance_guide.md` | 국가별 API 키 발급 절차 |
| `src/lib/auth-api-guards.ts` | `effectiveIsSuperAdmin`, API 인증 게이트 |
| `src/app/dashboard/layout.tsx` | 슈퍼·조직·구독·사이드바 플래그 |
| `src/components/layout/sidebar.tsx` | 관리자 vs 테넌트 메뉴 구조 |
| `src/hooks/use-settings.ts` | 테넌트별 `system_settings` |
| `src/app/dashboard/settings/page.tsx` | 매장 설정 UI 본체 |

---

## 9. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-05-13 | 초안 작성 (코드베이스 정적 분석 기준) |

문서와 실제 Supabase RLS·정책이 어긋나면 **정책 쪽이 우선**입니다. 정책을 바꾼 뒤에는 이 문서의 “주의” 절을 함께 업데이트하세요.
