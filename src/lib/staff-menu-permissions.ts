/** 직원 PIN 전환 시 사이드바에 노출할 수 있는 메뉴 ID (사이드바 링크 1:1) */
export const STAFF_MENU_IDS = [
  "dashboard",
  "calendar",
  "pos",
  "orders",
  "delivery",
  "mobile",
  "customers",
  "products",
  "inventory",
  "inventory_logs",
  "barcode_scanner",
  "suppliers",
  "purchases",
  "material_requests",
  "branch_transfers",
  "expenses",
  "analytics",
  "reports",
  "tax",
  "staff",
  "printer",
  "settings",
  "support",
  "subscription",
] as const;

export type StaffMenuId = (typeof STAFF_MENU_IDS)[number];

/** 설정 UI에 표시할 메뉴 라벨 (사이드바와 동일한 개별 항목) */
export const STAFF_MENU_OPTIONS: { id: StaffMenuId; label: string }[] = [
  { id: "dashboard", label: "대시보드" },
  { id: "calendar", label: "일정/예약 관리" },
  { id: "pos", label: "웹 POS (새 주문)" },
  { id: "orders", label: "주문 현황" },
  { id: "delivery", label: "배송 · 픽업" },
  { id: "mobile", label: "모바일 매장" },
  { id: "customers", label: "고객 CRM" },
  { id: "products", label: "상품 관리" },
  { id: "inventory", label: "자재" },
  { id: "inventory_logs", label: "입출고 내역" },
  { id: "barcode_scanner", label: "바코드 스캐너" },
  { id: "suppliers", label: "거래처" },
  { id: "purchases", label: "매입" },
  { id: "material_requests", label: "본사 자재 요청" },
  { id: "branch_transfers", label: "지점 수발주 내역" },
  { id: "expenses", label: "지출 관리" },
  { id: "analytics", label: "매입·매출 통계" },
  { id: "reports", label: "정산 · 보고서" },
  { id: "tax", label: "세무" },
  { id: "staff", label: "직원 · HR" },
  { id: "printer", label: "리본 프린터" },
  { id: "settings", label: "환경 설정" },
  { id: "support", label: "고객센터" },
  { id: "subscription", label: "구독 · 플랜" },
];

export const DEFAULT_STAFF_MENU_PERMISSIONS: StaffMenuId[] = [
  "dashboard",
  "orders",
  "calendar",
];

/** 이전 버전에서 묶여 있던 메뉴 ID → 개별 메뉴 ID (기존 설정 호환) */
const LEGACY_MENU_EXPANSIONS: Record<string, StaffMenuId[]> = {
  materials: [
    "inventory",
    "inventory_logs",
    "barcode_scanner",
    "suppliers",
    "purchases",
    "material_requests",
    "branch_transfers",
  ],
  sales: ["analytics", "reports", "tax"],
  settings: ["settings", "support", "subscription"],
  orders: ["orders", "delivery"],
};

function expandLegacyPermissions(permissions: string[]): Set<string> {
  const effective = new Set<string>(permissions);
  for (const permission of permissions) {
    const children = LEGACY_MENU_EXPANSIONS[permission];
    if (children) {
      for (const child of children) effective.add(child);
    }
  }
  return effective;
}

/** 저장된 권한(구버전 포함)을 UI 토글용 개별 ID 목록으로 변환 */
export function normalizeStaffMenuPermissions(permissions: string[]): StaffMenuId[] {
  const effective = expandLegacyPermissions(permissions);
  return STAFF_MENU_IDS.filter((id) => effective.has(id));
}

export function isStaffRole(role?: string | null): boolean {
  return role === "tenant_staff" || role === "staff";
}

/** 사이드바 링크 href → 직원 메뉴 권한 ID. 직원에게 노출하지 않을 링크는 null */
export function getStaffMenuIdFromHref(href: string): StaffMenuId | null {
  const path = href.replace(/\/$/, "") || "/";

  if (path === "/dashboard") return "dashboard";
  if (path.startsWith("/dashboard/orders/new")) return "pos";
  if (path.startsWith("/dashboard/mobile")) return "mobile";
  if (path.startsWith("/dashboard/schedule")) return "calendar";
  if (path.startsWith("/dashboard/customers")) return "customers";
  if (path.startsWith("/dashboard/products")) return "products";
  if (path.startsWith("/dashboard/inventory/barcode-scanner")) return "barcode_scanner";
  if (path.startsWith("/dashboard/inventory/logs")) return "inventory_logs";
  if (path.startsWith("/dashboard/inventory")) return "inventory";
  if (path.startsWith("/dashboard/suppliers")) return "suppliers";
  if (path.startsWith("/dashboard/purchases")) return "purchases";
  if (path.startsWith("/dashboard/material-requests")) return "material_requests";
  if (path.startsWith("/dashboard/orders/transfers")) return "branch_transfers";
  if (path.startsWith("/dashboard/delivery") || path.startsWith("/dashboard/pickup-delivery")) {
    return "delivery";
  }
  if (path.startsWith("/dashboard/expenses")) return "expenses";
  if (path.startsWith("/dashboard/analytics")) return "analytics";
  if (path.startsWith("/dashboard/reports")) return "reports";
  if (path.startsWith("/dashboard/tax")) return "tax";
  if (path.startsWith("/dashboard/staff")) return "staff";
  if (path.startsWith("/dashboard/printer")) return "printer";
  if (path.startsWith("/dashboard/settings")) return "settings";
  if (path.startsWith("/dashboard/support")) return "support";
  if (path.startsWith("/dashboard/subscription")) return "subscription";
  if (path.startsWith("/dashboard/orders")) return "orders";

  // 본사·조직 전용 링크 등 — 직원에게 기본 비노출
  return null;
}

export function isStaffMenuAllowed(
  href: string,
  permissions: string[],
): boolean {
  const menuId = getStaffMenuIdFromHref(href);
  if (!menuId) return false;
  return expandLegacyPermissions(permissions).has(menuId);
}
