"use client";

import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { isPlatformSuperEmail } from '@/lib/platform-super-emails';
import {
  clearGuestBrowseCookie,
  GUEST_TRIAL_TENANT_ID,
  readGuestBrowseCookie,
} from '@/lib/subscription/guest-trial';
import {
  applyAuthCacheToState,
  clearAuthCache,
  isOfflineAuthError,
  saveAuthCache,
  shouldUseOfflineAuthBypass,
} from '@/lib/auth-offline-cache';

let authListenerRegistered = false;

const TENANT_PROFILE_SELECT =
  "plan, name, logo_url, contact_phone, address, subscription_end, subscription_start, status, created_at" as const;

async function enrichTenantProfile(
  supabase: ReturnType<typeof createClient>,
  tenantId: string | null | undefined,
  tenantsInfo: Record<string, unknown> | null,
): Promise<Record<string, unknown> | null> {
  if (!tenantId) return tenantsInfo;
  const existingName = typeof tenantsInfo?.name === "string" ? tenantsInfo.name.trim() : "";
  const existingPlan = typeof tenantsInfo?.plan === "string" ? tenantsInfo.plan.trim() : "";
  if (existingName && existingPlan && existingPlan !== "free") return tenantsInfo;

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select(TENANT_PROFILE_SELECT)
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantRow?.name?.trim()) {
    return { ...(tenantsInfo || {}), ...tenantRow };
  }

  const { data: settingsRow } = await supabase
    .from("system_settings")
    .select("data")
    .eq("id", `settings_${tenantId}`)
    .maybeSingle();

  const rawData = settingsRow?.data;
  const siteName =
    rawData && typeof rawData === "object" && "siteName" in rawData
      ? String((rawData as Record<string, unknown>).siteName ?? "").trim()
      : "";

  if (!siteName) return tenantsInfo;
  return { ...(tenantsInfo || {}), name: siteName };
}

async function enrichCachedProfileTenant(set: (partial: Partial<AuthState>) => void, get: () => AuthState) {
  const profile = get().profile;
  const tid = profile?.org_work_tenant_id ?? profile?.tenant_id;
  const existingName = typeof profile?.tenants?.name === "string" ? profile.tenants.name.trim() : "";
  const existingPlan = typeof profile?.tenants?.plan === "string" ? profile.tenants.plan.trim() : "";
  if (!tid || (existingName && existingPlan && existingPlan !== "free")) return;

  try {
    const supabase = createClient();
    const enriched = await enrichTenantProfile(supabase, tid, profile.tenants ?? null);
    if (!enriched?.name) return;
    const merged = { ...profile, tenants: enriched };
    set({ profile: merged });
    persistAuthCache(get().user, merged, get().tenantId, get().isSuperAdmin, get().isOrphaned);
  } catch {
    /* offline — cached profile 유지 */
  }
}

function registerAuthOfflineListener() {
  if (authListenerRegistered || typeof window === "undefined") return;
  authListenerRegistered = true;

  const supabase = createClient();
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      clearAuthCache();
      return;
    }
    if ((event as string) === "TOKEN_REFRESH_FAILED" && shouldUseOfflineAuthBypass()) {
      console.warn("[Auth] Token refresh failed — offline bypass, keeping cached session.");
    }
  });
}

function applyCachedAuth(set: (partial: Partial<AuthState>) => void): boolean {
  const cached = applyAuthCacheToState();
  if (!cached) return false;
  set({
    user: cached.user,
    profile: cached.profile,
    tenantId: cached.tenantId,
    isSuperAdmin: cached.isSuperAdmin,
    isOrphaned: cached.isOrphaned,
    isLoading: false,
    _initialized: true,
    _fetchPromise: null,
  });
  console.warn("[Auth] Offline/Electron fallback: using cached session.");
  return true;
}

function persistAuthCache(
  user: unknown,
  profile: Record<string, unknown> | null,
  tenantId: string | null,
  isSuperAdmin: boolean,
  isOrphaned: boolean,
) {
  if (!profile || !user || typeof user !== "object") return;
  saveAuthCache({
    user: user as Record<string, unknown>,
    profile,
    tenantId,
    isSuperAdmin,
    isOrphaned,
  });
}

interface AuthState {
  user: any;
  profile: any;
  tenantId: string | null;
  isSuperAdmin: boolean;
  isOrphaned: boolean;
  isLoading: boolean;
  _initialized: boolean;
  _fetchPromise: Promise<void> | null;
  _guestTrial: boolean;
  initialize: (force?: boolean) => Promise<void>;
  /** DB profiles 반영 후 화면 테넌트·헤더 갱신 (업무 컨텍스트 전환 등) */
  refreshAuth: () => Promise<void>;
  /** /try — 회원가입 없이 무료 체험 */
  enterGuestTrial: () => void;
  leaveGuestTrial: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  tenantId: null,
  isSuperAdmin: false,
  isOrphaned: false,
  isLoading: true,
  _initialized: false,
  _fetchPromise: null,
  _guestTrial: false,

