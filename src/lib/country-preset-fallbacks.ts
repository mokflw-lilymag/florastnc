import type { SystemSettings } from "@/hooks/use-settings";
import type { CountryPreset } from "@/lib/country-preset";
import {
  OPERATING_COUNTRIES,
  OPERATING_COUNTRY_BY_CODE,
  type OperatingCountryCode,
  type OperatingRegionId,
} from "@/lib/operating-countries";

type Messenger = NonNullable<SystemSettings["preferredMessenger"]>;

/** 국가별 기본 알림 메신저 */
const MESSENGER_BY_CODE: Record<OperatingCountryCode, Messenger> = {
  KR: "kakaotalk",
  JP: "line",
  CN: "line",
  TW: "line",
  HK: "whatsapp",
  VN: "zalo",
  ID: "whatsapp",
  MY: "whatsapp",
  TH: "line",
  SG: "whatsapp",
  PH: "whatsapp",
  IN: "whatsapp",
  AE: "whatsapp",
  SA: "whatsapp",
  TR: "whatsapp",
  ES: "whatsapp",
  FR: "whatsapp",
  DE: "whatsapp",
  GB: "whatsapp",
  PT: "whatsapp",
  CH: "whatsapp",
  NL: "whatsapp",
  PL: "whatsapp",
  IT: "whatsapp",
  RU: "whatsapp",
  US: "sms",
  CA: "sms",
  BR: "whatsapp",
  MX: "whatsapp",
  AR: "whatsapp",
  CL: "whatsapp",
  AU: "whatsapp",
  NZ: "whatsapp",
  MZ: "whatsapp",
  EG: "whatsapp",
  ZA: "whatsapp",
};

const REGION_DEFAULTS: Record<
  OperatingRegionId,
  {
    locale: string;
    tax: number;
    messenger: Messenger;
    stack: CountryPreset["recommendedStack"];
    carriers: string[];
  }
> = {
  east_asia: {
    locale: "en",
    tax: 10,
    messenger: "line",
    stack: {
      chat: "LINE / WeChat",
      delivery: "로컬 퀵 + 자체배송",
      payment: "카드 / 모바일결제",
      tax: "현지 부가세·소비세",
    },
    carriers: ["로컬 퀵", "자체배송"],
  },
  southeast_asia: {
    locale: "en",
    tax: 10,
    messenger: "whatsapp",
    stack: {
      chat: "WhatsApp / LINE",
      delivery: "Grab / Lalamove + 자체배송",
      payment: "QR / 카드 / 계좌이체",
      tax: "VAT·현지 세금",
    },
    carriers: ["Grab", "Lalamove", "자체배송"],
  },
  south_asia: {
    locale: "en",
    tax: 18,
    messenger: "whatsapp",
    stack: {
      chat: "WhatsApp",
      delivery: "로컬 퀵 + 자체배송",
      payment: "UPI / 카드",
      tax: "GST 체계",
    },
    carriers: ["로컬 퀵", "자체배송"],
  },
  middle_east: {
    locale: "en",
    tax: 5,
    messenger: "whatsapp",
    stack: {
      chat: "WhatsApp",
      delivery: "Careem / Talabat + 자체배송",
      payment: "카드 / Apple Pay",
      tax: "VAT 체계",
    },
    carriers: ["Careem/Talabat", "자체배송"],
  },
  europe: {
    locale: "en",
    tax: 20,
    messenger: "whatsapp",
    stack: {
      chat: "WhatsApp / Instagram",
      delivery: "Glovo / Uber Direct + 자체배송",
      payment: "카드 / SEPA",
      tax: "VAT·IVA 체계",
    },
    carriers: ["Glovo/Uber Direct", "자체배송"],
  },
  americas: {
    locale: "en-US",
    tax: 8,
    messenger: "whatsapp",
    stack: {
      chat: "WhatsApp / SMS",
      delivery: "Uber / DoorDash + 자체배송",
      payment: "카드 / Stripe",
      tax: "Sales tax·IVA",
    },
    carriers: ["Uber/Doordash", "자체배송"],
  },
  oceania: {
    locale: "en-AU",
    tax: 10,
    messenger: "whatsapp",
    stack: {
      chat: "SMS / WhatsApp",
      delivery: "DoorDash / Uber + 자체배송",
      payment: "카드 / PayID",
      tax: "GST 체계",
    },
    carriers: ["DoorDash/Uber", "자체배송"],
  },
  africa: {
    locale: "en",
    tax: 15,
    messenger: "whatsapp",
    stack: {
      chat: "WhatsApp",
      delivery: "로컬 퀵 + 자체배송",
      payment: "카드 / 모바일머니",
      tax: "VAT·현지 세금",
    },
    carriers: ["로컬 퀵", "자체배송"],
  },
};

/** JSON 프리셋이 없는 운영 국가용 — 통화·메신저·배달 권장값 */
const COUNTRY_OVERRIDES: Partial<
  Record<
    OperatingCountryCode,
    {
      locale?: string;
      tax?: number;
      messenger?: Messenger;
      stack?: Partial<CountryPreset["recommendedStack"]>;
      carriers?: string[];
      useKakaoTalk?: boolean;
      autoDeliveryBooking?: boolean;
    }
  >
