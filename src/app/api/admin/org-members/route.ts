import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminForbidden,
  errAdminInvalidBody,
  errAdminOrgMemberMutationFailed,
  errAdminOperationFailed,
  errAdminOrgProfileNotFound,
  errAdminServerMisconfigured,
  errAdminUnauthorized,
} from "@/lib/admin/admin-api-errors";

async function assertSuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return profile?.role === "super_admin";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const blGate = await hqApiUiBase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: errAdminUnauthorized(blGate) }, { status: 401 });

  if (!(await assertSuperAdmin(supabase, user.id))) {
    return NextResponse.json({ error: errAdminForbidden(blGate) }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(blGate) }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const organizationId = body?.organizationId as string | undefined;
  const email = (body?.email as string | undefined)?.trim().toLowerCase();
  const action = body?.action as "add" | "remove" | undefined;

  if (!organizationId || !email || (action !== "add" && action !== "remove")) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }

  const { data: targetProfile, error: pErr } = await admin
    .from("profiles")
    .select("id, tenant_id, role")
    .eq("email", email)
    .maybeSingle();

  if (pErr || !targetProfile) {
    return NextResponse.json({ error: errAdminOrgProfileNotFound(bl) }, { status: 404 });
  }

  if (action === "add") {
    const { error: insErr } = await admin.from("organization_members").insert({
      organization_id: organizationId,
      user_id: targetProfile.id,
      role: "org_admin",
    });

    if (insErr && insErr.code !== "23505") {
      console.error("[org-members] insert", insErr);
      return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
    }

    if (!targetProfile.tenant_id && targetProfile.role !== "super_admin") {
      await admin.from("profiles").update({ role: "org_admin" }).eq("id", targetProfile.id);
    }

    return NextResponse.json({ ok: true, userId: targetProfile.id });
  }

  const { error: delErr } = await admin
    .from("organization_members")
    .delete()
    .eq("organization_id", organizationId)
    .eq("user_id", targetProfile.id);

  if (delErr) {
    console.error("[org-members] delete", delErr);
    return NextResponse.json({ error: errAdminOrgMemberMutationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
