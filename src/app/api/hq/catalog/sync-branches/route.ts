import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { syncOrgCatalogToAllBranches } from "@/lib/hq/org-catalog-sync";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errCatalogOrganizationIdRequired } from "@/lib/hq/hq-catalog-api-errors";
import {
  errAdminForbidden,
  errAdminOperationFailed,
  errAdminServerMisconfigured,
  errAdminUnauthorized,
} from "@/lib/admin/admin-api-errors";

/** 조직 공유 카탈로그 전체를 소속 모든 지점 products 에 반영 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  if (!user) {
    return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });
  }
  const organizationId = body?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: errCatalogOrganizationIdRequired(bl) }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: mem } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const canWrite = profile?.role === "super_admin" || mem?.role === "org_admin";
  if (!canWrite) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  try {
    const sync = await syncOrgCatalogToAllBranches(admin, organizationId);
    const syncTotals = sync.branches.reduce(
      (a, b) => ({
        inserted: a.inserted + b.inserted,
        updated: a.updated + b.updated,
        skipped: a.skipped + b.skipped,
      }),
      { inserted: 0, updated: 0, skipped: 0 }
    );
    return NextResponse.json({ ok: true, sync, syncTotals });
  } catch (e) {
    console.error("[hq/catalog/sync-branches]", e);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }
}
