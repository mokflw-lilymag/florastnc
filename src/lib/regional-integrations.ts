/**
 * regional-integrations.ts
 *
 * 국가별 지원 앱(배달/메신저/쇼핑몰) 정의.
 * 설정 페이지에서 country 를 읽어 해당 나라의 앱 카드만 렌더링하는 데 사용.
 *
 * status:
 *   "active"   - API 연동 완료, 실제 사용 가능
 *   "coming_soon" - UI 카드는 보이지만 "준비 중" 뱃지 + 알림 신청 팝업
 */

export type IntegrationStatus = "active" | "coming_soon";

export type RegionalApp = {
  /** 고유 플랫폼 slug (DB shop_integrations.platform 과 일치) */
  platform: string;
  /** 화면에 표시되는 브랜드명 */
  label: string;
  /** 태그라인 (한 줄 설명) */
  description: string;
  /** Lucide 아이콘 이름 또는 커스텀 색상 어두우면 배경색 */
  iconBg: string;
  /** 아이콘 텍스트(약자) */
  iconText: string;
  /** 링 색상 (Tailwind ring class) */
  ringColor: string;
  status: IntegrationStatus;
};

export type RegionalIntegrationConfig = {
  /** 배달 대행 앱 */
  delivery: RegionalApp[];
  /** 메신저 / 알림 앱 */
  messaging: RegionalApp[];
  /** 쇼핑몰 / 마켓플레이스 */
  ecommerce: RegionalApp[];
};

// ─────────────────────────────────────────────────────────
// 국가별 설정 맵
// ─────────────────────────────────────────────────────────

