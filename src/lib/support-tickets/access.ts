import type { SupabaseClient } from "@supabase/supabase-js";
import { effectiveIsSuperAdmin } from "@/lib/auth-api-guards";
import type { SupportTicketRow } from "@/lib/support-tickets/types";

export async function resolveUserTenantId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, org_work_tenant_id")
    .eq("id", userId)
    .maybeSingle();
  return (profile?.org_work_tenant_id ?? profile?.tenant_id) as string | null;
}

export function canOpenTicketDetail(
  ticket: Pick<SupportTicketRow, "author_user_id" | "deleted_at">,
  userId: string,
  isAdmin: boolean,
): boolean {
  if (ticket.deleted_at) return isAdmin;
  if (isAdmin) return true;
  return ticket.author_user_id === userId;
}

export function isSuperAdminProfile(
  profile: { role?: string } | null,
  email: string | undefined,
): boolean {
  return effectiveIsSuperAdmin(profile, email);
}
