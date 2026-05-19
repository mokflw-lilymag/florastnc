"use client";

import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { isPlatformSuperEmail } from '@/lib/platform-super-emails';
import {
  clearGuestBrowseCookie,
  GUEST_TRIAL_TENANT_ID,
  readGuestBrowseCookie,
} from '@/lib/subscription/guest-trial';

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
    // 이미 초기화 완료 → 스킵 (강제 갱신 제외)
    if (get()._initialized && !force) return;
    
    // 이미 진행 중인 fetch가 있으면 그걸 기다림 (중복 방지)
    const existing = get()._fetchPromise;
    if (existing) {
      await existing;
      return;
    }

    const promise = (async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          if (readGuestBrowseCookie()) {
            get().enterGuestTrial();
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
          const merged = { ...data, tenants: tenantsInfo };
          
          // Check for orphaned profiles (non-admins with no tenant_id) — org_admin 은 본사 전용 계정 허용
          const isOrphaned =
            !data.tenant_id && data.role !== "super_admin" && data.role !== "org_admin";
          set({ profile: merged, tenantId: effectiveTenantId, isOrphaned });
        } else if (isPlatformSuperEmail(user.email)) {
          const defaultTenantId = '50551f4c-0b6b-45ab-8db9-047ca3ff88de';
          const mockProfile = {
            role: 'super_admin',
            tenant_id: defaultTenantId,
            email: user.email,
            tenants: { plan: 'pro', name: 'LilyMag Admin' }
          };
          set({ profile: mockProfile, tenantId: defaultTenantId, isSuperAdmin: true });
        } else {
          set({ isSuperAdmin: false });
        }
      } catch (error) {
        console.error("Error fetching user session:", error);
      } finally {
        set({ isLoading: false, _initialized: true, _fetchPromise: null });
      }
    })();

    set({ _fetchPromise: promise });
    await promise;
  },
}));
