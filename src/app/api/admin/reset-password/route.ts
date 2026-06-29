import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminForbidden, errAdminServerMisconfigured } from "@/lib/admin/admin-api-errors";

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));

  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  try {
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: "userId and newPassword are required" }, { status: 400 });
    }

    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("Error resetting password:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in reset password endpoint:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
