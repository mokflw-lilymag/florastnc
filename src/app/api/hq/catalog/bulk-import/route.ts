import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  normalizeImportRowFromApi,
  type CatalogImportRow,
} from "@/lib/hq/catalog-excel-map";
import { normalizeCatalogStatus, syncOrgCatalogToAllBranches } from "@/lib/hq/org-catalog-sync";

const MAX_ROWS = 5000;

/**
 * 엑셀에서 파싱한 행을 organization_catalog_items 에 반영한 뒤,
 * 기본적으로 조직 소속 모든 지점 products 에 동기화합니다.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const organizationId = body?.organizationId as string | undefined;
  const rawItems = body?.items as unknown[] | undefined;
  const syncToBranches = body?.syncToBranches !== false;

  if (!organizationId || !Array.isArray(rawItems)) {
    return NextResponse.json({ error: "organizationId, items 배열이 필요합니다." }, { status: 400 });
  }

  if (rawItems.length === 0) {
    return NextResponse.json({ error: "등록할 행이 없습니다." }, { status: 400 });
  }
  if (rawItems.length > MAX_ROWS) {
    return NextResponse.json({ error: `한 번에 최대 ${MAX_ROWS}행까지 업로드할 수 있습니다.` }, { status: 400 });
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const items: CatalogImportRow[] = [];
  for (const r of rawItems) {
    if (!r || typeof r !== "object") continue;
    const row = normalizeImportRowFromApi(r as Record<string, unknown>);
    if (row) items.push(row);
  }

  if (items.length === 0) {
    return NextResponse.json(
      {
        error:
          "유효한 행이 없습니다. 상품명·대분류·중분류(2차 카테고리)를 모두 입력했는지 확인하세요.",
      },
      { status: 400 }
    );
  }

  let catalogWritten = 0;
  const errors: string[] = [];

  for (const row of items) {
    const status = normalizeCatalogStatus(row.status);
    const code = row.code ? String(row.code).trim() : "";

    try {
      if (code) {
        const { data: existing, error: selErr } = await admin
          .from("organization_catalog_items")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("code", code)
          .maybeSingle();

        if (selErr) throw selErr;

        const payload = {
          organization_id: organizationId,
          name: row.name,
          main_category: row.main_category,
          mid_category: row.mid_category,
          price: row.price,
          code,
          status,
          updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
          const { error: upErr } = await admin
            .from("organization_catalog_items")
            .update({
              name: payload.name,
              main_category: payload.main_category,
              mid_category: payload.mid_category,
              price: payload.price,
              status: payload.status,
              updated_at: payload.updated_at,
            })
            .eq("id", existing.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await admin.from("organization_catalog_items").insert({
            organization_id: organizationId,
            name: row.name,
            main_category: row.main_category,
            mid_category: row.mid_category,
            price: row.price,
            code,
            status,
          });
          if (insErr) throw insErr;
        }
      } else {
        const { error: insErr } = await admin.from("organization_catalog_items").insert({
          organization_id: organizationId,
          name: row.name,
          main_category: row.main_category,
          mid_category: row.mid_category,
          price: row.price,
          code: null,
          status,
        });
        if (insErr) throw insErr;
      }
      catalogWritten += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${row.name}: ${msg}`);
      if (errors.length >= 20) break;
    }
  }

  if (catalogWritten === 0 && errors.length > 0) {
    return NextResponse.json(
      { error: "카탈로그 저장에 실패했습니다.", details: errors.slice(0, 5) },
      { status: 500 }
    );
  }

  let sync: Awaited<ReturnType<typeof syncOrgCatalogToAllBranches>> | null = null;
  if (syncToBranches) {
    try {
      sync = await syncOrgCatalogToAllBranches(admin, organizationId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[hq/catalog/bulk-import] sync", e);
      return NextResponse.json(
        {
          ok: true,
          catalogWritten,
          sync: null,
          syncError: msg,
          importErrors: errors.length ? errors : undefined,
        },
        { status: 200 }
      );
    }
  }

  const syncTotals = sync
    ? sync.branches.reduce(
        (a, b) => ({
          inserted: a.inserted + b.inserted,
          updated: a.updated + b.updated,
          skipped: a.skipped + b.skipped,
        }),
        { inserted: 0, updated: 0, skipped: 0 }
      )
    : null;

  return NextResponse.json({
    ok: true,
    catalogWritten,
    sync,
    syncTotals,
    importErrors: errors.length ? errors : undefined,
  });
}
