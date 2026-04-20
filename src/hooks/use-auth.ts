"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

/**
 * useAuth — Zustand 싱글톤 스토어 래퍼
 * 
 * 기존과 동일한 인터페이스 { user, profile, tenantId, isLoading }를 반환합니다.
 * 내부적으로 Zustand 스토어를 사용하여 getUser()와 profiles 쿼리를
 * 앱 전체에서 딱 1번만 호출합니다.
 * 
 * 이전: 각 hook이 useAuth()를 호출할 때마다 supabase.auth.getUser() 발생 (4~6번)
 * 이후: 첫 호출 시 1번만 발생, 이후는 캐시된 상태 반환
 */
export function useAuth() {
  const { user, profile, tenantId, isSuperAdmin, isLoading, initialize, refreshAuth } =
    useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    user,
    profile,
    tenantId,
    isSuperAdmin,
    isLoading,
    refreshAuth,
    /** profiles.org_work_tenant_id 가 있으면 지점 업무 모드 */
    isOrgWorkContext: !!profile?.org_work_tenant_id,
    /** 업무 전환 전 소속 매장 (없으면 null) */
    homeTenantId: profile?.tenant_id ?? null,
  };
}
