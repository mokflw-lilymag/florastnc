import { pickUiText } from "@/i18n/pick-ui-text";
import type { PublicPaidPlanId } from "@/lib/pricing/public-pricing";
import {
  publicFreePriceLabel,
  publicMonthlyPriceLabel,
  publicAnnualTotal,
} from "@/lib/pricing/public-pricing";
import { getActiveDiscountRate, type GlobalDiscountSettings } from "@/lib/subscription/discount-helper";

export type PublicPricingFeature = {
  text: string;
  strikethrough?: boolean;
  bold?: boolean;
  warn?: boolean;
};

export type PublicPricingPlanCard = {
  id: "free" | PublicPaidPlanId;
  badge: string;
  badgeClass: string;
  name: string;
  description: string;
  monthlyPrice: string;
  originalMonthlyPrice?: string;
  annualNote: string;
  originalAnnualNote?: string;
  annualNoteClass: string;
  features: PublicPricingFeature[];
  footer: string;
  highlighted?: boolean;
  bestBadge?: string;
  nameClass?: string;
};

export type PublicPricingPageCopy = {
  metaTitle: string;
  metaDescription: string;
  backHome: string;
  badge: string;
  h1: string;
  subtitle: string;
  disclaimer: string;
  plans: PublicPricingPlanCard[];
  ctaTitle: string;
  ctaBody: string;
  ctaApply: string;
  ctaEmail: string;
  downloadTitle: string;
  downloadWindows: string;
  downloadAndroid: string;
  androidQrCaption: string;
  androidQrAlt: string;
  androidGuidanceItems: string[];
};

function T(
  baseLocale: string,
  ko: string,
  en: string,
  vi?: string,
  ja?: string,
  zh?: string,
) {
  return pickUiText(baseLocale, ko, en, vi, ja, zh);
}

const ANNUAL_NOTES: Record<
  PublicPaidPlanId,
  { ko: string; en: string; vi: string }
> = {
  ribbon_only: {
    ko: "연 결제 시: 180,000원 (할인 없음)",
    en: "Annual prepay: $180 (no discount)",
    vi: "Trả trước năm: $180 (không giảm giá)",
  },
  mini: {
    ko: "연 결제 시: 180,000원 (할인 없음)",
    en: "Annual prepay: $180 (no discount)",
    vi: "Trả trước năm: $180 (không giảm giá)",
  },
  light: {
    ko: "연 결제 시: 300,000원 (1달 추가연장!)",
    en: "Annual $300 — includes 1 bonus month (13 months)",
    vi: "Trả năm $300 — thêm 1 tháng (13 tháng)",
  },
  pro: {
    ko: "연 결제 시: 480,000원 (1달 연장!)",
    en: "Annual $480 — 1 bonus month (13 months)",
    vi: "Trả năm $480 — thêm 1 tháng (13 tháng)",
  },
  pro_plus: {
    ko: "연 결제 시: 720,000원 (2달 연장!)",
    en: "Annual $720 — 2 bonus months (14 months)",
    vi: "Trả năm $720 — thêm 2 tháng (14 tháng)",
  },
};

