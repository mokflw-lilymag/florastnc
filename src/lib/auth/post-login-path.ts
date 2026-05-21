import type { SupabaseClient } from "@supabase/supabase-js";
import { effectiveIsSuperAdmin } from "@/lib/auth-api-guards";

/** 로그인·OAuth 직후 최종 이동 경로 (대시보드 레이아웃 로드 전 분기) */
export async function resolvePostLoginPath(
  supabase: SupabaseClient,
  userId: string,
  email: string | undefined
): Promise<string> {
  const [{ data: profile }, { count: orgMembershipCount, error: orgMemberError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("role, tenant_id")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("organization_members")
        .select("organization_id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

  const isSuperAdmin = effectiveIsSuperAdmin(profile, email);
  const isOrgUser = !orgMemberError && (orgMembershipCount ?? 0) > 0;

  if (!isSuperAdmin && !profile?.tenant_id && !isOrgUser) {
    return "/onboarding";
  }
  return "/dashboard";
}
