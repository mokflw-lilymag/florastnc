import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { PurchaseService } from "@/services/purchase-service";
import { assertHqAccessToBranchTenant } from "@/lib/hq-branch-tenant-access";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
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
    return NextResponse.json({ error: "requestId·items가 필요합니다." }, { status: 400 });
  }

  const { data: reqRow, error: reqErr } = await admin
    .from("branch_material_requests")
    .select("id, tenant_id, organization_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (reqErr) {
    console.error("[hq/fulfill] load request", reqErr);
    return NextResponse.json({ error: reqErr.message }, { status: 500 });
  }
  if (!reqRow) {
    return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  }

  if (reqRow.status === "fulfilled") {
    return NextResponse.json({ error: "이미 처리완료된 요청입니다." }, { status: 409 });
  }
  if (reqRow.status === "cancelled") {
    return NextResponse.json({ error: "취소된 요청은 처리할 수 없습니다." }, { status: 400 });
  }

  const gate = await assertHqAccessToBranchTenant(admin, {
    branchTenantId: reqRow.tenant_id as string,
    isSuperAdmin: isSuper,
    orgIds,
  });
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  if (reqRow.organization_id && orgIds.length > 0 && !isSuper) {
    if (!orgIds.includes(reqRow.organization_id as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json({ error: linesErr.message }, { status: 500 });
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
        return NextResponse.json(
          { error: "해당 지점에 등록되지 않은 거래처가 있습니다." },
          { status: 400 }
        );
      }
    }
  }

  const stockRollbacks: { materialId: string; quantity: number }[] = [];

  try {
    for (const it of items) {
      if (!it.lineId || it.exclude) continue;
      const line = lineById.get(it.lineId);
      if (!line) {
        return NextResponse.json({ error: `알 수 없는 품목 줄: ${it.lineId}` }, { status: 400 });
      }

      const qty = Number(it.actualQuantity);
      const unitPrice = Number(it.unitPrice);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ error: "단가는 0 이상이어야 합니다." }, { status: 400 });
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
              error:
                "expenses 테이블에 related_branch_material_request_id 컬럼이 필요합니다. supabase/branch_material_request_fulfillment.sql 을 적용하세요.",
              detail: msg,
            },
            { status: 503 }
          );
        }
        console.error("[hq/fulfill] expenses", expErr);
        return NextResponse.json({ error: expErr.message }, { status: 500 });
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
      return NextResponse.json(
        {
          error: "지출·재고는 반영되었으나 요청 상태 갱신에 실패했습니다. 관리자에게 문의하세요.",
          detail: updErr.message,
        },
        { status: 500 }
      );
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
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
