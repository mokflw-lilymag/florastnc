import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { applyOrgCatalogItemsToTenant, type OrgCatalogProductShape } from "@/lib/hq/org-catalog-sync";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errCatalogBranchNotFound, errCatalogTenantIdRequired } from "@/lib/hq/hq-catalog-api-errors";
import {
  errAdminForbidden,
  errAdminOperationFailed,
  errAdminServerMisconfigured,
  errAdminUnauthorized,
} from "@/lib/admin/admin-api-errors";

/**
 * 공유 카탈로그 행을 지점 products 에 반영 (코드 있으면 갱신, 없으면 삽입)
 */
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
  const tenantId = body?.tenantId as string | undefined;
  const itemIds = body?.itemIds as string[] | undefined;

  if (!tenantId) {
    return NextResponse.json({ error: errCatalogTenantIdRequired(bl) }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  const orgAdminOrgIds = new Set(
    (memberships ?? []).filter((m) => m.role === "org_admin").map((m) => m.organization_id)
  );

  const { data: branch } = await admin
    .from("tenants")
    .select("id, organization_id, name")
    .eq("id", tenantId)
    .maybeSingle();

  if (!branch?.organization_id) {
    return NextResponse.json({ error: errCatalogBranchNotFound(bl) }, { status: 404 });
  }

  const allowed =
    profile?.role === "super_admin" || orgAdminOrgIds.has(branch.organization_id);

  if (!allowed) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  let catQuery = admin
    .from("organization_catalog_items")
    .select("name, main_category, mid_category, price, code, status")
    .eq("organization_id", branch.organization_id);

  if (itemIds?.length) {
    catQuery = catQuery.in("id", itemIds);
  }

  const { data: catalogRows, error: catErr } = await catQuery;
  if (catErr) {
    console.error("[hq/catalog/apply] catalog", catErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const items: OrgCatalogProductShape[] = (catalogRows ?? []).map((item) => ({
    name: String((item as { name: string }).name),
    main_category: (item as { main_category?: string | null }).main_category ?? null,
    mid_category: (item as { mid_category?: string | null }).mid_category ?? null,
    price:
      typeof (item as { price?: unknown }).price === "number"
        ? ((item as { price: number }).price as number)
        : Number((item as { price?: unknown }).price) || 0,
    code: (item as { code?: string | null }).code ?? null,
    status: String((item as { status?: string }).status ?? "active"),
  }));

  const { inserted, updated, skipped } = await applyOrgCatalogItemsToTenant(admin, tenantId, items);

  return NextResponse.json({
    ok: true,
    branchName: branch.name,
    inserted,
    updated,
    skipped,
    totalCatalog: items.length,
  });
}
