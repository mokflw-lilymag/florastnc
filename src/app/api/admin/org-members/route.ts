import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { isPlatformSuperEmail } from "@/lib/platform-super-emails";
import {
  errAdminForbidden,
  errAdminInvalidBody,
  errAdminOrgMemberMutationFailed,
  errAdminOperationFailed,
  errAdminOrgProfileNotFound,
  errAdminServerMisconfigured,
  errAdminUnauthorized,
} from "@/lib/admin/admin-api-errors";
import { loadOrgDelegateSnapshot } from "@/lib/hq/org-delegate-members";
import { pickUiText } from "@/i18n/pick-ui-text";

async function assertSuperAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email?: string
) {
  if (email && isPlatformSuperEmail(email)) return true;
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

  if (!(await assertSuperAdmin(supabase, user.id, user.email))) {
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
    const snapshot = await loadOrgDelegateSnapshot(admin, organizationId);
    const targetLower = email.toLowerCase();
    if (snapshot?.hqRepEmails.includes(targetLower)) {
      return NextResponse.json(
        {
          error: pickUiText(
            bl,
            "대표 본사 지점 점주는 자동 연동됩니다.",
            "HQ branch manager is linked automatically.",
          ),
        },
        { status: 400 },
      );
    }
    const already = snapshot?.members.some((m) => m.userId === targetProfile.id);
    if (already) {
      return NextResponse.json(
        { error: pickUiText(bl, "이미 본사 사용자입니다.", "Already an HQ user.") },
        { status: 400 },
      );
    }
    if (snapshot && !snapshot.canAddDelegate) {
      return NextResponse.json(
        {
          error: pickUiText(
            bl,
            `추가 담당자는 최대 ${snapshot.delegateSlotMax}명입니다. 본사 화면에서 기존 담당자를 삭제한 뒤 시도하세요.`,
            `At most ${snapshot.delegateSlotMax} delegate allowed.`,
          ),
        },
        { status: 400 },
      );
    }

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
