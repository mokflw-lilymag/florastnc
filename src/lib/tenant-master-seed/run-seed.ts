import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TenantMasterSeed,
  TenantMasterSeedBulkResult,
  TenantMasterSeedBulkTenantResult,
  TenantMasterSeedResult,
} from "./types";
import { resolvedMaterialSeedMemo, resolvedProductCode } from "./seed-db-shape";

/** 조직 일괄 시드 시 한 번에 처리할 매장 수 상한 */
export const TENANT_MASTER_SEED_BULK_MAX = 200;

function normName(s: string) {
  return s.trim().toLowerCase();
}

export async function runTenantMasterSeed(
  admin: SupabaseClient,
  tenantId: string,
  seed: TenantMasterSeed,
  opts: { dryRun: boolean; appliedByUserId?: string }
): Promise<TenantMasterSeedResult> {
  const warnings: string[] = [
    "자재 단가는 시드 정책상 0원입니다. 지점·시트 단가는 시드에 넣지 않습니다. 매입 시 갱신하세요.",
    "상품 단가는 시드에 포함된 금액이 그대로 들어갑니다. 거래처·연락처는 매장에서 확인하세요.",
    "카테고리는 시드 버전 기준으로 system_settings 에 덮어씁니다.",
  ];

  const delivery = seed.delivery;
  const districtRows = (delivery?.districtDeliveryFees ?? []).filter((x) =>
    String(x.district ?? "").trim()
  );
  const regionsToUpsert = districtRows.length;
  const willMergeGeneralDeliveryFields =
    districtRows.length > 0 ||
    typeof delivery?.defaultDeliveryFee === "number" ||
    typeof delivery?.freeDeliveryThreshold === "number";

  if (districtRows.length > 0) {
    warnings.push(
      "배송비: 자치구별 금액은 delivery_fees_by_region 과 일반 설정의 districtDeliveryFees 에 함께 반영됩니다."
    );
  }

  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantErr) throw tenantErr;
  if (!tenant?.id) {
    throw new Error("tenant_not_found");
  }

  const { data: supRows } = await admin.from("suppliers").select("name").eq("tenant_id", tenantId);
  const supplierNames = new Set((supRows ?? []).map((r) => normName(String(r.name ?? ""))));

  const { data: prodRows } = await admin.from("products").select("code").eq("tenant_id", tenantId);
  const productCodes = new Set(
    (prodRows ?? []).map((r) => String(r.code ?? "").trim()).filter(Boolean)
  );

  const materialMemoPrefix = `FS-SEED|${seed.version}|`;
  const { data: matRows } = await admin.from("materials").select("memo").eq("tenant_id", tenantId);
  const materialMemos = new Set(
    (matRows ?? [])
      .map((r) => String(r.memo ?? "").trim())
      .filter((m) => m.startsWith(materialMemoPrefix))
  );

  let supInsert = 0;
  let supSkip = 0;
  const seenSup = new Set<string>();
  for (const s of seed.suppliers) {
    const n = normName(s.name);
    if (!n) continue;
    if (seenSup.has(n)) {
      supSkip += 1;
      continue;
    }
    seenSup.add(n);
    if (supplierNames.has(n)) supSkip += 1;
    else {
      supInsert += 1;
      supplierNames.add(n);
    }
  }

  const resolvedProductCodes: string[] = [];
  let prodInsert = 0;
  let prodSkip = 0;
  seed.products.forEach((p, i) => {
    const code = resolvedProductCode(seed.version, i, p.code);
    resolvedProductCodes.push(code);
    if (productCodes.has(code)) prodSkip += 1;
    else {
      prodInsert += 1;
      productCodes.add(code);
    }
  });

  const resolvedMaterialMemos: string[] = [];
  let matInsert = 0;
  let matSkip = 0;
  seed.materials.forEach((_, i) => {
    const memo = resolvedMaterialSeedMemo(seed.version, i);
    resolvedMaterialMemos.push(memo);
    if (materialMemos.has(memo)) matSkip += 1;
    else {
      matInsert += 1;
      materialMemos.add(memo);
    }
  });

  if (!opts.dryRun) {
    const now = new Date().toISOString();

    const { error: e1 } = await admin.from("system_settings").upsert({
      id: "product_categories",
      tenant_id: tenantId,
      data: seed.productCategories,
    });
    if (e1) throw e1;
    const { error: e2 } = await admin.from("system_settings").upsert({
      id: "material_categories",
      tenant_id: tenantId,
      data: seed.materialCategories,
    });
    if (e2) throw e2;
    const { error: e3 } = await admin.from("system_settings").upsert({
      id: "expense_categories",
      tenant_id: tenantId,
      data: seed.expenseCategories,
    });
    if (e3) throw e3;

    for (const s of seed.suppliers) {
      const n = s.name.trim();
      if (!n) continue;
      const { data: exists } = await admin
        .from("suppliers")
        .select("id")
        .eq("tenant_id", tenantId)
        .ilike("name", n)
        .maybeSingle();
      if (exists?.id) continue;

      const { error } = await admin.from("suppliers").insert({
        tenant_id: tenantId,
        name: n,
        memo: s.memo ?? null,
        supplier_type: s.supplier_type ?? null,
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
    }

    for (let i = 0; i < seed.products.length; i++) {
      const p = seed.products[i];
      const code = resolvedProductCodes[i];
      const { data: exists } = await admin
        .from("products")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("code", code)
        .maybeSingle();
      if (exists?.id) continue;

      const row: Record<string, unknown> = {
        tenant_id: tenantId,
        name: p.name.trim(),
        main_category: p.main_category,
        mid_category: p.mid_category ?? null,
        price: p.price ?? 0,
        stock: p.stock ?? 0,
        code,
        status: p.status ?? "active",
        supplier: null,
        supplier_id: null,
        extra_data: { _seed: { version: seed.version, kind: "product", index: i } },
        updated_at: now,
      };
      const { error } = await admin.from("products").insert(row);
      if (error) throw error;
    }

    for (let i = 0; i < seed.materials.length; i++) {
      const m = seed.materials[i];
      const memo = resolvedMaterialMemos[i];
      const { data: exists } = await admin
        .from("materials")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("memo", memo)
        .maybeSingle();
      if (exists?.id) continue;

      const { error } = await admin.from("materials").insert({
        tenant_id: tenantId,
        name: m.name.trim(),
        main_category: m.main_category,
        mid_category: m.mid_category ?? null,
        unit: m.unit,
        spec: m.spec ?? null,
        price: 0,
        stock: 0,
        current_stock: 0,
        memo,
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
    }

    if (districtRows.length > 0) {
      const { error: dFeeErr } = await admin.from("delivery_fees_by_region").upsert(
        districtRows.map((r) => ({
          tenant_id: tenantId,
          region_name: String(r.district).trim(),
          fee: Number(r.fee),
        })),
        { onConflict: "tenant_id, region_name" }
      );
      if (dFeeErr) throw dFeeErr;
    }

    if (willMergeGeneralDeliveryFields) {
      const { data: genRows, error: genSelErr } = await admin
        .from("system_settings")
        .select("id, data")
        .eq("tenant_id", tenantId)
        .in("id", [`settings_${tenantId}`, "general"]);
      if (genSelErr) throw genSelErr;
      const genRow =
        genRows?.find((r) => r.id === `settings_${tenantId}`) ??
        genRows?.find((r) => r.id === "general");
      const prev =
        genRow?.data && typeof genRow.data === "object" && genRow.data !== null && !Array.isArray(genRow.data)
          ? { ...(genRow.data as Record<string, unknown>) }
          : {};
      const next: Record<string, unknown> = { ...prev };
      if (districtRows.length > 0) {
        next.districtDeliveryFees = districtRows.map((r) => ({
          district: String(r.district).trim(),
          fee: Number(r.fee),
        }));
      }
      if (typeof delivery?.defaultDeliveryFee === "number") {
        next.defaultDeliveryFee = delivery.defaultDeliveryFee;
      }
      if (typeof delivery?.freeDeliveryThreshold === "number") {
        next.freeDeliveryThreshold = delivery.freeDeliveryThreshold;
      }
      const { error: genUpErr } = await admin.from("system_settings").upsert({
        id: `settings_${tenantId}`,
        tenant_id: tenantId,
        data: next,
        updated_at: now,
      });
      if (genUpErr) throw genUpErr;
    }
  }

  let auditId: string | null = null;
  if (!opts.dryRun && opts.appliedByUserId) {
    const summary = {
      seedVersion: seed.version,
      suppliers: { inserted: supInsert, skipped: supSkip },
      products: { inserted: prodInsert, skipped: prodSkip },
      materials: { inserted: matInsert, skipped: matSkip },
      delivery: {
        regionsUpserted: regionsToUpsert,
        mergedGeneralDeliveryFields: willMergeGeneralDeliveryFields,
      },
    };
    const { data: auditRow, error: auditErr } = await admin
      .from("tenant_master_seed_audit")
      .insert({
        tenant_id: tenantId,
        seed_version: seed.version,
        applied_by: opts.appliedByUserId,
        summary,
      })
      .select("id")
      .single();
    if (!auditErr && auditRow?.id) auditId = auditRow.id;
  }

  return {
    dryRun: opts.dryRun,
    tenantId,
    seedVersion: seed.version,
    categories: { willWrite: true },
    suppliers: { toInsert: supInsert, toSkip: supSkip },
    products: { toInsert: prodInsert, toSkip: prodSkip },
    materials: { toInsert: matInsert, toSkip: matSkip },
    delivery: { regionsToUpsert, willMergeGeneralDeliveryFields },
    warnings,
    auditId,
  };
}

export async function runTenantMasterSeedBulk(
  admin: SupabaseClient,
  tenantIds: string[],
  seed: TenantMasterSeed,
  opts: { dryRun: boolean; appliedByUserId?: string; organizationId?: string }
): Promise<TenantMasterSeedBulkResult> {
  const unique = [...new Set(tenantIds.map((id) => String(id).trim()).filter(Boolean))];
  if (unique.length === 0) {
    throw new Error("tenant_ids_empty");
  }
  if (unique.length > TENANT_MASTER_SEED_BULK_MAX) {
    throw new Error(`bulk_tenant_limit:${TENANT_MASTER_SEED_BULK_MAX}`);
  }
  const tenants: TenantMasterSeedBulkTenantResult[] = [];
  let okCount = 0;
  let failCount = 0;
  for (const tenantId of unique) {
    try {
      const result = await runTenantMasterSeed(admin, tenantId, seed, opts);
      tenants.push({ tenantId, ok: true, result });
      okCount += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      tenants.push({ tenantId, ok: false, error: msg });
      failCount += 1;
    }
  }
  return {
    dryRun: opts.dryRun,
    seedVersion: seed.version,
    organizationId: opts.organizationId,
    tenantCount: unique.length,
    okCount,
    failCount,
    tenants,
  };
}
