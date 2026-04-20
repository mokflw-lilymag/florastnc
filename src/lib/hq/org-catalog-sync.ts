import type { SupabaseClient } from "@supabase/supabase-js";

/** 지점 products 반영용 (카탈로그 행과 동일 필드) */
export type OrgCatalogProductShape = {
  name: string;
  main_category: string | null;
  mid_category: string | null;
  price: number;
  code: string | null;
  status: string;
};

export function normalizeCatalogStatus(raw: string | null | undefined): "active" | "inactive" | "sold_out" {
  const s = String(raw ?? "active").trim().toLowerCase();
  if (s === "inactive" || s === "비활성" || s === "중지") return "inactive";
  if (s === "sold_out" || s === "품절") return "sold_out";
  return "active";
}

/**
 * 공유 카탈로그 행을 한 지점 products 에 반영합니다.
 * - code 가 있으면 동일 code 상품이 있으면 가격·이름 등 갱신, 없으면 삽입
 * - code 가 없으면 항상 삽입(중복 가능)
 */
export async function applyOrgCatalogItemsToTenant(
  admin: SupabaseClient,
  tenantId: string,
  items: OrgCatalogProductShape[]
): Promise<{ inserted: number; updated: number; skipped: number }> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const code = item.code ? String(item.code).trim() : "";
    const status = normalizeCatalogStatus(item.status);
    const price = typeof item.price === "number" && Number.isFinite(item.price) ? item.price : 0;
    const name = String(item.name ?? "").trim();
    if (!name) {
      skipped += 1;
      continue;
    }

    const base = {
      name,
      main_category: item.main_category ? String(item.main_category).trim() || null : null,
      mid_category: item.mid_category ? String(item.mid_category).trim() || null : null,
      price,
      code: code || null,
      status,
    };

    if (code) {
      const { data: existing, error: selErr } = await admin
        .from("products")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("code", code)
        .maybeSingle();

      if (selErr) {
        console.error("[applyOrgCatalogItemsToTenant] select", selErr);
        skipped += 1;
        continue;
      }

      if (existing?.id) {
        const { error: upErr } = await admin
          .from("products")
          .update({
            name: base.name,
            main_category: base.main_category,
            mid_category: base.mid_category,
            price: base.price,
            status: base.status,
          })
          .eq("id", existing.id);

        if (upErr) {
          console.error("[applyOrgCatalogItemsToTenant] update", upErr);
          skipped += 1;
        } else {
          updated += 1;
        }
      } else {
        const { error: insErr } = await admin.from("products").insert({
          tenant_id: tenantId,
          ...base,
          stock: 0,
        });
        if (insErr) {
          console.error("[applyOrgCatalogItemsToTenant] insert", insErr);
          skipped += 1;
        } else {
          inserted += 1;
        }
      }
    } else {
      const { error: insErr } = await admin.from("products").insert({
        tenant_id: tenantId,
        ...base,
        stock: 0,
      });
      if (insErr) {
        console.error("[applyOrgCatalogItemsToTenant] insert(no code)", insErr);
        skipped += 1;
      } else {
        inserted += 1;
      }
    }
  }

  return { inserted, updated, skipped };
}

/** 조직 소속 전 지점에 현재 카탈로그 전체를 반영 */
export async function syncOrgCatalogToAllBranches(
  admin: SupabaseClient,
  organizationId: string
): Promise<{
  branches: Array<{
    tenantId: string;
    name: string;
    inserted: number;
    updated: number;
    skipped: number;
  }>;
}> {
  const { data: tenantRows, error: tErr } = await admin
    .from("tenants")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");

  if (tErr) {
    console.error("[syncOrgCatalogToAllBranches] tenants", tErr);
    throw new Error(tErr.message);
  }

  const { data: catalogRows, error: cErr } = await admin
    .from("organization_catalog_items")
    .select("name, main_category, mid_category, price, code, status")
    .eq("organization_id", organizationId);

  if (cErr) {
    console.error("[syncOrgCatalogToAllBranches] catalog", cErr);
    throw new Error(cErr.message);
  }

  const items: OrgCatalogProductShape[] = (catalogRows ?? []).map((r) => ({
    name: String((r as { name: string }).name),
    main_category: (r as { main_category?: string | null }).main_category ?? null,
    mid_category: (r as { mid_category?: string | null }).mid_category ?? null,
    price:
      typeof (r as { price?: unknown }).price === "number"
        ? ((r as { price: number }).price as number)
        : Number((r as { price?: unknown }).price) || 0,
    code: (r as { code?: string | null }).code ?? null,
    status: String((r as { status?: string }).status ?? "active"),
  }));

  const branches: Array<{
    tenantId: string;
    name: string;
    inserted: number;
    updated: number;
    skipped: number;
  }> = [];

  for (const t of tenantRows ?? []) {
    const r = await applyOrgCatalogItemsToTenant(admin, t.id, items);
    branches.push({
      tenantId: t.id,
      name: t.name ?? t.id,
      inserted: r.inserted,
      updated: r.updated,
      skipped: r.skipped,
    });
  }

  return { branches };
}
