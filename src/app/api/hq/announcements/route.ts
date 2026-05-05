import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { normalizeAttachmentUrlList, publicUrlToOrgAnnouncementStoragePath } from "@/lib/org-announcement-assets";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAnnComposeFieldsRequired,
  errAnnRlsDenied,
  errAnnSchemaLegacy,
  errAnnTableMissing,
} from "@/lib/hq/hq-announcements-api-errors";
import {
  errAdminForbidden,
  errAdminOperationFailed,
  errAdminUnauthorized,
} from "@/lib/admin/admin-api-errors";

/** 테이블·스키마 미적용 등으로 공지 조회가 불가할 때 — 500 대신 빈 목록 */
function shouldReturnEmptyAnnouncements(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  const code = String(error.code ?? "");
  // 컬럼 누락(구 스키마) 등은 여기서 제외 — "does not exist" 만으로는 테이블 부재와 구분 불가
  if (code === "42703") return false;
  if (msg.includes("column") && msg.includes("does not exist")) return false;
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    (msg.includes("does not exist") &&
      !msg.includes("column") &&
      (msg.includes("relation") || msg.includes("table"))) ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache") ||
    (msg.includes("organization_announcements") && msg.includes("relation"))
  );
}

function shouldIgnoreReadsTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  const code = String(error.code ?? "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("organization_announcement_reads") ||
    msg.includes("relation")
  );
}

async function resolveOrganizationIdsForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string[]> {
  const ids = new Set<string>();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);
  for (const m of memberships ?? []) ids.add(m.organization_id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("organization_id")
      .eq("id", profile.tenant_id)
      .maybeSingle();
    if (tenant?.organization_id) ids.add(tenant.organization_id);
  }

  return [...ids];
}

function isLegacyBoardSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  const code = String(error.code ?? "");
  return (
    code === "42703" ||
    (msg.includes("expires_at") && msg.includes("does not exist")) ||
    (msg.includes("attachment_urls") && msg.includes("does not exist"))
  );
}

function parseAttachmentUrlsRow(row: Record<string, unknown>): string[] {
  const raw = row.attachment_urls;
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  return [];
}

