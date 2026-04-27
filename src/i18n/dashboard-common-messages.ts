import type { AppLocale } from "@/i18n/config";
import { toBaseLocale } from "@/i18n/config";

/** Non-English locales in `BASE` fall back to `EN` until native JSON exists.
 *  To ship a language quickly: duplicate `EN` → `messages/dashboard/vi.json`, machine-translate, import here. */

type DashboardCommonMessages = {
  header: {
    localeChanged: string;
    logoutSuccess: string;
    profile: string;
    settings: string;
    logout: string;
    admin: string;
    partner: string;
    hqAccount: string;
    subscriptionTitle: string;
    subscriptionMissing: string;
    subscriptionExpired: string;
    subscriptionRenew: string;
    subscriptionToday: string;
  };
  sidebar: {
    logout: string;
    menuOpen: string;
    menu: string;
    hqWorkMode: string;
    altStoreLogo: string;
    altBrandLogo: string;
    badgeAdmin: string;
    badgeHq: string;
    badgePartner: string;
    support: string;
    membershipUpgrade: string;
    getBenefits: string;
    checkPlan: string;
    groups: {
      adminOverview: string;
      adminOps: string;
      adminContent: string;
      adminSystem: string;
      hq: string;
      tenantHome: string;
      tenantOps: string;
      tenantMake: string;
      tenantGrowth: string;
      tenantStore: string;
    };
    hints: {
      adminOverview: string;
      hq: string;
      tenantHome: string;
      tenantOps: string;
      tenantMake: string;
      tenantStore: string;
    };
    links: Record<string, string>;
  };
};

const KO: DashboardCommonMessages = {
  header: {
    localeChanged: "표시 언어가 변경되었습니다.",
    logoutSuccess: "안전하게 로그아웃 되었습니다.",
    profile: "내 프로필",
    settings: "환경 설정",
    logout: "로그아웃",
    admin: "관리자",
    partner: "구독 파트너",
    hqAccount: "본사·다매장 계정 (매장 구독 별도)",
    subscriptionTitle: "구독 · 이용 기한 보기",
    subscriptionMissing: "이용 기한 미등록",
    subscriptionExpired: "만료",
    subscriptionRenew: "연장 필요",
    subscriptionToday: "오늘 만료",
  },
  sidebar: {
    logout: "로그아웃",
    menuOpen: "메뉴 열기",
    menu: "메뉴",
    hqWorkMode: "지점업무",
    altStoreLogo: "매장 로고",
    altBrandLogo: "Floxync 로고",
    badgeAdmin: "관리자 모드",
    badgeHq: "본사",
    badgePartner: "파트너",
    support: "고객지원",
    membershipUpgrade: "Membership Upgrade",
    getBenefits: "최대 혜택 받기",
    checkPlan: "플랜 확인하기",
    groups: {
      adminOverview: "통합 현황",
      adminOps: "본사 · 가맹 운영",
      adminContent: "콘텐츠 · 마케팅",
      adminSystem: "시스템",
      hq: "본사·다매장",
      tenantHome: "시작",
      tenantOps: "매장 운영",
      tenantMake: "제작 · 출력",
      tenantGrowth: "마케팅",
      tenantStore: "매장 설정 · 구독",
    },
    hints: {
      adminOverview: "한눈에 보는 운영",
      hq: "지점 비교 · 실적",
      tenantHome: "오늘 업무 허브",
      tenantOps: "주문 · 고객 · 재고",
      tenantMake: "리본 · 카드",
      tenantStore: "연동 · 플랜",
    },
    links: {
      systemDashboard: "시스템 대시보드",
      staff: "직원(Staff) 관리",
      checklist: "일일 체크리스트",
      tenants: "전국 화원사 관리",
      seed: "초기 기초자료 시드",
      organizations: "조직(본사) 관리",
      billing: "구독 · 결제 관제",
      announcements: "글로벌 공지",
      faq: "FAQ · AI 지식",
      promoMaster: "플랫폼 홍보 마스터",
      templates: "디자인 템플릿 관리",
      globalSettings: "전역 설정",
      storeSettings: "화원사 환경 설정",
      hqOverview: "본사 개요",
      sharedProducts: "공동상품관리",
      branchExpenses: "지점별 지출",
      hqMaterials: "자재 요청·취합",
      hqBoard: "본사 게시판",
      home: "업무 홈",
      newOrder: "새 주문",
      orders: "주문 목록",
      delivery: "배송 · 픽업",
      crm: "고객 CRM",
      externalOrders: "협력사 수발주",
      products: "상품",
      inventory: "재고",
      branchMaterials: "본사 자재 요청",
      suppliers: "거래처",
      purchases: "매입",
      reports: "정산 · 보고서",
      analytics: "매입·매출 통계",
      expenses: "지출",
      tax: "세무",
      printer: "리본 프린터",
      designStudio: "카드 디자인",
      marketing: "AI 홍보 마스터",
      pos: "POS 연동",
      settings: "환경 설정",
      subscription: "구독 · 플랜",
    },
  },
};

