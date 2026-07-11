import { isStaffRole } from "@/lib/staff-menu-permissions";

const STORE_MANAGER_ROLES = new Set(["tenant_admin", "super_admin", "org_admin"]);

/**
 * 직원 등록·권한·출퇴근 관리 가능 여부.
 * PIN 작업자 전환과 무관하게 **로그인한 Supabase 계정** 기준으로 판단합니다.
 */
export function canManageTenantStaff(options: {
  role?: string | null;
  tenantId?: string | null;
  isSuperAdmin?: boolean;
}): boolean {
  if (options.isSuperAdmin) return true;

  const role = options.role;
  if (!role || role === "guest" || isStaffRole(role)) return false;

  if (STORE_MANAGER_ROLES.has(role)) return true;

  // 역할 문자열이 예외적이어도 테넌트가 연결된 점주 계정이면 허용
  return !!options.tenantId;
}