async function purgeExpiredAnnouncementsAndAssets() {
  const admin = createAdminClient();
  if (!admin) return;
  const now = new Date().toISOString();
  const { data: expired, error: selErr } = await admin
    .from("organization_announcements")
    .select("attachment_urls")
    .lt("expires_at", now)
    .limit(200);
  if (selErr) return;
  const paths: string[] = [];
  for (const row of expired ?? []) {
    for (const url of parseAttachmentUrlsRow(row as Record<string, unknown>)) {
      const p = publicUrlToOrgAnnouncementStoragePath(url);
      if (p) paths.push(p);
    }
  }
  if (paths.length > 0) {
    const { error: rmErr } = await admin.storage.from("org_announcements").remove(paths);
    if (rmErr) console.warn("[hq/announcements purge] storage remove", rmErr.message);
  }
  await admin.from("organization_announcements").delete().lt("expires_at", now);
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });

  let orgIds = await resolveOrganizationIdsForUser(supabase, user.id);

  const branchOnly =
    sp.get("branchOnly") === "1" ||
    sp.get("branchOnly") === "true";

  if (branchOnly) {
    const { data: profileBranch } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileBranch?.tenant_id) {
      const { data: tenantBranch } = await supabase
        .from("tenants")
        .select("organization_id")
        .eq("id", profileBranch.tenant_id)
        .maybeSingle();
      const branchOrgId = tenantBranch?.organization_id as string | null | undefined;
      if (branchOrgId) {
        orgIds = orgIds.filter((id) => id === branchOrgId);
      } else {
        orgIds = [];
      }
    }
  }

  if (orgIds.length === 0) {
    return NextResponse.json({ announcements: [] });
  }

  await purgeExpiredAnnouncementsAndAssets();

  const now = new Date().toISOString();
  let data: Record<string, unknown>[] | null = null;
  let error = null as { code?: string; message?: string } | null;

  const modern = await supabase
    .from("organization_announcements")
    .select("id, organization_id, title, body, priority, created_at, expires_at, attachment_urls")
    .in("organization_id", orgIds)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(50);

  if (modern.error && isLegacyBoardSchemaError(modern.error)) {
    const legacy = await supabase
      .from("organization_announcements")
      .select("id, organization_id, title, body, priority, created_at")
      .in("organization_id", orgIds)
      .order("created_at", { ascending: false })
      .limit(50);
    data = (legacy.data ?? null) as Record<string, unknown>[] | null;
    error = legacy.error;
    if (data) {
      data = data.map((row) => ({
        ...row,
        expires_at: null,
        attachment_urls: [],
      }));
    }
  } else {
    data = (modern.data ?? null) as Record<string, unknown>[] | null;
    error = modern.error;
  }

  if (error) {
    if (shouldReturnEmptyAnnouncements(error)) {
      console.warn(
        "[hq/announcements GET] 공지 테이블 없음 또는 스키마 미반영 — 빈 목록 반환. supabase/organization_announcements_schema.sql 실행 필요.",
        error.message
      );
      return NextResponse.json({ announcements: [] });
    }
    console.error("[hq/announcements GET]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const { data: orgRows } = await supabase.from("organizations").select("id,name").in("id", orgIds);
  const orgNameById = Object.fromEntries((orgRows ?? []).map((o) => [o.id, o.name]));

  const announcements = (data ?? []).map((row) => ({
    id: row.id,
    organization_id: row.organization_id,
    organization_name: orgNameById[row.organization_id as string] ?? null,
    title: row.title,
    body: row.body,
    priority: row.priority,
    created_at: row.created_at,
    expires_at: (row.expires_at as string) ?? null,
    attachment_urls: parseAttachmentUrlsRow(row),
  }));

  const annIds = announcements.map((a) => a.id);
  const confirmedByMe = new Map<string, string>();
  const readReceiptsByAnn = new Map<
    string,
    {
      read_at: string;
      tenant_id: string | null;
      tenant_name: string | null;
      user_id: string;
      user_full_name: string | null;
    }[]
  >();

  if (annIds.length > 0) {
    const { data: myReads, error: myReadsErr } = await supabase
      .from("organization_announcement_reads")
      .select("announcement_id, read_at")
      .eq("user_id", user.id)
      .in("announcement_id", annIds);

    if (myReadsErr && !shouldIgnoreReadsTable(myReadsErr)) {
      console.error("[hq/announcements GET] myReads", myReadsErr);
    } else {
      for (const r of myReads ?? []) {
        if (r.announcement_id && r.read_at) confirmedByMe.set(r.announcement_id as string, r.read_at as string);
      }
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const { data: mems } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id);
    const isAnnManager =
      profile?.role === "super_admin" || (mems ?? []).some((m) => m.role === "org_admin");

    if (isAnnManager) {
      const { data: allReads, error: allReadsErr } = await supabase
        .from("organization_announcement_reads")
        .select("announcement_id, read_at, tenant_id, tenant_name, user_id, user_full_name")
        .in("announcement_id", annIds)
        .order("read_at", { ascending: false });

      if (allReadsErr && !shouldIgnoreReadsTable(allReadsErr)) {
        console.error("[hq/announcements GET] allReads", allReadsErr);
      } else {
        for (const r of allReads ?? []) {
          const aid = r.announcement_id as string;
          if (!readReceiptsByAnn.has(aid)) readReceiptsByAnn.set(aid, []);
          readReceiptsByAnn.get(aid)!.push({
            read_at: r.read_at as string,
            tenant_id: (r.tenant_id as string) ?? null,
            tenant_name: (r.tenant_name as string) ?? null,
            user_id: r.user_id as string,
            user_full_name: (r.user_full_name as string) ?? null,
          });
        }
      }
    }
  }

  const enriched = announcements.map((a) => {
    const id = String(a.id);
    return {
      ...a,
      id,
      confirmedAt: confirmedByMe.get(id) ?? null,
      readReceipts: readReceiptsByAnn.get(id) ?? [],
    };
  });

  return NextResponse.json({ announcements: enriched });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const body = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  if (!user) return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });
  const organizationId = body?.organizationId as string | undefined;
  const title = (body?.title as string | undefined)?.trim();
  const content = (body?.body as string | undefined)?.trim();
  const priority = (body?.priority as string) === "high" ? "high" : "normal";
  const attachmentUrls = normalizeAttachmentUrlList(body?.attachmentUrls, 8);
  const expiresAt = body?.expiresAt as string | undefined;

  if (!organizationId || !title || !content) {
    return NextResponse.json({ error: errAnnComposeFieldsRequired(bl) }, { status: 400 });
  }

  // 기본 만료일 설정 (30일 후)
  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 30);
  const finalExpiresAt = expiresAt || defaultExpiry.toISOString();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isSuper = profile?.role === "super_admin";

  if (!isSuper) {
    const { data: mem } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!mem || mem.role !== "org_admin") {
      return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
    }
  }

  const { data: inserted, error } = await supabase
    .from("organization_announcements")
    .insert({
      organization_id: organizationId,
      title,
      body: content,
      priority,
      attachment_urls: attachmentUrls,
      created_by: user.id,
      expires_at: finalExpiresAt,
    })
    .select("id")
    .single();

  if (error) {
    if (shouldReturnEmptyAnnouncements(error)) {
      return NextResponse.json({ error: errAnnTableMissing(bl) }, { status: 503 });
    }
    if (isLegacyBoardSchemaError(error)) {
      return NextResponse.json({ error: errAnnSchemaLegacy(bl) }, { status: 503 });
    }
    if (error.code === "42501" || /row-level security|rls/i.test(String(error.message ?? ""))) {
      return NextResponse.json({ error: errAnnRlsDenied(bl) }, { status: 403 });
    }
    console.error("[hq/announcements POST]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted?.id });
}
