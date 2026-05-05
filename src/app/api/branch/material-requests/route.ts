import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  errAdminForbidden,
  errAdminOperationFailed,
  errAdminServerMisconfigured,
  errAdminUnauthorized,
} from "@/lib/admin/admin-api-errors";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errBranchMatInvalidPatchBody,
  errBranchMatLineBadQty,
  errBranchMatLineDupName,
  errBranchMatLineMaterialNotFound,
  errBranchMatLineRequiredFields,
  errBranchMatLineSimilar,
  errBranchMatLinesTableMissing,
  errBranchMatMaxLines,
  errBranchMatNeedOneLine,
  errBranchMatOnlyBranchAccount,
  errBranchMatRequestsNotFound,
  errBranchMatSomeInvalidRequestIds,
  errBranchMatStoreNotLinkedToOrg,
  errBranchMatTableMissing,
  warnBranchMatSchemaToQuery,
} from "@/lib/branch/branch-material-request-api-errors";
import {
  compactMaterialName,
  findBlockingSimilarMaterialNames,
} from "@/lib/material-request-name-similarity";

type LineInput = {
  material_id?: string | null;
  name?: string;
  main_category?: string;
  mid_category?: string;
  quantity?: unknown;
  unit?: string;
  spec?: string | null;
};

/** Postgres 42P01 또는 PostgREST PGRST205(스키마 캐시에 테이블 없음) 등 */
function isBranchMaterialSchemaMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message ?? "";
  const mentions = /branch_material_request/i.test(msg);
  if (error.code === "42P01") return true;
  if (error.code === "PGRST205" && mentions) return true;
  if (mentions && (/does not exist/i.test(msg) || /Could not find the table/i.test(msg)))
    return true;
  return false;
}

