import { NextResponse } from "next/server";
import { requireAuthenticated, effectiveIsSuperAdmin } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminForbidden, errAdminServerMisconfigured } from "@/lib/admin/admin-api-errors";

export async function requireEmailHubAdmin(req: Request, uiLocale?: string | null) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return { ok: false as const, response: gate.response };

  const bl = await hqApiUiBase(req, uiLocale);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 }),
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 }),
    };
  }

  return { ok: true as const, gate, admin, userId: gate.userId };
}
