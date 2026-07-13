/**
 * Luminous 랜딩 페이지 이미지 매핑
 * - landing/* : Playwright 게스트 캡처 (npm run capture:landing)
 * - /images/* : 기존 마케팅 UI 에셋 (폴백)
 */

export const LANDING_IMAGES = {
  hero: "/images/landing/dashboard-hero.png",
  automation: "/images/landing/order-new-pc.png",
  ribbon: "/images/smart-print-bridge-engine.png",
  ribbonCapture: "/images/landing/ribbon-print.png",
  connection: "/images/landing/dashboard-hero.png",
  receipt: "/images/landing/expenses.png",
  settlement: "/images/landing/reports.png",
  notificationMobile: "/images/landing/mobile-dashboard.png",
  windowsDesktop: "/images/landing/dashboard-hero.png",
  androidMobile: "/images/landing/android-app-home.png",
  androidMobileExpense: "/images/landing/android-app-expense.png",
  platformOverview: "/images/landing/orders-list.png",
  /** 사장님 촬영 필요 — public/images/landing/ 에 넣으면 자동 반영 */
  electronTray: "/images/landing/electron-tray.png",
  ribbonPhysical: "/images/landing/ribbon-physical.jpg",
  shopAmbience: "/images/landing/shop-ambience.jpg",
} as const;

export type LandingImageKey = keyof typeof LANDING_IMAGES;
