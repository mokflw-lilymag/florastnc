"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function useAuth() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          setIsLoading(false);
          return;
        }
        
        setUser(user);

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
          setProfile(data);
          setTenantId(data.tenant_id);
        } else if (user.email === 'lilymag0301@gmail.com') {
          // 프로필이 없는 경우에도 관리자 정보는 반환
          const defaultTenantId = '50551f4c-0b6b-45ab-8db9-047ca3ff88de';
          const mockProfile = {
            role: 'super_admin',
            tenant_id: defaultTenantId,
            email: user.email,
            tenants: { plan: 'pro', name: 'LilyMag Admin' }
          };
          setProfile(mockProfile);
          setTenantId(defaultTenantId);
        }
      } catch (error) {
        console.error("Error fetching user session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, profile, tenantId, isLoading };
}