const INTEGRATIONS: Record<string, RegionalIntegrationConfig> = {

  // ── 🇰🇷 대한민국 ──────────────────────────────────────
  KR: {
    delivery: [
      {
        platform: "kakao_t",
        label: "카카오 T",
        description: "카카오T 파트너스 API를 통한 자동 배차",
        iconBg: "#FEE500",
        iconText: "T",
        ringColor: "ring-yellow-400",
        status: "active",
      },
      {
        platform: "vroong",
        label: "부릉 (Vroong)",
        description: "메쉬코리아 부릉 API 연동",
        iconBg: "#EF4444",
        iconText: "V",
        ringColor: "ring-red-400",
        status: "coming_soon",
      },
      {
        platform: "barogo",
        label: "바로고",
        description: "바로고 오토 배차 API",
        iconBg: "#3B82F6",
        iconText: "B",
        ringColor: "ring-blue-400",
        status: "coming_soon",
      },
    ],
    messaging: [
      {
        platform: "kakao_alimtalk",
        label: "카카오 알림톡",
        description: "카카오 비즈메시지 API 주문 자동 알림",
        iconBg: "#FEE500",
        iconText: "K",
        ringColor: "ring-yellow-400",
        status: "active",
      },
    ],
    ecommerce: [
      {
        platform: "naver_commerce",
        label: "네이버 스마트스토어",
        description: "네이버 커머스 API 주문 자동 수집",
        iconBg: "#03C75A",
        iconText: "N",
        ringColor: "ring-green-500",
        status: "active",
      },
      {
        platform: "cafe24",
        label: "카페24",
        description: "카페24 OAuth 연동 · 주문 동기화",
        iconBg: "#1E293B",
        iconText: "C",
        ringColor: "ring-slate-600",
        status: "active",
      },
    ],
  },

  // ── 🇻🇳 베트남 ────────────────────────────────────────
  VN: {
    delivery: [
      {
        platform: "grab_express_vn",
        label: "GrabExpress",
        description: "Grab Delivery API 연동",
        iconBg: "#00B14F",
        iconText: "G",
        ringColor: "ring-green-500",
        status: "coming_soon",
      },
      {
        platform: "ahamove_vn",
        label: "Ahamove",
        description: "베트남 No.1 퀵커머스 API",
        iconBg: "#F97316",
        iconText: "A",
        ringColor: "ring-orange-400",
        status: "coming_soon",
      },
    ],
    messaging: [
      {
        platform: "zalo_zns",
        label: "Zalo ZNS",
        description: "Zalo 공식 알림 API (Zalo Notification Service)",
        iconBg: "#0068FF",
        iconText: "Z",
        ringColor: "ring-blue-500",
        status: "coming_soon",
      },
      {
        platform: "whatsapp_business",
        label: "WhatsApp Business",
        description: "Meta WhatsApp Business API",
        iconBg: "#25D366",
        iconText: "W",
        ringColor: "ring-green-400",
        status: "coming_soon",
      },
    ],
    ecommerce: [
      {
        platform: "shopee_vn",
        label: "Shopee",
        description: "Shopee Open Platform API 주문 수집",
        iconBg: "#EE4D2D",
        iconText: "S",
        ringColor: "ring-orange-500",
        status: "coming_soon",
      },
      {
        platform: "lazada_vn",
        label: "Lazada",
        description: "Lazada Open Platform API",
        iconBg: "#0F146D",
        iconText: "L",
        ringColor: "ring-indigo-600",
        status: "coming_soon",
      },
      {
        platform: "tiktok_shop_vn",
        label: "TikTok Shop",
        description: "TikTok Shop API 주문 자동 수집",
        iconBg: "#010101",
        iconText: "TT",
        ringColor: "ring-slate-800",
        status: "coming_soon",
      },
    ],
  },

  // ── 🇯🇵 일본 ──────────────────────────────────────────
  JP: {
    delivery: [
      {
        platform: "uber_direct_jp",
        label: "Uber Direct",
        description: "Uber Direct Japan API",
        iconBg: "#000000",
        iconText: "U",
        ringColor: "ring-slate-800",
        status: "coming_soon",
      },
      {
        platform: "wolt_jp",
        label: "Wolt Drive",
        description: "Wolt Drive (일본) 배달 API",
        iconBg: "#009DE0",
        iconText: "W",
        ringColor: "ring-cyan-500",
        status: "coming_soon",
      },
    ],
    messaging: [
      {
        platform: "line_jp",
        label: "LINE 메시지",
        description: "LINE Messaging API – 주문 알림",
        iconBg: "#06C755",
        iconText: "L",
        ringColor: "ring-green-500",
        status: "coming_soon",
      },
    ],
    ecommerce: [
      {
        platform: "shopify_jp",
        label: "Shopify",
        description: "Shopify Admin REST API",
        iconBg: "#96BF48",
        iconText: "S",
        ringColor: "ring-lime-500",
        status: "coming_soon",
      },
      {
        platform: "base_jp",
        label: "BASE",
        description: "BASE(일본) API 연동",
        iconBg: "#FF4F4F",
        iconText: "B",
        ringColor: "ring-red-400",
        status: "coming_soon",
      },
    ],
  },

  // ── 🇮🇩 인도네시아 ────────────────────────────────────
  ID: {
    delivery: [
      {
        platform: "gosend_id",
        label: "GoSend (Gojek)",
        description: "Gojek GoSend API – 인도네시아 No.1",
        iconBg: "#00AA13",
        iconText: "G",
        ringColor: "ring-green-500",
        status: "coming_soon",
      },
      {
        platform: "ahamove_id",
        label: "Ahamove",
        description: "Ahamove 퀵커머스 API",
        iconBg: "#F97316",
        iconText: "A",
        ringColor: "ring-orange-400",
        status: "coming_soon",
      },
      {
        platform: "grab_express_id",
        label: "GrabExpress",
        description: "Grab Delivery API (인도네시아)",
        iconBg: "#00B14F",
        iconText: "Gr",
        ringColor: "ring-green-400",
        status: "coming_soon",
      },
    ],
    messaging: [
      {
        platform: "whatsapp_business",
        label: "WhatsApp Business",
        description: "Meta WhatsApp Business API – 인니 필수 채널",
        iconBg: "#25D366",
        iconText: "W",
        ringColor: "ring-green-400",
        status: "coming_soon",
      },
    ],
    ecommerce: [
      {
        platform: "shopee_id",
        label: "Shopee",
        description: "Shopee Indonesia Open Platform",
        iconBg: "#EE4D2D",
        iconText: "S",
        ringColor: "ring-orange-500",
        status: "coming_soon",
      },
      {
        platform: "tokopedia_id",
        label: "Tokopedia",
        description: "Tokopedia Open API (인도네시아 최대 마켓)",
        iconBg: "#42B549",
        iconText: "T",
        ringColor: "ring-green-500",
        status: "coming_soon",
      },
      {
        platform: "lazada_id",
        label: "Lazada",
        description: "Lazada Indonesia Open Platform",
        iconBg: "#0F146D",
        iconText: "L",
        ringColor: "ring-indigo-600",
        status: "coming_soon",
      },
    ],
  },

  // ── 🇲🇾 말레이시아 ────────────────────────────────────
  MY: {
    delivery: [
      {
        platform: "grab_express_my",
        label: "Grab Express",
        description: "Grab Malaysia Delivery API",
        iconBg: "#00B14F",
        iconText: "G",
        ringColor: "ring-green-500",
        status: "coming_soon",
      },
      {
        platform: "lalamove_my",
        label: "Lalamove",
        description: "Lalamove Malaysia API",
        iconBg: "#FF6600",
        iconText: "L",
        ringColor: "ring-orange-500",
        status: "coming_soon",
      },
    ],
    messaging: [
      {
        platform: "whatsapp_business",
        label: "WhatsApp Business",
        description: "말레이시아 No.1 메신저",
        iconBg: "#25D366",
        iconText: "W",
        ringColor: "ring-green-400",
        status: "coming_soon",
      },
    ],
    ecommerce: [
      {
        platform: "shopee_my",
        label: "Shopee",
        description: "Shopee Malaysia Open Platform",
        iconBg: "#EE4D2D",
        iconText: "S",
        ringColor: "ring-orange-500",
        status: "coming_soon",
      },
      {
        platform: "lazada_my",
        label: "Lazada",
        description: "Lazada Malaysia Open Platform",
        iconBg: "#0F146D",
        iconText: "L",
        ringColor: "ring-indigo-600",
        status: "coming_soon",
      },
    ],
  },

  // ── 🇹🇭 태국 ──────────────────────────────────────────
  TH: {
    delivery: [
      {
        platform: "lineman_th",
        label: "LINE MAN",
        description: "LINE MAN Wongnai API – 태국 1위 퀵배달",
        iconBg: "#06C755",
        iconText: "LM",
        ringColor: "ring-green-500",
        status: "coming_soon",
      },
      {
        platform: "grab_express_th",
        label: "Grab Express",
        description: "Grab Thailand Delivery API",
        iconBg: "#00B14F",
        iconText: "G",
        ringColor: "ring-green-400",
        status: "coming_soon",
      },
      {
        platform: "lalamove_th",
        label: "Lalamove",
        description: "Lalamove Thailand API",
        iconBg: "#FF6600",
        iconText: "L",
        ringColor: "ring-orange-500",
        status: "coming_soon",
      },
    ],
    messaging: [
      {
        platform: "line_th",
        label: "LINE Messaging",
        description: "LINE Messaging API – 태국 필수 채널",
        iconBg: "#06C755",
        iconText: "L",
        ringColor: "ring-green-500",
        status: "coming_soon",
      },
      {
        platform: "whatsapp_business",
        label: "WhatsApp Business",
        description: "Meta WhatsApp Business API",
        iconBg: "#25D366",
        iconText: "W",
        ringColor: "ring-green-400",
        status: "coming_soon",
      },
    ],
    ecommerce: [
      {
        platform: "shopee_th",
        label: "Shopee",
        description: "Shopee Thailand Open Platform",
        iconBg: "#EE4D2D",
        iconText: "S",
        ringColor: "ring-orange-500",
        status: "coming_soon",
      },
      {
        platform: "lazada_th",
        label: "Lazada",
        description: "Lazada Thailand Open Platform",
        iconBg: "#0F146D",
        iconText: "L",
        ringColor: "ring-indigo-600",
        status: "coming_soon",
      },
    ],
  },

  // ── 🇧🇷 브라질 ──────────────────────────────────────────
  BR: {
    delivery: [
      {
        platform: "ifood_br",
        label: "iFood",
        description: "iFood Partner API",
        iconBg: "#EA1D2C",
        iconText: "iF",
        ringColor: "ring-red-500",
        status: "coming_soon",
      },
      {
        platform: "loggi_br",
        label: "Loggi",
        description: "Loggi Delivery API",
        iconBg: "#00A1E4",
        iconText: "L",
        ringColor: "ring-cyan-500",
        status: "coming_soon",
      },
    ],
    messaging: [
      {
        platform: "whatsapp_business",
        label: "WhatsApp Business",
        description: "Meta WhatsApp Business API",
        iconBg: "#25D366",
        iconText: "W",
        ringColor: "ring-green-400",
        status: "coming_soon",
      },
    ],
    ecommerce: [
      {
        platform: "mercadolivre_br",
        label: "Mercado Livre",
        description: "Mercado Livre API",
        iconBg: "#FFE600",
        iconText: "ML",
        ringColor: "ring-yellow-400",
        status: "coming_soon",
      },
      {
        platform: "nuvemshop_br",
        label: "Nuvemshop",
        description: "Nuvemshop API 연동",
        iconBg: "#2D3436",
        iconText: "N",
        ringColor: "ring-gray-800",
        status: "coming_soon",
      },
    ],
  },

  // ── 🇵🇹 포르투갈 ────────────────────────────────────────
  PT: {
    delivery: [
      {
        platform: "glovo_pt",
        label: "Glovo",
        description: "Glovo Delivery API",
        iconBg: "#FFC244",
        iconText: "G",
        ringColor: "ring-yellow-400",
        status: "coming_soon",
      },
      {
        platform: "uber_direct_pt",
        label: "Uber Direct",
        description: "Uber Direct Portugal API",
        iconBg: "#000000",
        iconText: "U",
        ringColor: "ring-slate-800",
        status: "coming_soon",
      },
    ],
    messaging: [
      {
        platform: "whatsapp_business",
        label: "WhatsApp Business",
        description: "Meta WhatsApp Business API",
        iconBg: "#25D366",
        iconText: "W",
        ringColor: "ring-green-400",
        status: "coming_soon",
      },
    ],
    ecommerce: [
      {
        platform: "shopify_pt",
        label: "Shopify",
        description: "Shopify Admin REST API",
        iconBg: "#96BF48",
        iconText: "S",
        ringColor: "ring-lime-500",
        status: "coming_soon",
      },
    ],
  },

  // ── 글로벌 기본 (그 외 나라) ─────────────────────────
  DEFAULT: {
    delivery: [
      {
        platform: "uber_direct",
        label: "Uber Direct",
        description: "Uber Delivery API (글로벌)",
        iconBg: "#000000",
        iconText: "U",
        ringColor: "ring-slate-800",
        status: "coming_soon",
      },
    ],
    messaging: [
      {
        platform: "whatsapp_business",
        label: "WhatsApp Business",
        description: "Meta WhatsApp Business API",
        iconBg: "#25D366",
        iconText: "W",
        ringColor: "ring-green-400",
        status: "coming_soon",
      },
    ],
    ecommerce: [
      {
        platform: "shopify",
        label: "Shopify",
        description: "Shopify Admin REST API",
        iconBg: "#96BF48",
        iconText: "S",
        ringColor: "ring-lime-500",
        status: "coming_soon",
      },
    ],
  },
};

/**
 * 국가 코드에 맞는 연동 앱 목록을 반환.
 * 정의되지 않은 국가는 DEFAULT 반환.
 */
export function getRegionalIntegrations(countryCode: string): RegionalIntegrationConfig {
  return INTEGRATIONS[countryCode] ?? INTEGRATIONS.DEFAULT;
}
