# 국가별 연동 API 키 발급 가이드 (FloXync 슈퍼관리자용)

이 문서는 **플랫폼(`platform_config`)에 저장되는 국가별 연동 키**를 각 공급사 개발자 콘솔에서 발급·등록하는 절차를 정리합니다.  
매장 관리자·운영자는 키 값을 볼 수 없을 수 있으나, **발급 위치와 점검 순서**를 공유해 장애 시 원인 분리에 활용합니다.

---

## 키를 어디에 두나요? (공통 vs 국가 SNS vs 매장)

| 구분 | 누가 설정 | 저장 위치 | 대시보드에서 가는 곳 | 비고 |
|------|-----------|-----------|----------------------|------|
| **공통 · 글로벌** (Meta/Facebook·Instagram, Google 로그인·API, TikTok 개발자 앱, N8N 웹훅 등) | 플랫폼 슈퍼 | `platform_config` (키 이름: `meta_app_id`, `google_client_id` 등 — **`regional_key_` 접두사 없음**) | **`/dashboard/admin/marketing`** (또는 `/dashboard/marketing/admin`) | 여러 나라·여러 매장이 **같은 FloXync 앱**으로 OAuth 할 때 쓰는 **앱 수준** 자격증명에 가깝습니다. |
| **국가별 · 공급사 백엔드용** (카카오T, LINE 채널, Zalo, Grab, Shopee 국가별 파트너 키 등) | 플랫폼 슈퍼 | `platform_config` (`regional_key_*`) | **`/dashboard/admin/regional-keys`** | 코드에 **`COUNTRY_KEY_CONFIGS` 배열로 국가가 고정**되어 있어, 현재 UI에 보이는 나라만 필드가 있습니다. **다른 나라를 쓰려면** 이 배열과 `src/lib/regional-integrations.ts`의 해당 국가 블록을 개발로 추가해야 합니다. |
| **매장별 · 사용자 OAuth** (스마트스토어/카페24 등 **내 가맹점** 클라이언트 ID) | 매장(테넌트) | `shop_integrations` (행 단위: `shop_id` = 테넌트 ID) | **`/dashboard/settings` → 연동** (`MallIntegrationCard` 등) | 플랫폼 마스터 키와 **구분**되는, **각 매장이 자기 몰에 연결**할 때의 자격증명입니다. |
| **매장 일반 설정 안의 카카오 등** | 매장 | `system_settings` (JSON, 테넌트별) | 설정 탭 내 카카오 알림톡·배달 등 | `use-settings` 훅이 `tenant_id`로 읽습니다. |

**왜 “이 외 나라” 탭이 없나요?**  
`국가별 API 키` 화면의 상단 탭은 **운영에서 미리 넣어 둔 6개국(KR·JP·VN·ID·MY·TH) 전용 폼**입니다. 미국·유럽 등은 아직 이 배열에 **필드 정의가 없어서** 탭이 생기지 않습니다. 다만 매장 정보의 **운영 국가** 선택지는 `settings/page.tsx`의 `OPERATING_COUNTRIES`가 더 넓고, **국가별 연동 카드**는 `regional-integrations.ts`에 없는 국가는 `DEFAULT`(Uber Direct·WhatsApp·Shopify 등 “준비 중” 카드)로 떨어집니다. 즉, **“국가 선택”과 “슈퍼용 API 키 폼 탭”은 서로 다른 목록**입니다.

---

## 공통 원칙

1. **국가별 `regional_key_*` 키는 슈퍼관리자만** `대시보드 → 국가별 API 키` 화면에 저장합니다. Meta/Google 등 **글로벌 마케팅 OAuth**는 같은 DB 테이블이지만 **별 화면**에서 저장합니다(위 표 참고).
2. **Client Secret·Access Token·Partner Key** 등은 절대 채팅·이메일 본문에 붙여 넣지 마세요. 저장 후 화면에서도 마스킹된 상태로 다룹니다.
3. 키를 바꾼 뒤에는 **해당 국가 탭에서 저장**을 눌러 `platform_config`에 반영되었는지 확인합니다.
4. 연동 오류 시: (1) 공급사 콘솔에서 키 만료·IP 제한·앱 심사 상태 확인 (2) FloXync에 저장된 필드명이 가이드와 일치하는지 확인 (3) 동일 서비스의 **샌드박스/프로덕션** 환경 혼동 여부 확인.

