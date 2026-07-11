"use client";

import { useAuth } from "./use-auth";
import { usePosSession as usePosStore } from "@/stores/pos-session-store";
import { useMemo } from "react";
import { isStaffRole } from "@/lib/staff-menu-permissions";

export function usePosSession() {
  const { user, profile, tenantId, isLoading: authLoading, isSuperAdmin } = useAuth();
  const { activeProfile: switchedProfile, setActiveProfile, clearSession } = usePosStore();

  // The "effective" active profile. If activeProfile in store is null,
  // we fallback to the authenticated owner's profile.
  const effectiveProfile = useMemo(() => {
    if (switchedProfile) {
      return switchedProfile;
    }
    if (profile && user) {
      return {
        id: profile.id,
        role: profile.role,
        full_name: profile.full_name || "사장님",
        email: user.email || ""
      };
    }
    return null;
  }, [switchedProfile, profile, user]);

  const isTenantStaff = isStaffRole(effectiveProfile?.role);
  const isStaffMode = useMemo(() => {
    if (isStaffRole(profile?.role)) return true;
    if (switchedProfile && profile && switchedProfile.id !== profile.id) return true;
    return isStaffRole(switchedProfile?.role);
  }, [switchedProfile, profile]);
  // If activeProfile is not set (meaning it's the authenticated user), or if role is explicitly tenant_admin
  const isTenantAdmin = !switchedProfile || effectiveProfile?.role === "tenant_admin" || effectiveProfile?.role === "super_admin";

  return {
    // Basic Auth Info
    authUser: user,
    authProfile: profile,
    tenantId,
    authLoading,
    isSuperAdmin,
    
    // POS Active Profile
    activeProfile: effectiveProfile,
    switchedProfile,
    isTenantStaff,
    isStaffMode,
    isTenantAdmin,
    
    // Actions
    setActiveProfile,
    clearSession
  };
}
