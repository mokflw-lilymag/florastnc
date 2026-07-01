import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { pickUiText } from "@/i18n/pick-ui-text";
import {
  assertCallerIsOrgAdmin,
  HQ_DELEGATE_SLOT_MAX,
  loadOrgDelegateSnapshot,
  resolveOrgAdminOrganizationId,
} from "@/lib/hq/org-delegate-members";
import {
  errAdminForbidden,
  errAdminInvalidBody,
  errAdminOperationFailed,
  errAdminOrgProfileNotFound,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

function errDelegateSlotFull(bl: string) {
  return pickUiText(
    bl,
    `본사 추가 담당자는 최대 ${HQ_DELEGATE_SLOT_MAX}명까지 등록할 수 있습니다.`,
    `You can register at most ${HQ_DELEGATE_SLOT_MAX} additional HQ delegate.`,
    `Chỉ được thêm tối đa ${HQ_DELEGATE_SLOT_MAX} người phụ trách HQ.`,
    `本部の追加担当者は最大${HQ_DELEGATE_SLOT_MAX}名までです。`,
  );
}

function errAlreadyMember(bl: string) {
  return pickUiText(
    bl,
    "이미 본사 사용자로 등록된 이메일입니다.",
    "This email is already an HQ user for the organization.",
    "Email này đã là user HQ của tổ chức.",
    "このメールは既に本部ユーザーです。",
  );
}

function errHqRepAuto(bl: string) {
  return pickUiText(
    bl,
    "대표 본사 지점 점주는 자동으로 본사 관리자에 연결됩니다. 별도 추가가 필요 없습니다.",
    "The HQ branch manager is linked automatically. No manual add is needed.",
    "Quản lý chi nhánh HQ được liên kết tự động.",
    "代表本店の店長は自動連携されます。",
  );
}

function errNotOrgAdmin(bl: string) {
  return pickUiText(
    bl,
    "본사 관리자(org_admin)만 담당자를 등록할 수 있습니다.",
    "Only HQ admins (org_admin) can manage delegates.",
    "Chỉ org_admin mới quản lý được.",
    "org_admin のみ登録できます。",
  );
}

function errCannotRemoveHqRep(bl: string) {
  return pickUiText(
    bl,
    "대표 본사 점주 계정은 삭제할 수 없습니다.",
    "The HQ representative account cannot be removed.",
    "Không thể xóa tài khoản đại diện HQ.",
    "代表本店アカウントは削除できません。",
  );
}

/** 본사(org_admin) — 추가 담당자 1명 등록·조회 */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const bl = await hqApiUiBase(req, new URL(req.url).searchParams.get("uiLocale"));
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 503 });
  }

  const organizationId = await resolveOrgAdminOrganizationId(admin, gate.userId);
  if (!organizationId) {
    return NextResponse.json({ error: errNotOrgAdmin(bl) }, { status: 403 });
  }

  const snapshot = await loadOrgDelegateSnapshot(admin, organizationId);
  if (!snapshot) {
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json(snapshot);
}

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const organizationId = (body?.organizationId as string | undefined) ?? null;
  const email = (body?.email as string | undefined)?.trim().toLowerCase();
  const action = body?.action as "add" | "remove" | undefined;

  if (!email || (action !== "add" && action !== "remove")) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 503 });
  }

  let orgId = organizationId;
  if (!orgId) {
    orgId = await resolveOrgAdminOrganizationId(admin, gate.userId);
  }
  if (!orgId) {
    return NextResponse.json({ error: errNotOrgAdmin(bl) }, { status: 403 });
  }

  const allowed = await assertCallerIsOrgAdmin(admin, gate.userId, orgId);
  if (!allowed) {
    return NextResponse.json({ error: errNotOrgAdmin(bl) }, { status: 403 });
  }

  const snapshot = await loadOrgDelegateSnapshot(admin, orgId);
  if (!snapshot) {
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const { data: targetProfile, error: pErr } = await admin
    .from("profiles")
    .select("id, tenant_id, role, email")
    .eq("email", email)
    .maybeSingle();

  if (pErr || !targetProfile) {
    return NextResponse.json({ error: errAdminOrgProfileNotFound(bl) }, { status: 404 });
  }

  const targetLower = (targetProfile.email ?? email).toLowerCase();
  const existing = snapshot.members.find((m) => m.userId === targetProfile.id);

  if (action === "add") {
    if (snapshot.hqRepEmails.includes(targetLower)) {
      return NextResponse.json({ error: errHqRepAuto(bl) }, { status: 400 });
    }
    if (existing) {
      return NextResponse.json({ error: errAlreadyMember(bl) }, { status: 400 });
    }
    if (!snapshot.canAddDelegate) {
      return NextResponse.json({ error: errDelegateSlotFull(bl) }, { status: 400 });
    }

    const { error: insErr } = await admin.from("organization_members").insert({
      organization_id: orgId,
      user_id: targetProfile.id,
      role: "org_admin",
    });

    if (insErr && insErr.code !== "23505") {
      console.error("[hq/org-members] insert", insErr);
      return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
    }

    if (!targetProfile.tenant_id && targetProfile.role !== "super_admin") {
      await admin.from("profiles").update({ role: "org_admin" }).eq("id", targetProfile.id);
    }

    return NextResponse.json({ ok: true, userId: targetProfile.id });
  }

  if (!existing) {
    return NextResponse.json({ error: errAdminOrgProfileNotFound(bl) }, { status: 404 });
  }
  if (existing.isHqRep) {
    return NextResponse.json({ error: errCannotRemoveHqRep(bl) }, { status: 400 });
  }

  const { error: delErr } = await admin
    .from("organization_members")
    .delete()
    .eq("organization_id", orgId)
    .eq("user_id", targetProfile.id);

  if (delErr) {
    console.error("[hq/org-members] delete", delErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