---

## 🇰🇷 대한민국 (KR)

### 카카오 알림톡 (`kakao_alimtalk_*`)

- **`kakao_alimtalk_api_key`**: REST API 키 (앱 키)
- **`kakao_alimtalk_sender_key`**: 발신 프로필(채널) 키
- **`kakao_alimtalk_pfid`**: 플러스친구 ID (`@채널`)

1. [Kakao Developers](https://developers.kakao.com/) 앱 생성 → **앱 키**에서 REST API 키 확인.  
2. [Kakao 비즈메시지](https://business.kakao.com/) 또는 채널 관리에서 **알림톡 발신 프로필** 등록 후 발신 키·채널 ID 확보.  
3. 비즈니스 인증·템플릿 심사는 카카오 정책에 따릅니다.

### 카카오 T 파트너스 (`kakao_t_partner_*`)

1. [카카오 T 비즈니스](https://business.kakao.com/) 파트너스(또는 배달/모빌리티 B2B 계약 채널)에서 **API Key / Secret** 발급.  
2. 계약 단위로 키가 상이할 수 있으니 **담당 영업/온보딩 문서**를 기준으로 합니다.

### 네이버 커머스 API (`naver_commerce_*`)

1. [스마트스토어센터](https://sell.smartstore.naver.com/) → **설정 → API 관리**에서 애플리케이션 등록.  
2. **Client ID / Client Secret**을 FloXync 필드에 매핑합니다.

---

## 🇯🇵 일본 (JP)

### LINE Messaging API (`line_jp_*`)

- **`line_jp_channel_id`**: 채널 ID  
- **`line_jp_channel_secret`**: 채널 시크릿  
- **`line_jp_channel_token`**: Long-lived channel access token  

1. [LINE Developers](https://developers.line.biz/) 콘솔에서 Provider·Messaging API 채널 생성.  
2. **Channel settings**에서 Channel ID / Secret 확인.  
3. **Messaging API** 탭에서 **Channel access token** 발급(장기 토큰 권장).  
4. Webhook URL·SSL은 FloXync 서버 배포 URL에 맞게 별도 설정합니다.

---

## 🇻🇳 베트남 (VN)

이전에는 **슈퍼관리자용 키 폼**에 Zalo만 있었고, Grab·Ahamove·Be·Shopee 등은 `regional-integrations.ts` 카드만 있었습니다. 지금은 아래 필드까지 `국가별 API 키` 화면에서 저장할 수 있습니다(값은 모두 `regional_key_*`).

### Zalo ZNS (`zalo_zns_*`)

- **`zalo_zns_app_id`**: 앱 ID  
- **`zalo_zns_secret_key`**: Secret  
- **`zalo_zns_oa_id`**: Official Account ID  

1. [Zalo Developers](https://developers.zalo.me/) 앱 생성 → **App ID / Secret** 확인.  
2. Zalo Official Account를 앱과 연결하고 **OA ID**를 확보합니다.  
3. ZNS(템플릿 메시지)는 Zalo 심사·템플릿 등록이 필요합니다.

### GrabExpress 베트남 (`grab_vn_*`)

- **`grab_vn_client_id`**, **`grab_vn_client_secret`**, **`grab_vn_merchant_id`**: Grab for Developers / 비즈 계약에 따라 명칭이 다를 수 있습니다.  
1. [Grab Developer](https://developer.grab.com/)에서 앱·스코프를 생성하고, **샌드박스 vs 프로덕션** 키를 구분합니다.

### Ahamove (`ahamove_vn_*`)

- **`ahamove_vn_api_token`**: 파트너·가맹점 API 토큰  
- **`ahamove_vn_partner_id`**: 콘솔에 파트너 ID가 있을 때만 입력  

1. [Ahamove](https://ahamove.com/) 비즈니스·파트너 포털에서 계약 후 키를 발급받습니다. (공개 문서가 바뀔 수 있으니 최신 개발자 센터 URL을 확인하세요.)

### Be Group (`be_vn_*`)

- **`be_vn_api_key`**, **`be_vn_client_id`**, **`be_vn_client_secret`**: Be for Business 등 **B2B 계약**에 따라 필드 의미가 달라질 수 있습니다.  
1. [Be](https://be.com.vn/) 파트너·비즈니스 담당 채널에서 API 자격 증명을 확보합니다. FloXync 필드명은 일반적인 OAuth·API Key 패턴에 맞춰 두었습니다.

### Shopee Vietnam (`shopee_vn_*`)

- **`shopee_vn_partner_id`**, **`shopee_vn_partner_key`**: Shopee Open Platform과 동일 패턴입니다.  
1. [Shopee Open Platform](https://open.shopee.com/)에서 베트남 샵에 연결된 앱을 등록합니다.

---

## 🇮🇩 인도네시아 (ID)

### GoSend / Gojek (`gosend_*`)

1. [Gojek for Business](https://business.gojek.com/) 또는 개발자 포털(계약 시 제공 URL)에서 **Client ID / Secret**, 가맹점 **Merchant ID** 발급.  
2. 샌드박스와 프로덕션 키가 분리되는 경우가 많습니다.

### WhatsApp Business API (`wa_id_*`)

1. [Meta for Developers](https://developers.facebook.com/)에서 WhatsApp 제품이 포함된 앱 생성.  
2. **WhatsApp Business Account ID**, **Phone number ID**, **시스템 사용자 또는 영구 토큰**을 FloXync에 입력합니다.  
3. 전화번호·비즈니스 인증은 Meta 정책을 따릅니다.

### Shopee Open Platform (`shopee_id_*`)

1. [Shopee Open Platform](https://open.shopee.com/) 가맹점·파트너 등록 후 **Partner ID / Partner Key** 확인.  
2. 국가 코드가 **ID**인지(인도네시아 몰) 콘솔에서 재확인합니다.

---

## 🇲🇾 말레이시아 (MY)

### Grab Express (`grab_my_*`)

1. [Grab Developer](https://developer.grab.com/) 앱 생성 → **Client ID / Secret**.  
2. Grab 파트너 포털에서 **Merchant ID** 확인.

### Shopee Malaysia (`shopee_my_*`)

1. Shopee Open Platform에서 **MY** 몰 기준 Partner ID / Key를 발급받습니다.

---

## 🇹🇭 태국 (TH)

### LINE Messaging API (`line_th_*`)

LINE Developers 절차는 JP와 동일하며, **태국 법인/채널**으로 별도 채널을 만듭니다.

### LINE MAN / Wongnai Partner (`lineman_th_*`)

1. [LINE MAN Partner](https://partner.lineman.me/) (또는 계약 시 안내된 파트너 포털)에서 **API Key**, **Merchant ID**를 발급받습니다.

### Shopee Thailand (`shopee_th_*`)

Shopee Open Platform에서 **TH** 몰 기준 키를 사용합니다.

---

## 장애 시 체크리스트 (매장·운영팀 공유용)

- 해당 국가 탭에서 필수 필드가 **모두 채워졌는지** (배지 `n/m` 확인)  
- 공급사 콘솔에서 **키 만료·회전** 없음  
- **IP 화이트리스트**가 있다면 FloXync 서버 IP 반영 여부  
- 웹훅·콜백 URL이 있다면 **HTTPS·경로** 일치  
- 최근 **플랫폼 저장** 후에도 오류면 Supabase `platform_config`의 `regional_key_*` 행 존재 여부 (슈퍼관리자만 DB 직접 확인 권장)

---

## 문서·화면 링크

- FloXync UI: `/dashboard/admin/regional-keys` (키 입력·저장, 슈퍼관리자)  
- 본 가이드(읽기 전용): `/dashboard/admin/regional-keys/guide` (로그인한 대시보드 사용자 접근 가능)

*콘솔 UI 메뉴 이름은 공급사 업데이트로 바뀔 수 있습니다. 상이할 경우 공급사 공식 문서를 우선합니다.*
