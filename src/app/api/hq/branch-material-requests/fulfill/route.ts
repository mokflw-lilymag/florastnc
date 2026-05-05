import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { PurchaseService } from "@/services/purchase-service";
import { assertHqAccessToBranchTenant } from "@/lib/hq-branch-tenant-access";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errFulfillAlreadyDone,
  errFulfillCancelled,
  errFulfillExpenseColumnMissing,
  errFulfillGeneric,
  errFulfillRequestIdItems,
  errFulfillRequestNotFound,
  errFulfillStatusUpdateFailed,
  errFulfillSupplierNotOnBranch,
  errFulfillUnknownLineId,
  errFulfillUnitPriceNonNegative,
} from "@/lib/hq/hq-branch-work-api-errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  errAdminForbidden,
  errAdminOperationFailed,
  errAdminServerMisconfigured,
  errAdminUnauthorized,
} from "@/lib/admin/admin-api-errors";

async function incrementStockKeepPrice(admin: SupabaseClient, materialId: string, quantity: number) {
  const { data: material } = await admin
    .from("materials")
    .select("stock, current_stock")
    .eq("id", materialId)
    .maybeSingle();
  if (!material) return;
  const cur = Number(material.stock ?? material.current_stock ?? 0) || 0;
  const newStock = cur + quantity;
  await admin
    .from("materials")
    .update({
      stock: newStock,
      current_stock: newStock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", materialId);
}

type LineRow = {
  id: string;
  request_id: string;
  material_id: string | null;
  name: string;
  main_category: string;
  mid_category: string;
  quantity: unknown;
  unit: string;
  spec: string | null;
};

type FulfillItem = {
  lineId: string;
  actualQuantity: unknown;
  unitPrice: unknown;
  supplierId?: string | null;
  exclude?: boolean;
};

/**
 * 자재 요청 입고 확정: 지점 자재 재고 반영 + 지점 expenses 행 생성 + 요청 fulfilled
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const body = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  if (!user) {
    return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isSuper = profile?.role === "super_admin";

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);
  const orgIds = [...new Set((memberships ?? []).map((m) => m.organization_id as string))];

  if (!isSuper && orgIds.length === 0) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";
  const itemsRaw = Array.isArray(body?.items) ? body.items : [];
  const paymentMethod =
    typeof body?.paymentMethod === "string" && body.paymentMethod.trim()
      ? body.paymentMethod.trim()
      : "card";
  let expenseDateIso = new Date().toISOString();
  if (typeof body?.expenseDate === "string" && body.expenseDate.trim()) {
    const d = new Date(body.expenseDate + (body.expenseDate.length === 10 ? "T12:00:00" : ""));
    if (!Number.isNaN(d.getTime())) expenseDateIso = d.toISOString();
  }

  if (!requestId || itemsRaw.length === 0) {
    return NextResponse.json({ error: errFulfillRequestIdItems(bl) }, { status: 400 });
  }

  const { data: reqRow, error: reqErr } = await admin
    .from("branch_material_requests")
    .select("id, tenant_id, organization_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (reqErr) {
    console.error("[hq/fulfill] load request", reqErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }
  if (!reqRow) {
    return NextResponse.json({ error: errFulfillRequestNotFound(bl) }, { status: 404 });
  }

  if (reqRow.status === "fulfilled") {
    return NextResponse.json({ error: errFulfillAlreadyDone(bl) }, { status: 409 });
  }
  if (reqRow.status === "cancelled") {
    return NextResponse.json({ error: errFulfillCancelled(bl) }, { status: 400 });
  }

  const gate = await assertHqAccessToBranchTenant(admin, {
    branchTenantId: reqRow.tenant_id as string,
    isSuperAdmin: isSuper,
    orgIds,
    uiBase: bl,
  });
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  if (reqRow.organization_id && orgIds.length > 0 && !isSuper) {
    if (!orgIds.includes(reqRow.organization_id as string)) {
      return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
    }
  }

  const { data: lineRows, error: linesErr } = await admin
    .from("branch_material_request_lines")
    .select(
      "id, request_id, material_id, name, main_category, mid_category, quantity, unit, spec"
    )
    .eq("request_id", requestId);

  if (linesErr) {
    console.error("[hq/fulfill] lines", linesErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const lineById = new Map((lineRows ?? []).map((r) => [r.id as string, r as LineRow]));

  const items: FulfillItem[] = itemsRaw.map((x: FulfillItem) => ({
    lineId: String(x?.lineId ?? ""),
    actualQuantity: x?.actualQuantity,
    unitPrice: x?.unitPrice,
    supplierId: x?.supplierId ?? null,
    exclude: !!x?.exclude,
  }));

  for (const it of items) {
    if (!it.lineId || it.exclude) continue;
    const sid = typeof it.supplierId === "string" && it.supplierId.trim() ? it.supplierId.trim() : null;
    if (sid) {
      const { data: sd } = await admin
        .from("suppliers")
        .select("id")
        .eq("id", sid)
        .eq("tenant_id", reqRow.tenant_id)
        .maybeSingle();
      if (!sd) {
        return NextResponse.json({ error: errFulfillSupplierNotOnBranch(bl) }, { status: 400 });
      }
    }
  }

  const stockRollbacks: { materialId: string; quantity: number }[] = [];

  try {
    for (const it of items) {
      if (!it.lineId || it.exclude) continue;
      const line = lineById.get(it.lineId);
      if (!line) {
        return NextResponse.json({ error: errFulfillUnknownLineId(bl, it.lineId) }, { status: 400 });
      }

      const qty = Number(it.actualQuantity);
      const unitPrice = Number(it.unitPrice);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ error: errFulfillUnitPriceNonNegative(bl) }, { status: 400 });
      }

      const mid = line.material_id?.trim();
      if (!mid) continue;

      if (unitPrice > 0) {
        await PurchaseService.updateMaterialStock(admin, mid, qty, qty * unitPrice);
      } else {
        await incrementStockKeepPrice(admin, mid, qty);
      }
      stockRollbacks.push({ materialId: mid, quantity: qty });
    }

    const expensePayloads: Record<string, unknown>[] = [];
    const shortRef = requestId.slice(0, 8);

    for (const it of items) {
      if (!it.lineId || it.exclude) continue;
      const line = lineById.get(it.lineId);
      if (!line) continue;

      const qty = Number(it.actualQuantity);
      const unitPrice = Number(it.unitPrice);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;

      const amount = Math.round(qty * unitPrice);
      if (amount <= 0) continue;

      const supplierId =
        typeof it.supplierId === "string" && it.supplierId.trim() ? it.supplierId.trim() : null;

      expensePayloads.push({
        id: crypto.randomUUID(),
        tenant_id: reqRow.tenant_id,
        category: "materials",
        sub_category: "material_request",
        amount,
        description: `[자재요청 ${shortRef}] ${line.name}`,
        expense_date: expenseDateIso,
        payment_method: paymentMethod,
        supplier_id: supplierId,
        material_id: line.material_id?.trim() || null,
        quantity: qty,
        related_branch_material_request_id: requestId,
        created_at: new Date().toISOString(),
      });
    }

    if (expensePayloads.length > 0) {
      const { error: expErr } = await admin.from("expenses").insert(expensePayloads);
      if (expErr) {
        for (const rb of [...stockRollbacks].reverse()) {
          await PurchaseService.revertMaterialStock(admin, rb.materialId, rb.quantity);
        }
        const msg = expErr.message ?? "";
        if (/related_branch_material_request|column/i.test(msg)) {
          return NextResponse.json(
            {
              error: errFulfillExpenseColumnMissing(bl),
            },
            { status: 503 }
          );
        }
        console.error("[hq/fulfill] expenses", expErr);
        return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
      }
    }

    const { error: updErr } = await admin
      .from("branch_material_requests")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updErr) {
      console.error("[hq/fulfill] status", updErr);
      return NextResponse.json({ error: errFulfillStatusUpdateFailed(bl) }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      expenseCount: expensePayloads.length,
      stockLineCount: stockRollbacks.length,
    });
  } catch (e) {
    for (const rb of [...stockRollbacks].reverse()) {
      try {
        await PurchaseService.revertMaterialStock(admin, rb.materialId, rb.quantity);
      } catch {
        /* ignore */
      }
    }
    console.error("[hq/fulfill]", e);
    return NextResponse.json({ error: errFulfillGeneric(bl) }, { status: 500 });
  }
}