> = {
  TW: {
    locale: "zh-TW",
    tax: 5,
    messenger: "line",
    stack: { chat: "LINE", delivery: "Uber / 黑貓宅急便 + 자체배송", payment: "카드 / LINE Pay" },
    carriers: ["Uber", "黑貓宅急便", "자체배송"],
  },
  HK: {
    locale: "zh-TW",
    tax: 0,
    messenger: "whatsapp",
    stack: { chat: "WhatsApp", delivery: "Lalamove / Foodpanda + 자체배송", payment: "FPS / 카드 / Octopus" },
    carriers: ["Lalamove", "Foodpanda", "자체배송"],
  },
  PH: {
    locale: "en",
    tax: 12,
    messenger: "whatsapp",
    stack: { chat: "Messenger / Viber / SMS", delivery: "Grab / Lalamove + 자체배송", payment: "GCash / 카드" },
    carriers: ["Grab", "Lalamove", "자체배송"],
    autoDeliveryBooking: true,
  },
  TR: {
    locale: "en",
    tax: 20,
    messenger: "whatsapp",
    stack: { chat: "WhatsApp", delivery: "Yemeksepeti / Getir + 자체배송", payment: "카드 / iyzico" },
    carriers: ["Yemeksepeti", "Getir", "자체배송"],
  },
  PL: {
    locale: "en",
    tax: 23,
    messenger: "whatsapp",
    stack: { chat: "WhatsApp", delivery: "Glovo / InPost + 자체배송", payment: "BLIK / 카드" },
    carriers: ["Glovo", "InPost", "자체배송"],
  },
  CH: {
    locale: "de-DE",
    tax: 8.1,
    messenger: "whatsapp",
    stack: { chat: "WhatsApp", delivery: "DHL / 로컬 퀵 + 자체배송", payment: "카드 / TWINT" },
    carriers: ["DHL", "자체배송"],
  },
  AR: {
    locale: "es-AR",
    tax: 21,
    messenger: "whatsapp",
    stack: { chat: "WhatsApp", delivery: "Rappi / PedidosYa + 자체배송", payment: "Mercado Pago / 카드" },
    carriers: ["Rappi", "PedidosYa", "자체배송"],
  },
  CL: {
    locale: "es-CL",
    tax: 19,
    messenger: "whatsapp",
    stack: { chat: "WhatsApp", delivery: "Rappi / Uber + 자체배송", payment: "카드 / Webpay" },
    carriers: ["Rappi", "Uber", "자체배송"],
  },
  NZ: {
    locale: "en-NZ",
    tax: 15,
    messenger: "whatsapp",
    stack: { chat: "SMS / WhatsApp", delivery: "Uber / 로컬 퀵 + 자체배송", payment: "카드 / POLi" },
    carriers: ["Uber", "자체배송"],
  },
  MZ: {
    locale: "pt-MZ",
    tax: 16,
    messenger: "whatsapp",
    stack: { chat: "WhatsApp", delivery: "로컬 퀵 + 자체배송", payment: "M-Pesa / 카드" },
    carriers: ["로컬 퀵", "자체배송"],
  },
  EG: {
    locale: "ar",
    tax: 14,
    messenger: "whatsapp",
    stack: { chat: "WhatsApp", delivery: "Talabat / 로컬 퀵 + 자체배송", payment: "카드 / Fawry" },
    carriers: ["Talabat", "자체배송"],
  },
  ZA: {
    locale: "en",
    tax: 15,
    messenger: "whatsapp",
    stack: { chat: "WhatsApp", delivery: "Mr D / Uber + 자체배송", payment: "카드 / SnapScan" },
    carriers: ["Mr D", "Uber", "자체배송"],
  },
};

export function getFallbackCountryPreset(countryCode: string): CountryPreset | undefined {
  const row = OPERATING_COUNTRY_BY_CODE[countryCode as OperatingCountryCode];
  if (!row) return undefined;

  const region = REGION_DEFAULTS[row.region];
  const override = COUNTRY_OVERRIDES[row.code];

  return {
    countryCode: row.code,
    localeRecommendation: override?.locale ?? region.locale,
    recommendedStack: {
      ...region.stack,
      ...override?.stack,
    },
    settings: {
      currency: row.defaultCurrency,
      isTaxExempt: false,
      defaultTaxRate: override?.tax ?? region.tax,
      useKakaoTalk: override?.useKakaoTalk ?? row.code === "KR",
      preferredMessenger: override?.messenger ?? MESSENGER_BY_CODE[row.code] ?? region.messenger,
      autoDeliveryBooking: override?.autoDeliveryBooking ?? false,
      deliveryCarriers: override?.carriers ?? region.carriers,
    },
  };
}

/** 운영 국가 코드 전체 (프리셋·연동 점검용) */
export const ALL_OPERATING_COUNTRY_CODES = OPERATING_COUNTRIES.map((c) => c.code);