export async function GET(req: Request) {
  const bl = await hqApiUiBase(req, new URL(req.url).searchParams.get("uiLocale"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, org_work_tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();

  const effectiveTenant = profile?.org_work_tenant_id ?? profile?.tenant_id ?? null;
  const isSuper = profile?.role === "super_admin";

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  const orgIds = [...new Set((memberships ?? []).map((m) => m.organization_id))];

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  let organizationLinked = false;
  if (effectiveTenant) {
    const { data: tenantRow } = await admin
      .from("tenants")
      .select("organization_id")
      .eq("id", effectiveTenant)
      .maybeSingle();
    organizationLinked = !!tenantRow?.organization_id;
  }

  let query = admin
    .from("branch_material_requests")
    .select("id, organization_id, tenant_id, status, branch_note, created_at, created_by")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!isSuper) {
    if (orgIds.length > 0) {
      query = query.in("organization_id", orgIds);
    } else if (effectiveTenant) {
      query = query.eq("tenant_id", effectiveTenant);
    } else {
      return NextResponse.json({ requests: [], organizationLinked });
    }
  }

  const searchParams = new URL(req.url).searchParams;
  const filterOrg = searchParams.get("organizationId");
  if (isSuper && filterOrg) {
    query = query.eq("organization_id", filterOrg);
  }

  const { data: requests, error } = await query;
  if (error) {
    if (isBranchMaterialSchemaMissing(error)) {
      return NextResponse.json({
        requests: [],
        organizationLinked,
        warning: warnBranchMatSchemaToQuery(bl),
      });
    }
    console.error("[branch/material-requests GET]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const reqRows = requests ?? [];
  const tenantIds = [...new Set(reqRows.map((r) => r.tenant_id))];
  const requestIds = reqRows.map((r) => r.id);

  const tenantNameById: Record<string, string> = {};
  if (tenantIds.length > 0) {
    const { data: tenants } = await admin.from("tenants").select("id, name").in("id", tenantIds);
    for (const t of tenants ?? []) {
      tenantNameById[t.id as string] = (t.name as string) ?? t.id;
    }
  }

  const linesByRequest = new Map<string, unknown[]>();
  if (requestIds.length > 0) {
    const { data: lines, error: linesErr } = await admin
      .from("branch_material_request_lines")
      .select(
        "id, request_id, material_id, name, main_category, mid_category, quantity, unit, spec, sort_order"
      )
      .in("request_id", requestIds)
      .order("sort_order", { ascending: true });

    if (linesErr) {
      if (isBranchMaterialSchemaMissing(linesErr)) {
        console.warn("[branch/material-requests GET] lines table missing", linesErr);
      } else {
        console.error("[branch/material-requests GET] lines", linesErr);
        return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
      }
    } else {
      for (const ln of lines ?? []) {
        const rid = ln.request_id as string;
        if (!linesByRequest.has(rid)) linesByRequest.set(rid, []);
        linesByRequest.get(rid)!.push(ln);
      }
    }
  }

  const enriched = reqRows.map((r) => ({
    ...r,
    tenant_name: tenantNameById[r.tenant_id as string] ?? r.tenant_id,
    lines: linesByRequest.get(r.id as string) ?? [],
  }));

  return NextResponse.json({ requests: enriched, organizationLinked });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, typeof body?.uiLocale === "string" ? body.uiLocale : undefined);
  if (!user) {
    return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, org_work_tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();

  const effectiveTenant = profile?.org_work_tenant_id ?? profile?.tenant_id ?? null;
  if (!effectiveTenant) {
    return NextResponse.json({ error: errBranchMatOnlyBranchAccount(bl) }, { status: 403 });
  }
  const linesRaw = body?.lines as LineInput[] | undefined;
  const branch_note = typeof body?.branch_note === "string" ? body.branch_note.trim() : "";

  if (!Array.isArray(linesRaw) || linesRaw.length === 0) {
    return NextResponse.json({ error: errBranchMatNeedOneLine(bl) }, { status: 400 });
  }
  if (linesRaw.length > 100) {
    return NextResponse.json({ error: errBranchMatMaxLines(bl) }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const { data: tenant, error: tErr } = await admin
    .from("tenants")
    .select("id, organization_id, name")
    .eq("id", effectiveTenant)
    .maybeSingle();

  if (tErr || !tenant?.organization_id) {
    return NextResponse.json({ error: errBranchMatStoreNotLinkedToOrg(bl) }, { status: 403 });
  }

  const { data: materialRows } = await admin
    .from("materials")
    .select("id, name")
    .eq("tenant_id", effectiveTenant);

  const materialsPool = (materialRows ?? []).map((m) => ({ name: String(m.name) }));

  const normalized: Array<{
    material_id: string | null;
    name: string;
    main_category: string;
    mid_category: string;
    quantity: number;
    unit: string;
    spec: string | null;
  }> = [];

  const namesSoFar: string[] = [];

  for (let i = 0; i < linesRaw.length; i++) {
    const row = linesRaw[i]!;
    const name = String(row.name ?? "").trim();
    const main_category = String(row.main_category ?? "").trim();
    const mid_category = String(row.mid_category ?? "").trim();
    const qty = Number(row.quantity ?? 1);
    const unit = String(row.unit ?? "ea").trim() || "ea";
    const spec = row.spec != null && String(row.spec).trim() ? String(row.spec).trim() : null;

    if (!name || !main_category || !mid_category) {
      return NextResponse.json({ error: errBranchMatLineRequiredFields(bl, i + 1) }, { status: 400 });
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: errBranchMatLineBadQty(bl, i + 1) }, { status: 400 });
    }

    let materialId: string | null =
      row.material_id && String(row.material_id).trim() ? String(row.material_id).trim() : null;
    if (materialId) {
      const { data: mat } = await admin
        .from("materials")
        .select("id, name, main_category, mid_category")
        .eq("id", materialId)
        .eq("tenant_id", effectiveTenant)
        .maybeSingle();
      if (!mat) {
        return NextResponse.json({ error: errBranchMatLineMaterialNotFound(bl, i + 1) }, { status: 400 });
      }
    }

    const similar = findBlockingSimilarMaterialNames(name, materialsPool, namesSoFar);
    if (similar.length > 0) {
      return NextResponse.json(
        {
          error: errBranchMatLineSimilar(bl, i + 1, name, similar.slice(0, 5).join(", ")),
        },
        { status: 400 }
      );
    }

    if (namesSoFar.some((x) => compactMaterialName(x) === compactMaterialName(name))) {
      return NextResponse.json({ error: errBranchMatLineDupName(bl, i + 1) }, { status: 400 });
    }

    namesSoFar.push(name);
    normalized.push({
      material_id: materialId,
      name,
      main_category,
      mid_category,
      quantity: qty,
      unit,
      spec,
    });
  }

  const { data: insertedReq, error: insErr } = await admin
    .from("branch_material_requests")
    .insert({
      organization_id: tenant.organization_id,
      tenant_id: effectiveTenant,
      created_by: user.id,
      status: "pending",
      branch_note: branch_note || null,
    })
    .select("id")
    .single();

  if (insErr || !insertedReq) {
    if (isBranchMaterialSchemaMissing(insErr ?? null)) {
      return NextResponse.json({ error: errBranchMatTableMissing(bl) }, { status: 503 });
    }
    console.error("[branch/material-requests POST] insert req", insErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const requestId = insertedReq.id as string;
  const linePayloads = normalized.map((ln, idx) => ({
    request_id: requestId,
    material_id: ln.material_id,
    name: ln.name,
    main_category: ln.main_category,
    mid_category: ln.mid_category,
    quantity: ln.quantity,
    unit: ln.unit,
    spec: ln.spec,
    sort_order: idx,
  }));

  const { error: lineErr } = await admin.from("branch_material_request_lines").insert(linePayloads);
  if (lineErr) {
    await admin.from("branch_material_requests").delete().eq("id", requestId);
    if (isBranchMaterialSchemaMissing(lineErr)) {
      return NextResponse.json({ error: errBranchMatLinesTableMissing(bl) }, { status: 503 });
    }
    console.error("[branch/material-requests POST] lines", lineErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: requestId,
    tenantName: tenant.name,
    lineCount: normalized.length,
  });
}

const ALLOWED_REQUEST_STATUS = new Set(["pending", "reviewing", "fulfilled", "cancelled"]);

/**
 * 본사(조직 멤버)·슈퍼: 지점 자재 요청 상태 일괄 변경
 */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, typeof body?.uiLocale === "string" ? body.uiLocale : undefined);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });
  }
  const rawIds = Array.isArray(body.requestIds) ? body.requestIds : [];
  const requestIds = [...new Set(rawIds.map((x: unknown) => String(x).trim()).filter(Boolean))];
  const status = typeof body.status === "string" ? body.status.trim() : "";

  if (requestIds.length === 0 || !ALLOWED_REQUEST_STATUS.has(status)) {
    return NextResponse.json({ error: errBranchMatInvalidPatchBody(bl) }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isSuper = profile?.role === "super_admin";

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const { data: rows, error: fetchErr } = await admin
    .from("branch_material_requests")
    .select("id, organization_id")
    .in("id", requestIds);

  if (fetchErr) {
    if (isBranchMaterialSchemaMissing(fetchErr)) {
      return NextResponse.json({ error: errBranchMatTableMissing(bl) }, { status: 503 });
    }
    console.error("[branch/material-requests PATCH] fetch", fetchErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  if (!rows?.length) {
    return NextResponse.json({ error: errBranchMatRequestsNotFound(bl) }, { status: 404 });
  }

  if (rows.length !== requestIds.length) {
    return NextResponse.json({ error: errBranchMatSomeInvalidRequestIds(bl) }, { status: 400 });
  }

  if (!isSuper) {
    const { data: mem } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id);
    const allowed = new Set((mem ?? []).map((m) => m.organization_id as string));
    for (const r of rows) {
      if (!allowed.has(r.organization_id as string)) {
        return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
      }
    }
  }

  const { error: updErr } = await admin
    .from("branch_material_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", requestIds);

  if (updErr) {
    if (isBranchMaterialSchemaMissing(updErr)) {
      return NextResponse.json({ error: errBranchMatTableMissing(bl) }, { status: 503 });
    }
    console.error("[branch/material-requests PATCH] update", updErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: requestIds.length, status });
}
