"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function useAuth() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
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

        // Fetch user's tenant_id from profiles
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.id)
          .maybeSingle();
          
        if (!profileError && data) {
          setTenantId(data.tenant_id);
        }
      } catch (error) {
        console.error("Error fetching user session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, tenantId, isLoading };
}