  enterGuestTrial: () => {
    set({
      user: null,
      profile: {
        role: "guest",
        tenant_id: GUEST_TRIAL_TENANT_ID,
        tenants: {
          plan: "free",
          name: "FloXync Trial",
          status: "active",
        },
      },
      tenantId: GUEST_TRIAL_TENANT_ID,
      isSuperAdmin: false,
      isOrphaned: false,
      isLoading: false,
      _initialized: true,
      _fetchPromise: null,
      _guestTrial: true,
    });
  },

  leaveGuestTrial: () => {
    clearGuestBrowseCookie();
    set({
      _guestTrial: false,
      _initialized: false,
      _fetchPromise: null,
      user: null,
      profile: null,
      tenantId: null,
      isSuperAdmin: false,
      isOrphaned: false,
      isLoading: true,
    });
  },

  refreshAuth: async () => {
    if (get()._guestTrial) return;
    set({ _initialized: false, _fetchPromise: null });
    await get().initialize();
  },

  initialize: async (force = false) => {
    if (get()._guestTrial && !force) return;
    // 이미 초기화 완료 → 스킵 (강제 갱신 제외). 단 tenants.name 이 비어 있으면 보강 시도.
    if (get()._initialized && !force) {
      void enrichCachedProfileTenant(set, get);
      return;
    }
    
    // 이미 진행 중인 fetch가 있으면 그걸 기다림 (중복 방지)
    const existing = get()._fetchPromise;
    if (existing) {
      await existing;
      return;
    }

    const promise = (async () => {
      registerAuthOfflineListener();
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          if (readGuestBrowseCookie()) {
            get().enterGuestTrial();
            return;
          }
          if (shouldUseOfflineAuthBypass() && applyCachedAuth(set)) {
            void enrichCachedProfileTenant(set, get);
            return;
          }
          set({ isLoading: false, _initialized: true, _fetchPromise: null, isSuperAdmin: false });
          return;
        }

        if (get()._guestTrial) {
          clearGuestBrowseCookie();
          set({ _guestTrial: false });
        }

        const isMasterEmail = isPlatformSuperEmail(user.email);
        set({ user });

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("*, org_work_tenant_id")
          .eq("id", user.id)
          .maybeSingle();

        if (!profileError && data) {
          let homeTenant: Record<string, unknown> | null = null;
          if (data.tenant_id) {
            const { data: ht } = await supabase
              .from("tenants")
              .select(
                "plan, name, logo_url, contact_phone, address, subscription_end, subscription_start, status"
              )
              .eq("id", data.tenant_id)
              .maybeSingle();
            homeTenant = ht;
          }

          // ✅ 마스터 이메일 또는 super_admin 역할에게 권한 부여
          if (isMasterEmail || data.role === 'super_admin') {
            data.role = 'super_admin';
            if (!homeTenant) homeTenant = { plan: 'pro', name: 'LilyMag Admin' };
            else homeTenant = { ...homeTenant, plan: 'pro' };
            set({ isSuperAdmin: true });
          } else {
            set({ isSuperAdmin: false });
          }

          const effectiveTenantId = data.org_work_tenant_id ?? data.tenant_id;
          let tenantsInfo = homeTenant;
          if (data.org_work_tenant_id) {
            const { data: workTenant } = await supabase
              .from("tenants")
              .select(
                "plan, name, logo_url, contact_phone, address, subscription_end, subscription_start, status"
              )
              .eq("id", data.org_work_tenant_id)
              .maybeSingle();
            if (workTenant) tenantsInfo = workTenant;
          }
          tenantsInfo = await enrichTenantProfile(supabase, effectiveTenantId, tenantsInfo);
          const merged = { ...data, tenants: tenantsInfo };
          
          // Check for orphaned profiles (non-admins with no tenant_id) — org_admin 은 본사 전용 계정 허용
          const isOrphaned =
            !data.tenant_id && data.role !== "super_admin" && data.role !== "org_admin";
          set({ profile: merged, tenantId: effectiveTenantId, isOrphaned });
          persistAuthCache(user, merged, effectiveTenantId, get().isSuperAdmin, isOrphaned);
        } else if (isPlatformSuperEmail(user.email)) {
          const defaultTenantId = '50551f4c-0b6b-45ab-8db9-047ca3ff88de';
          const mockProfile = {
            role: 'super_admin',
            tenant_id: defaultTenantId,
            email: user.email,
            tenants: { plan: 'pro', name: 'LilyMag Admin' }
          };
          set({ profile: mockProfile, tenantId: defaultTenantId, isSuperAdmin: true });
          persistAuthCache(user, mockProfile, defaultTenantId, true, false);
        } else {
          set({ isSuperAdmin: false });
        }
      } catch (error) {
        console.error("Error fetching user session:", error);
        const msg = error instanceof Error ? error.message : String(error);
        if (isOfflineAuthError(msg) && shouldUseOfflineAuthBypass() && applyCachedAuth(set)) {
          void enrichCachedProfileTenant(set, get);
          return;
        }
      } finally {
        set({ isLoading: false, _initialized: true, _fetchPromise: null });
      }
    })();

    set({ _fetchPromise: promise });
    await promise;
  },
}));
