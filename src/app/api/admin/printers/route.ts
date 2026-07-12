import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminDataLoadFailed,
  errAdminForbidden,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

// GET /api/admin/printers
// printer_devices 테이블에서 실시간 집계하여 기종별 재고 요약 반환
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

  try {
    // 1. printer_devices 전체 조회 (시리얼 단위 실물 기기)
    const { data: devices, error: dErr } = await admin
      .from("printer_devices")
      .select("id, device_type, model_name, status, current_tenant_id, leased_at, memo, created_at");

    if (dErr) throw dErr;

    // 2. 기종별 집계
    const modelMap: Record<string, {
      device_type: "pos" | "label";
      model_name: string;
      total_stock: number;
      leased_count: number;
      available_count: number;
      repair_count: number;
      disposed_count: number;
    }> = {};

    for (const d of devices ?? []) {
      const key = `${d.device_type}::${d.model_name}`;
      if (!modelMap[key]) {
        modelMap[key] = {
          device_type: d.device_type,
          model_name: d.model_name,
          total_stock: 0,
          leased_count: 0,
          available_count: 0,
          repair_count: 0,
          disposed_count: 0,
        };
      }
      const m = modelMap[key];
      m.total_stock++;
      if (d.status === "leased") m.leased_count++;
      else if (d.status === "repair") m.repair_count++;
      else if (d.status === "disposed") m.disposed_count++;
      else m.available_count++; // in_stock
    }

    const inventory = Object.values(modelMap).sort((a, b) => {
      if (a.device_type !== b.device_type) return a.device_type.localeCompare(b.device_type);
      return a.model_name.localeCompare(b.model_name);
    });

    // 3. 현재 임대 중인 기기의 테넌트 정보
    const leasedDevices = (devices ?? []).filter(d => d.status === "leased" && d.current_tenant_id);
    const tenantIds = [...new Set(leasedDevices.map(d => d.current_tenant_id!))];

    let tenantNameMap: Record<string, string> = {};
    if (tenantIds.length > 0) {
      const { data: tenants } = await admin
        .from("tenants")
        .select("id, name")
        .in("id", tenantIds);
      for (const t of tenants ?? []) {
        tenantNameMap[t.id] = t.name;
      }
    }

    const currentLeases = leasedDevices.map(d => ({
      tenant_id: d.current_tenant_id!,
      tenant_name: tenantNameMap[d.current_tenant_id!] || "알 수 없는 회원사",
      device_type: d.device_type as "pos" | "label",
      model_name: d.model_name,
      leased_at: d.leased_at,
      memo: d.memo,
    }));

    return NextResponse.json({
      inventory,
      history: [],      // AS 이력은 별도 관리 (추후 확장)
      currentLeases,
    });
  } catch (err: any) {
    console.error("GET /api/admin/printers error:", err);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }
}

// POST /api/admin/printers — 기종 수동 추가는 더 이상 사용하지 않음
// (printer_devices에 시리얼 단위로 등록하면 자동 집계됨)
// 하위 호환을 위해 204 반환
export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }
  // 이제 printer_devices 기반 집계이므로 수동 재고 추가 불필요
  return NextResponse.json({ success: true, message: "기종별 재고는 printer_devices 시리얼 등록 시 자동 집계됩니다." });
}

// DELETE /api/admin/printers — 마찬가지로 printer_devices에서 직접 삭제 사용
export async function DELETE(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }
  return NextResponse.json({ success: true, message: "printer_devices 탭에서 개별 기기를 직접 삭제하세요." });
}
