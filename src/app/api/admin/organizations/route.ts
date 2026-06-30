import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminDataLoadFailed,
  errAdminForbidden,
  errAdminServerMisconfigured,
  errAdminInvalidBody,
  errAdminOperationFailed,
} from "@/lib/admin/admin-api-errors";

/**
 * 플랫폼 슈퍼관리자 이메일 목록 (점주 목록 및 비즈니스 데이터 노출 방지용 가드)
 */
const SUPER_ADMIN_EMAILS = ["lilymag0301@gmail.com"];

/**
 * 다매장 조직 목록 + 지점 목록 + 소속 멤버 목록 (super_admin 전용)
 */
export async function GET(req: Request) {
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

  // 1) 조직 목록 조회
  const { data: orgs, error: oErr } = await admin
    .from("organizations")
    .select("id, name, created_at, hq_tenant_id")
    .order("created_at", { ascending: false });

  if (oErr) {
    console.error("admin organizations list:", oErr);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }

  // 2) 지점 목록 조회
  const { data: tenants, error: tErr } = await admin
    .from("tenants")
    .select("id, name, organization_id, plan")
    .order("name", { ascending: true });

  if (tErr) {
    console.error("admin organizations tenants:", tErr);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }

  // 3) 각 지점별 점주(tenant_admin / org_admin) 이메일 일괄 매핑 (수퍼관리자 계정은 원천 제외)
  const tenantIds = tenants?.map((t) => t.id) ?? [];
  const emailMapByTenant: Record<string, string[]> = {};
  if (tenantIds.length > 0) {
    const { data: admins, error: aErr } = await admin
      .from("profiles")
      .select("tenant_id, email")
      .in("tenant_id", tenantIds)
      .in("role", ["tenant_admin", "org_admin"]);

    if (!aErr && admins) {
      for (const a of admins) {
        if (!a.tenant_id || !a.email) continue;
        if (SUPER_ADMIN_EMAILS.includes(a.email.toLowerCase())) continue;

        if (!emailMapByTenant[a.tenant_id]) {
          emailMapByTenant[a.tenant_id] = [];
        }
        emailMapByTenant[a.tenant_id].push(a.email);
      }
    }
  }

  // 4) 각 조직별 소속 지점들의 점주 이메일 리스트 수집 (본점 점주 제외한 일반 지점 점주들)
  const nonHqBranchEmailsByOrg: Record<string, string[]> = {};
  for (const org of orgs ?? []) {
    const hqTenantId = org.hq_tenant_id as string | null;
    const orgBranches = (tenants ?? []).filter(
      (t) => t.organization_id === org.id && t.id !== hqTenantId
    );
    const emails: string[] = [];
    for (const b of orgBranches) {
      const eList = emailMapByTenant[b.id] ?? [];
      emails.push(...eList);
    }
    nonHqBranchEmailsByOrg[org.id] = emails.map((e) => e.toLowerCase());
  }

  // 5) 조직별 본사 사용자(organization_members) 목록 조회 (중복 노출 제거 가드 적용)
  const orgIds = orgs?.map((o) => o.id) ?? [];
  const membersByOrg: Record<string, { user_id: string; email: string }[]> = {};
  if (orgIds.length > 0) {
    const { data: mems, error: mErr } = await admin
      .from("organization_members")
      .select("organization_id, user_id")
      .in("organization_id", orgIds);

    if (!mErr && mems) {
      const userIds = [...new Set(mems.map((m) => m.user_id))];
      let emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profs } = await admin
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
        emailMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.email]));
      }

      for (const row of mems) {
        const email = emailMap[row.user_id] ?? row.user_id;
        const lowerEmail = email.toLowerCase();
        
        // A) 최고관리자 이메일 노출 원천 차단
        if (SUPER_ADMIN_EMAILS.includes(lowerEmail)) continue;

        // B) 지점 테이블에 이미 노출되어 있는 일반 지점의 점주 이메일은 중복 제거를 위해 하단 목록에서 제외
        const nonHqEmails = nonHqBranchEmailsByOrg[row.organization_id] ?? [];
        if (nonHqEmails.includes(lowerEmail)) continue;

        if (!membersByOrg[row.organization_id]) {
          membersByOrg[row.organization_id] = [];
        }
        membersByOrg[row.organization_id].push({
          user_id: row.user_id,
          email,
        });
      }
    }
  }

  const countByOrg = new Map<string, number>();
  for (const t of tenants ?? []) {
    const oid = t.organization_id as string | null;
    if (!oid) continue;
    countByOrg.set(oid, (countByOrg.get(oid) ?? 0) + 1);
  }

  const organizations = (orgs ?? []).map((o) => ({
    id: o.id as string,
    name: String(o.name ?? ""),
    created_at: o.created_at as string,
    tenantCount: countByOrg.get(o.id as string) ?? 0,
    hqTenantId: o.hq_tenant_id as string | null,
  }));

  const mappedTenants = (tenants ?? []).map((t) => ({
    id: t.id as string,
    name: String(t.name ?? ""),
    organization_id: t.organization_id as string | null,
    plan: t.plan as string | null,
    adminEmails: emailMapByTenant[t.id] ?? [],
  }));

  return NextResponse.json({ 
    organizations, 
    tenants: mappedTenants, 
    members: membersByOrg 
  });
}

