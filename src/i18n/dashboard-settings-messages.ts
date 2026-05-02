import type { AppLocale } from "@/i18n/config";
import { toBaseLocale } from "@/i18n/config";

type SettingsMessages = {
  pageTitle: string;
  pageSubtitle: string;
  tabs: {
    store: string;
    orderPayment: string;
    delivery: string;
    categories: string;
    printer: string;
    integrations: string;
    partner: string;
    account: string;
    data: string;
  };
  store: {
    title: string;
    storeName: string;
    representative: string;
    bizNo: string;
    phone: string;
    address: string;
    country: string;
    countryHint: string;
    save: string;
    currencyTitle: string;
    presetTitle: string;
    presetLocale: string;
    presetChat: string;
    presetDelivery: string;
    presetPayment: string;
    presetTax: string;
    presetDiffTitle: string;
    presetNoDiff: string;
    /** Labels for country-preset diff rows (system_settings keys). */
    presetFieldLabels: {
      country: string;
      currency: string;
      isTaxExempt: string;
      defaultTaxRate: string;
      useKakaoTalk: string;
      autoDeliveryBooking: string;
      deliveryCarriers: string;
    };
  };
};

const KO: SettingsMessages = {
  pageTitle: "환경 설정",
  pageSubtitle: "상점 운영 정책 및 데이터 보안을 관리하세요.",
  tabs: {
    store: "상점 정보",
    orderPayment: "주문/할인/포인트",
    delivery: "배송비 설정",
    categories: "분류 관리",
    printer: "프린터/브릿지",
    integrations: "연동 및 자동화",
    partner: "협력사 네트워크",
    account: "멤버십/보안",
    data: "백업 및 초기화",
  },
  store: {
    title: "상점 기본 정보",
    storeName: "화원 이름",
    representative: "대표자",
    bizNo: "사업자 등록번호",
    phone: "연락처",
    address: "주소",
    country: "꽃집 위치(운영 국가)",
    countryHint: "운영 국가 저장 시 통화 기본값이 자동으로 변경됩니다.",
    save: "저장하기",
    currencyTitle: "국가 및 화폐",
    presetTitle: "국가 추천 프리셋",
    presetLocale: "권장 언어",
    presetChat: "메신저",
    presetDelivery: "배송",
    presetPayment: "결제",
    presetTax: "세금",
    presetDiffTitle: "저장 시 적용될 변경 미리보기",
    presetNoDiff: "현재 설정이 이미 프리셋과 유사하여 큰 변경이 없습니다.",
    presetFieldLabels: {
      country: "운영 국가",
      currency: "통화",
      isTaxExempt: "면세 여부",
      defaultTaxRate: "기본 세율",
      useKakaoTalk: "카카오톡 연동",
      autoDeliveryBooking: "자동 배송 접수",
      deliveryCarriers: "배송사 기본값",
    },
  },
};

const EN: SettingsMessages = {
  pageTitle: "Settings",
  pageSubtitle: "Manage store policies and data security.",
  tabs: {
    store: "Store Info",
    orderPayment: "Order/Discount/Points",
    delivery: "Delivery Fees",
    categories: "Categories",
    printer: "Printer/Bridge",
    integrations: "Integrations & Automation",
    partner: "Partner Network",
    account: "Membership/Security",
    data: "Backup & Reset",
  },
  store: {
    title: "Store Basic Information",
    storeName: "Store Name",
    representative: "Representative",
    bizNo: "Business Number",
    phone: "Contact",
    address: "Address",
    country: "Operating Country",
    countryHint: "Saving country will automatically update the default currency.",
    save: "Save",
    currencyTitle: "Country & Currency",
    presetTitle: "Country Preset",
    presetLocale: "Recommended Language",
    presetChat: "Chat",
    presetDelivery: "Delivery",
    presetPayment: "Payment",
    presetTax: "Tax",
    presetDiffTitle: "Changes that will be applied",
    presetNoDiff: "Current settings already match this preset closely.",
    presetFieldLabels: {
      country: "Operating country",
      currency: "Currency",
      isTaxExempt: "Tax exempt",
      defaultTaxRate: "Default tax rate",
      useKakaoTalk: "KakaoTalk integration",
      autoDeliveryBooking: "Auto delivery booking",
      deliveryCarriers: "Default delivery carriers",
    },
  },
};

const BASE_MESSAGES: Record<string, SettingsMessages> = {
  ko: KO,
  en: EN,
  vi: EN,
  zh: EN,
  ja: EN,
  es: EN,
  pt: EN,
  fr: EN,
  de: EN,
  ru: EN,
};

export function getDashboardSettingsMessages(locale: AppLocale): SettingsMessages {
  const base = toBaseLocale(locale);
  return BASE_MESSAGES[base] ?? EN;
}