const EN: DashboardCommonMessages = {
  header: {
    localeChanged: "Display language changed.",
    logoutSuccess: "Logged out safely.",
    profile: "My Profile",
    settings: "Settings",
    logout: "Logout",
    admin: "Admin",
    partner: "Partner",
    hqAccount: "HQ multi-store account (separate store subscription)",
    subscriptionTitle: "View subscription period",
    subscriptionMissing: "No end date set",
    subscriptionExpired: "Expired",
    subscriptionRenew: "Renewal required",
    subscriptionToday: "Expires today",
  },
  sidebar: {
    logout: "Logout",
    menuOpen: "Open menu",
    menu: "Menu",
    hqWorkMode: "Branch Mode",
    altStoreLogo: "Store logo",
    altBrandLogo: "Floxync logo",
    badgeAdmin: "ADMIN MODE",
    badgeHq: "HQ",
    badgePartner: "PARTNER",
    support: "Support",
    membershipUpgrade: "Membership Upgrade",
    getBenefits: "Get maximum benefits",
    checkPlan: "Check plan",
    groups: {
      adminOverview: "Overview",
      adminOps: "HQ & Franchise Ops",
      adminContent: "Content & Marketing",
      adminSystem: "System",
      hq: "HQ Multi-store",
      tenantHome: "Start",
      tenantOps: "Store Operations",
      tenantMake: "Production & Print",
      tenantGrowth: "Marketing",
      tenantStore: "Store Settings & Plan",
    },
    hints: {
      adminOverview: "All operations at a glance",
      hq: "Branch comparison & performance",
      tenantHome: "Today's work hub",
      tenantOps: "Orders · Customers · Inventory",
      tenantMake: "Ribbon · Card",
      tenantStore: "Integrations · Plan",
    },
    links: {
      systemDashboard: "System Dashboard",
      staff: "Staff Management",
      checklist: "Daily Checklist",
      tenants: "Store Management",
      seed: "Initial Seed Data",
      organizations: "Organization Management",
      billing: "Billing Control",
      announcements: "Global Announcements",
      faq: "FAQ · AI Knowledge",
      promoMaster: "Marketing Master",
      templates: "Design Templates",
      globalSettings: "Global Settings",
      storeSettings: "Store Settings",
      hqOverview: "HQ Overview",
      sharedProducts: "Shared Products",
      branchExpenses: "Branch Expenses",
      hqMaterials: "Material Requests",
      hqBoard: "HQ Board",
      home: "Work Home",
      newOrder: "New Order",
      orders: "Order List",
      delivery: "Delivery & Pickup",
      crm: "Customer CRM",
      externalOrders: "Partner Orders",
      products: "Products",
      inventory: "Inventory",
      branchMaterials: "Request HQ Materials",
      suppliers: "Suppliers",
      purchases: "Purchases",
      reports: "Settlement & Reports",
      analytics: "Sales Analytics",
      expenses: "Expenses",
      tax: "Tax",
      printer: "Ribbon Printer",
      designStudio: "Card Design",
      marketing: "AI Marketing Master",
      pos: "POS Integration",
      settings: "Settings",
      subscription: "Subscription Plan",
    },
  },
};

const BASE: Record<string, DashboardCommonMessages> = {
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

export function getDashboardCommonMessages(locale: AppLocale): DashboardCommonMessages {
  const base = toBaseLocale(locale);
  return BASE[base] ?? EN;
}