/**
 * 신규 다매장 조직 생성 (super_admin 전용)
 */
export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const body = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, body?.uiLocale);

  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const name = (body?.name as string | undefined)?.trim();
  if (!name) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const { data, error } = await admin
    .from("organizations")
    .insert({ name })
    .select("id, name")
    .single();

  if (error) {
    console.error("admin organizations create:", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, organization: data });
}

/**
 * 다매장 조직 정보 수정 (대표 매장 지정 및 이에 따른 본사 사용자 자동 갱신, super_admin 전용)
 */
export async function PATCH(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const body = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, body?.uiLocale);

  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const organizationId = body?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  // 1) 기존 대표 매장 ID 조회
  const { data: currentOrg, error: curErr } = await admin
    .from("organizations")
    .select("hq_tenant_id")
    .eq("id", organizationId)
    .maybeSingle();

  if (curErr) {
    console.error("admin organizations select current:", curErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const updatePayload: Record<string, any> = {};
  if (body.name !== undefined) {
    updatePayload.name = (body.name as string)?.trim();
  }
  if (body.hqTenantId !== undefined) {
    updatePayload.hq_tenant_id = body.hqTenantId || null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }

  // 2) 대표 매장(hq_tenant_id)이 변경되는 경우 비즈니스 로직 처리
  if (body.hqTenantId !== undefined) {
    const prevHqTenantId = currentOrg?.hq_tenant_id as string | null;
    const nextHqTenantId = body.hqTenantId as string | null;

    if (prevHqTenantId !== nextHqTenantId) {
      // A) 이전 대표 매장 소속 관리자 해제 (profiles.role ➔ tenant_admin, organization_members 삭제)
      if (prevHqTenantId) {
        const { data: prevAdmins } = await admin
          .from("profiles")
          .select("id, email")
          .eq("tenant_id", prevHqTenantId)
          .eq("role", "org_admin");

        if (prevAdmins && prevAdmins.length > 0) {
          const prevAdminIds = prevAdmins
            .filter((p) => !SUPER_ADMIN_EMAILS.includes((p.email ?? "").toLowerCase()))
            .map((p) => p.id);
          
          if (prevAdminIds.length > 0) {
            await admin
              .from("profiles")
              .update({ role: "tenant_admin" })
              .in("id", prevAdminIds);

            await admin
              .from("organization_members")
              .delete()
              .eq("organization_id", organizationId)
              .in("user_id", prevAdminIds);
          }
        }
      }

      // B) 신규 대표 매장 소속 관리자 배정 (profiles.role ➔ org_admin, organization_members 추가)
      if (nextHqTenantId) {
        const { data: nextAdmins } = await admin
          .from("profiles")
          .select("id, email")
          .eq("tenant_id", nextHqTenantId)
          .in("role", ["tenant_admin", "org_admin"]);

        if (nextAdmins && nextAdmins.length > 0) {
          const nextAdminIds = nextAdmins
            .filter((p) => !SUPER_ADMIN_EMAILS.includes((p.email ?? "").toLowerCase()))
            .map((p) => p.id);

          if (nextAdminIds.length > 0) {
            await admin
              .from("profiles")
              .update({ role: "org_admin" })
              .in("id", nextAdminIds);

            const insRows = nextAdminIds.map((uid) => ({
              organization_id: organizationId,
              user_id: uid,
              role: "org_admin",
            }));

            const { error: insErr } = await admin
              .from("organization_members")
              .upsert(insRows, { onConflict: "organization_id,user_id" });

            if (insErr) {
              console.error("[PATCH /api/admin/organizations] insert organization_members:", insErr);
            }
          }
        }
      }
    }
  }

  // 3) organizations 테이블 실제 업데이트
  const { error } = await admin
    .from("organizations")
    .update(updatePayload)
    .eq("id", organizationId);

  if (error) {
    console.error("admin organizations update:", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * 다매장 조직 자체 제거 (지점 연결 해제 및 소속 멤버 초기화 후 완전 삭제, super_admin 전용)
 */
export async function DELETE(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const sp = new URL(req.url).searchParams;
  const orgId = sp.get("organizationId");
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));

  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  if (!orgId) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  // A) 해당 조직에 묶여있던 지점들 연결 해제 및 대표 매장(hq_tenant_id) 지정 해제
  const { error: tErr } = await admin
    .from("tenants")
    .update({ organization_id: null })
    .eq("organization_id", orgId);

  if (tErr) {
    console.error("[DELETE /api/admin/organizations] unlink tenants:", tErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  // B) 조직에 소속된 멤버(profiles.role 원복 및 organization_members 삭제)
  const { data: mems } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId);

  if (mems && mems.length > 0) {
    const userIds = mems.map((m) => m.user_id);
    
    // profiles 역할 원복 (tenant_admin)
    await admin
      .from("profiles")
      .update({ role: "tenant_admin" })
      .in("id", userIds)
      .eq("role", "org_admin"); // org_admin 였던 유저들만 복구

    // 멤버 테이블 제거
    await admin
      .from("organization_members")
      .delete()
      .eq("organization_id", orgId);
  }

  // C) 최종 organizations 테이블에서 레코드 삭제
  const { error: dErr } = await admin
    .from("organizations")
    .delete()
    .eq("id", orgId);

  if (dErr) {
    console.error("[DELETE /api/admin/organizations] delete row:", dErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