export function buildPublicPricingPageCopy(
  baseLocale: string,
  useKrw: boolean,
  showKoreaOnlyPerks: boolean,
  discountSettings?: GlobalDiscountSettings | null,
): PublicPricingPageCopy {
  const posLoan = T(
    baseLocale,
    "포스 프린터 무상 임대 제공 (연 결제 시, 요구 시)",
    "POS printer loan (annual plan, on request — Korea only)",
    "Cho mượn máy POS (gói năm, theo yêu cầu — chỉ Hàn Quốc)",
  );
  const posRepair = T(
    baseLocale,
    "사용 중 자연고장 평생 무상 교체",
    "Free replacement for normal wear (Korea only)",
    "Đổi máy hỏng do hao mòn (chỉ Hàn Quốc)",
  );
  const posExcluded = T(
    baseLocale,
    "포스 프린터 임대 제외",
    "POS printer loan not included",
    "Không bao gồm cho mượn máy POS",
  );

  const koreaPerks: PublicPricingFeature[] = showKoreaOnlyPerks
    ? [{ text: posLoan }, { text: posRepair }]
    : [];

  const plans: PublicPricingPlanCard[] = [
    {
      id: "free",
      badge: T(baseLocale, "체험 모드", "Free trial", "Dùng thử"),
      badgeClass: "bg-slate-100 text-slate-600",
      name: T(baseLocale, "무료 체험판", "Free trial", "Dùng thử miễn phí"),
      description: T(
        baseLocale,
        "결제 없이 모든 기능을 둘러보고 출력 테스트를 진행해 볼 수 있는 체험 플랜",
        "Explore features and print tests without payment",
        "Khám phá tính năng và in thử không cần thanh toán",
      ),
      monthlyPrice: publicFreePriceLabel(useKrw),
      annualNote: T(
        baseLocale,
        "(체험용 데이터 저장 제외)",
        "(Trial data not saved to cloud)",
        "(Dữ liệu dùng thử không lưu cloud)",
      ),
      annualNoteClass: "text-slate-500",
      features: [
        {
          text: T(
            baseLocale,
            "가입 후 1주일 간 모든 기능 무료 (AI 제외, 10건 한도)",
            "1-week full trial for all features (No AI, up to 10 orders)",
            "Dùng thử miễn phí mọi tính năng trong 1 tuần (Không AI, tối đa 10 đơn)",
          ),
          bold: true,
        },
        {
          text: T(
            baseLocale,
            "1주일 후 기존 무료 티어로 자동 전환 (월 5건/인쇄 제한)",
            "Reverts to basic free tier after 1 week (5 orders/mo)",
            "Trở về gói miễn phí cơ bản sau 1 tuần (5 đơn/tháng)",
          ),
        },
        {
          text: T(
            baseLocale,
            "3개월 미접속 시 자동 탈퇴 및 데이터 삭제",
            "Inactive 3+ months: account & data may be removed",
            "Không truy cập 3+ tháng: tài khoản & dữ liệu có thể bị xóa",
          ),
          warn: true,
        },
        { text: posExcluded, strikethrough: true },
      ],
      footer: T(baseLocale, "가입 후 1주일 혜택 제공", "Special benefits for 1st week", "Ưu đãi trong tuần đầu"),
    },
    {
      id: "ribbon_only",
      badge: T(baseLocale, "소규모 미니", "Mini shop", "Tiệm nhỏ"),
      badgeClass: "bg-[#fdcada]/40 text-[#795260]",
      name: T(baseLocale, "플로비서 미니", "FloSecretary Mini", "FloSecretary Mini"),
      description: T(
        baseLocale,
        "주문량이 많지 않아 부담 없는 가격에 모든 비서 기능을 입문하고 싶으신 1인 숍 (월 50건 한도)",
        "Entry plan for solo florists with small order volume (up to 50/mo)",
        "Gói nhập môn cho tiệm hoa nhỏ (tối đa 50 đơn/tháng)",
      ),
      monthlyPrice: publicMonthlyPriceLabel("ribbon_only", useKrw, getActiveDiscountRate(discountSettings, "ribbon_only", "1m")).text,
      originalMonthlyPrice: publicMonthlyPriceLabel("ribbon_only", useKrw, getActiveDiscountRate(discountSettings, "ribbon_only", "1m")).originalText,
      annualNote: getActiveDiscountRate(discountSettings, "ribbon_only", "12m") > 0 
        ? T(baseLocale, `연 결제 시: ${publicAnnualTotal("ribbon_only", useKrw, getActiveDiscountRate(discountSettings, "ribbon_only", "12m")).text} (첫 결제 할인!)`, `Annual prepay: ${publicAnnualTotal("ribbon_only", useKrw, getActiveDiscountRate(discountSettings, "ribbon_only", "12m")).text}`, `Trả trước năm: ${publicAnnualTotal("ribbon_only", useKrw, getActiveDiscountRate(discountSettings, "ribbon_only", "12m")).text}`)
        : T(baseLocale, ANNUAL_NOTES.ribbon_only.ko, ANNUAL_NOTES.ribbon_only.en, ANNUAL_NOTES.ribbon_only.vi),
      originalAnnualNote: getActiveDiscountRate(discountSettings, "ribbon_only", "12m") > 0 
        ? T(baseLocale, ANNUAL_NOTES.ribbon_only.ko, ANNUAL_NOTES.ribbon_only.en, ANNUAL_NOTES.ribbon_only.vi) : undefined,
      annualNoteClass: "text-[#795260]",
      features: [
        {
          text: T(
            baseLocale,
            "월 주문 등록 50건 한도",
            "Up to 50 orders/month",
            "Tối đa 50 đơn/tháng",
          ),
          bold: true,
        },
        {
          text: T(
            baseLocale,
            "매장 관리/리본 출력 모든 기능 제공",
            "Full shop assistant + ribbon printing",
            "Đầy đủ trợ lý + in ruy băng",
          ),
        },
        {
          text: T(
            baseLocale,
            "모바일 앱 사진 전송",
            "Mobile photo upload",
            "Gửi ảnh qua app di động",
          ),
        },
        { text: posExcluded, strikethrough: true },
      ],
      footer: T(
        baseLocale,
        "월 결제 또는 연간 즉시할인 선택 가능",
        "Monthly or annual billing",
        "Thanh toán tháng hoặc năm",
      ),
    },
    {
      id: "light",
      badge: T(baseLocale, "소규모 매장", "Small shop", "Cửa hàng nhỏ"),
      badgeClass: "bg-[#86e3ce]/30 text-[#006657]",
      name: T(baseLocale, "플로비서 라이트", "FloSecretary Light", "FloSecretary Light"),
      description: T(
        baseLocale,
        "주문량이 많지 않아 부담 없는 가격에 모든 비서 기능을 입문하고 싶으신 1인 숍",
        "Entry plan for solo florists with moderate order volume",
        "Gói nhập môn cho tiệm hoa nhỏ",
      ),
      monthlyPrice: publicMonthlyPriceLabel("light", useKrw, getActiveDiscountRate(discountSettings, "light", "1m")).text,
      originalMonthlyPrice: publicMonthlyPriceLabel("light", useKrw, getActiveDiscountRate(discountSettings, "light", "1m")).originalText,
      annualNote: getActiveDiscountRate(discountSettings, "light", "12m") > 0 
        ? T(baseLocale, `연 결제 시: ${publicAnnualTotal("light", useKrw, getActiveDiscountRate(discountSettings, "light", "12m")).text} (첫 결제 할인!)`, `Annual prepay: ${publicAnnualTotal("light", useKrw, getActiveDiscountRate(discountSettings, "light", "12m")).text}`, `Trả trước năm: ${publicAnnualTotal("light", useKrw, getActiveDiscountRate(discountSettings, "light", "12m")).text}`)
        : T(baseLocale, ANNUAL_NOTES.light.ko, ANNUAL_NOTES.light.en, ANNUAL_NOTES.light.vi),
      originalAnnualNote: getActiveDiscountRate(discountSettings, "light", "12m") > 0 
        ? T(baseLocale, ANNUAL_NOTES.light.ko, ANNUAL_NOTES.light.en, ANNUAL_NOTES.light.vi) : undefined,
      annualNoteClass: "text-emerald-700",
      features: [
        {
          text: T(
            baseLocale,
            "월 주문 등록 100건 한도",
            "Up to 100 orders/month",
            "Tối đa 100 đơn/tháng",
          ),
          bold: true,
        },
        {
          text: T(
            baseLocale,
            "매장 관리/리본 출력 모든 기능 제공",
            "Full shop assistant + ribbon printing",
            "Đầy đủ trợ lý + in ruy băng",
          ),
        },
        {
          text: T(
            baseLocale,
            "모바일 앱 사진 전송",
            "Mobile photo upload",
            "Gửi ảnh qua app di động",
          ),
        },
        { text: posExcluded, strikethrough: true },
      ],
      footer: T(
        baseLocale,
        "연 결제 시 1개월 보너스 추가 (총 13개월)",
        "13 months on annual plan",
        "13 tháng khi trả năm",
      ),
    },
    {
      id: "pro",
      badge: T(baseLocale, "성장형 매장", "Growing shop", "Đang phát triển"),
      badgeClass: "bg-[#dbcaff]/40 text-[#61508b]",
      name: T(baseLocale, "플로비서 프로", "FloSecretary Pro", "FloSecretary Pro"),
      description: T(
        baseLocale,
        "본격적으로 주문을 관리하며, 장비 대여 혜택까지 한번에 해결하고 싶으신 실속형 꽃집",
        "For shops scaling order volume",
        "Cho tiệm hoa quản lý đơn hàng chuyên nghiệp",
      ),
      monthlyPrice: publicMonthlyPriceLabel("pro", useKrw, getActiveDiscountRate(discountSettings, "pro", "1m")).text,
      originalMonthlyPrice: publicMonthlyPriceLabel("pro", useKrw, getActiveDiscountRate(discountSettings, "pro", "1m")).originalText,
      annualNote: getActiveDiscountRate(discountSettings, "pro", "12m") > 0 
        ? T(baseLocale, `연 결제 시: ${publicAnnualTotal("pro", useKrw, getActiveDiscountRate(discountSettings, "pro", "12m")).text} (첫 결제 할인!)`, `Annual prepay: ${publicAnnualTotal("pro", useKrw, getActiveDiscountRate(discountSettings, "pro", "12m")).text}`, `Trả trước năm: ${publicAnnualTotal("pro", useKrw, getActiveDiscountRate(discountSettings, "pro", "12m")).text}`)
        : T(baseLocale, ANNUAL_NOTES.pro.ko, ANNUAL_NOTES.pro.en, ANNUAL_NOTES.pro.vi),
      originalAnnualNote: getActiveDiscountRate(discountSettings, "pro", "12m") > 0 
        ? T(baseLocale, ANNUAL_NOTES.pro.ko, ANNUAL_NOTES.pro.en, ANNUAL_NOTES.pro.vi) : undefined,
      annualNoteClass: "text-[#61508b]",
      features: [
        {
          text: T(
            baseLocale,
            "월 주문 등록 200건 한도",
            "Up to 200 orders/month",
            "Tối đa 200 đơn/tháng",
          ),
          bold: true,
        },
        {
          text: T(
            baseLocale,
            "매장 관리/리본 출력 모든 기능 제공",
            "Full shop assistant + ribbon printing",
            "Đầy đủ trợ lý + in ruy băng",
          ),
        },
        ...koreaPerks,
        {
          text: T(
            baseLocale,
            "총 13개월 이용 (연 결제 시)",
            "13 months on annual plan",
            "13 tháng khi trả năm",
          ),
        },
      ],
      footer: T(
        baseLocale,
        "연 결제 시 1개월 보너스 추가 (총 13개월)",
        "13 months on annual plan",
        "13 tháng khi trả năm",
      ),
    },
    {
      id: "pro_plus",
      badge: T(baseLocale, "대형/무제한", "Unlimited", "Không giới hạn"),
      badgeClass: "bg-[#86e3ce] text-[#006657]",
      name: T(baseLocale, "프로 플러스", "Pro Plus", "Pro Plus"),
      nameClass: "text-[#006b5c]",
      description: T(
        baseLocale,
        "주문량이 아주 많아 무제한 등록이 필요한 대형 매장을 위한 프리미엄 플랜",
        "Unlimited orders and premium benefits",
        "Đơn không giới hạn và quyền lợi cao cấp",
      ),
      monthlyPrice: publicMonthlyPriceLabel("pro_plus", useKrw, getActiveDiscountRate(discountSettings, "pro_plus", "1m")).text,
      originalMonthlyPrice: publicMonthlyPriceLabel("pro_plus", useKrw, getActiveDiscountRate(discountSettings, "pro_plus", "1m")).originalText,
      annualNote: getActiveDiscountRate(discountSettings, "pro_plus", "12m") > 0 
        ? T(baseLocale, `연 결제 시: ${publicAnnualTotal("pro_plus", useKrw, getActiveDiscountRate(discountSettings, "pro_plus", "12m")).text} (첫 결제 할인!)`, `Annual prepay: ${publicAnnualTotal("pro_plus", useKrw, getActiveDiscountRate(discountSettings, "pro_plus", "12m")).text}`, `Trả trước năm: ${publicAnnualTotal("pro_plus", useKrw, getActiveDiscountRate(discountSettings, "pro_plus", "12m")).text}`)
        : T(baseLocale, ANNUAL_NOTES.pro_plus.ko, ANNUAL_NOTES.pro_plus.en, ANNUAL_NOTES.pro_plus.vi),
      originalAnnualNote: getActiveDiscountRate(discountSettings, "pro_plus", "12m") > 0 
        ? T(baseLocale, ANNUAL_NOTES.pro_plus.ko, ANNUAL_NOTES.pro_plus.en, ANNUAL_NOTES.pro_plus.vi) : undefined,
      annualNoteClass: "text-amber-700",
      features: [
        {
          text: T(
            baseLocale,
            "등록 주문량 완전 무제한",
            "Unlimited orders",
            "Đơn hàng không giới hạn",
          ),
          bold: true,
        },
        {
          text: T(
            baseLocale,
            "매장 관리/리본 출력 모든 기능 제공",
            "Full shop assistant + ribbon printing",
            "Đầy đủ trợ lý + in ruy băng",
          ),
        },
        ...koreaPerks,
        {
          text: T(
            baseLocale,
            "총 14개월 이용 (연 결제 시)",
            "14 months on annual plan",
            "14 tháng khi trả năm",
          ),
        },
      ],
      footer: T(
        baseLocale,
        "연 결제 시 2개월 보너스 추가 (총 14개월)",
        "14 months on annual plan",
        "14 tháng khi trả năm",
      ),
      highlighted: true,
      bestBadge: T(baseLocale, "BEST 추천 👑", "BEST 👑", "BEST 👑"),
    },
  ];

  return {
    metaTitle: T(
      baseLocale,
      "이용 요금 · 플로싱크",
      "Pricing · FloXync",
      "Bảng giá · FloXync",
    ),
    metaDescription: T(
      baseLocale,
      "하루 단 800원부터 무제한 비서까지, 플로싱크 요금 안내",
      "From free trial to full shop assistant — FloXync plans",
      "Từ dùng thử miễn phí đến trợ lý đầy đủ — bảng giá FloXync",
    ),
    backHome: T(baseLocale, "홈으로 돌아가기", "Back to home", "Về trang chủ"),
    badge: "🌸 FLOSYNC RATE CARD",
    h1: T(
      baseLocale,
      "플로싱크 이용 요금 안내",
      "FloXync pricing",
      "Bảng giá FloXync",
    ),
    subtitle: T(
      baseLocale,
      "사장님 매장의 주문 건수와 필요 기능에 맞는 가장 합리적인 혜택을 만나보세요.",
      "Choose the plan that fits your order volume and daily workflow.",
      "Chọn gói phù hợp quy mô đơn hàng và cách vận hành của bạn.",
    ),
    disclaimer: T(
      baseLocale,
      "표시 요금은 안내용입니다. 가입 후 매장 운영 국가 설정에 따라 청구됩니다. (모든 티어 부가세 별도)",
      "Prices shown are indicative. After signup, billing follows your store operating country setting. (VAT excluded for all tiers)",
      "Giá hiển thị chỉ mang tính tham khảo. Sau khi đăng ký, thanh toán theo cài đặt quốc gia vận hành cửa hàng của bạn. (Chưa bao gồm VAT cho tất cả các gói)",
      "表示料金は参考用です。ご登録後、店舗の運営国設定に応じて請求されます。（全プラン消費税別）",
    ),
    plans,
    ctaTitle: T(
      baseLocale,
      "베타 테스터 신청 및 가입",
      "Join the beta",
      "Tham gia beta",
    ),
    ctaBody: T(
      baseLocale,
      "지금 가입 신청하시면 정식 런칭 전까지 100% 무료로 체험하실 수 있으며, 정식 런칭 후에도 베타 테스터 특별 우대가가 적용됩니다.",
      "Sign up now for free access during beta. Early members receive preferential pricing after launch.",
      "Đăng ký ngay để dùng thử miễn phí trong beta. Ưu đãi cho thành viên sớm sau ra mắt.",
    ),
    ctaApply: T(
      baseLocale,
      "베타 테스터 신청서 쓰러 가기",
      "Apply for beta",
      "Đăng ký beta",
    ),
    ctaEmail: T(baseLocale, "이메일로 문의 접수하기", "Email us", "Gửi email"),
    downloadTitle: T(
      baseLocale,
      "⬇️ 앱 및 프로그램 다운로드 (무료/체험 가능)",
      "⬇️ Download apps (free trial)",
      "⬇️ Tải ứng dụng (dùng thử miễn phí)",
    ),
    downloadWindows: T(
      baseLocale,
      "윈도우 앱 다운로드",
      "Download Windows app",
      "Tải app Windows",
    ),
    downloadAndroid: T(
      baseLocale,
      "안드로이드 모바일 앱 다운로드",
      "Download Android app",
      "Tải app Android",
    ),
    androidQrCaption: T(
      baseLocale,
      "휴대폰으로 스캔하여 APK 설치",
      "Scan with your phone to install the APK",
      "Quét bằng điện thoại để cài APK",
    ),
    androidQrAlt: T(
      baseLocale,
      "FloXync 안드로이드 앱 다운로드 QR 코드",
      "QR code to download the FloXync Android app",
      "Mã QR tải ứng dụng Android FloXync",
    ),
    androidGuidanceItems:
      baseLocale === "ko"
        ? [
            "안드로이드 7.0 이상",
            "APK 설치 시 설정에서 「알 수 없는 앱 설치」를 허용해 주세요.",
          ]
        : baseLocale === "vi"
          ? [
              "Yêu cầu Android 7.0 trở lên.",
              "Khi cài APK, hãy bật «Cài đặt ứng dụng không xác định» trong Cài đặt.",
            ]
          : [
              "Requires Android 7.0 or later.",
              'When installing the APK, allow "Install unknown apps" in Settings.',
            ],
  };
}
