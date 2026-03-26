"use client";

import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';

interface AuthState {
  user: any;
  profile: any;
  tenantId: string | null;
  isLoading: boolean;
  _initialized: boolean;
  _fetchPromise: Promise<void> | null;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  tenantId: null,
  isLoading: true,
  _initialized: false,
  _fetchPromise: null,

  initialize: async () => {
    // 이미 초기화 완료 → 스킵
    if (get()._initialized) return;
    
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
          set({ isLoading: false, _initialized: true, _fetchPromise: null });
          return;
        }

        set({ user });

        // Fetch user's profile with tenant plan
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("*, tenants(plan, name, logo_url, contact_phone, address)")
          .eq("id", user.id)
          .maybeSingle();

        if (!profileError && data) {
          // ✅ lilymag0301@gmail.com 사용자에 대해 하드코딩 권한 부여
          if (user.email === 'lilymag0301@gmail.com') {
            data.role = 'super_admin';
            if (!data.tenants) data.tenants = { plan: 'pro', name: 'LilyMag Admin' };
            else data.tenants.plan = 'pro';
          }
          set({ profile: data, tenantId: data.tenant_id });
        } else if (user.email === 'lilymag0301@gmail.com') {
          const defaultTenantId = '50551f4c-0b6b-45ab-8db9-047ca3ff88de';
          const mockProfile = {
            role: 'super_admin',
            tenant_id: defaultTenantId,
            email: user.email,
            tenants: { plan: 'pro', name: 'LilyMag Admin' }
          };
          set({ profile: mockProfile, tenantId: defaultTenantId });
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
