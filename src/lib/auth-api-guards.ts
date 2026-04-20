import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isPlatformSuperEmail } from "@/lib/platform-super-emails";

/** 클라이언트와 동일: DB에 super가 아니어도 운영 계정 이메일은 슈퍼 권한으로 처리 */
export function effectiveIsSuperAdmin(profile: { role?: string } | null, email: string | undefined): boolean {
  if (profile?.role === "super_admin") return true;
  if (isPlatformSuperEmail(email)) return true;
  return false;
}

export type AuthedGate =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      userId: string;
      email: string | undefined;
      profile: { role?: string } | null;
    }
  | { ok: false; response: NextResponse };

export async function requireAuthenticated(): Promise<AuthedGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { ok: true, supabase, userId: user.id, email: user.email ?? undefined, profile };
}

export async function isOrgAdminForOrganization(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data?.role === "org_admin";
}
