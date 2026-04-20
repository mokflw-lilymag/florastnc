import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

async function assertSuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return profile?.role === "super_admin";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await assertSuperAdmin(supabase, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const organizationId = body?.organizationId as string | undefined;
  const email = (body?.email as string | undefined)?.trim().toLowerCase();
  const action = body?.action as "add" | "remove" | undefined;

  if (!organizationId || !email || (action !== "add" && action !== "remove")) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { data: targetProfile, error: pErr } = await admin
    .from("profiles")
    .select("id, tenant_id, role")
    .eq("email", email)
    .maybeSingle();

  if (pErr || !targetProfile) {
    return NextResponse.json({ error: "해당 이메일의 프로필이 없습니다." }, { status: 404 });
  }

  if (action === "add") {
    const { error: insErr } = await admin.from("organization_members").insert({
      organization_id: organizationId,
      user_id: targetProfile.id,
      role: "org_admin",
    });

    if (insErr && insErr.code !== "23505") {
      console.error("[org-members] insert", insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
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
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
