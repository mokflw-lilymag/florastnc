import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import type { AuthedGate } from "@/lib/auth-api-guards";
import { errAdminForbidden, errAdminServerMisconfigured } from "@/lib/admin/admin-api-errors";
import { isSuperAdminProfile } from "@/lib/support-tickets/access";

export type SupportDbGate =
  | { ok: true; admin: SupabaseClient }
  | { ok: false; response: NextResponse };

export function requireSupportDb(bl?: string): SupportDbGate {
  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: errAdminServerMisconfigured(bl ?? "ko") }, { status: 500 }),
    };
  }
  return { ok: true, admin };
}

export function requireSuperAdmin(
  gate: Extract<AuthedGate, { ok: true }>,
  bl?: string,
): SupportDbGate | { ok: false; response: NextResponse } {
  if (!isSuperAdminProfile(gate.profile, gate.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: errAdminForbidden(bl ?? "ko") }, { status: 403 }),
    };
  }
  return requireSupportDb(bl);
}

export async function logSupportAudit(
  admin: SupabaseClient,
  ticketId: string,
  action: string,
  actorUserId: string | null,
  meta: Record<string, unknown> = {},
) {
  await admin.from("support_ticket_audit").insert({
    ticket_id: ticketId,
    action,
    actor_user_id: actorUserId,
    meta,
  });
}

export async function resolveAuthorUiLocale(
  admin: SupabaseClient,
  tenantId: string,
): Promise<string> {
  const { data } = await admin
    .from("system_settings")
    .select("data")
    .eq("id", `settings_${tenantId}`)
    .maybeSingle();
  const uiLocale = (data?.data as { uiLocale?: string } | null)?.uiLocale;
  return uiLocale || "ko";
}
