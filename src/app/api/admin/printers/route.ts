import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminDataLoadFailed,
  errAdminForbidden,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

// GET /api/admin/printers - 전체 장비 보유 대수 리스트 및 임대 통계 가져오기
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
    // 1. printer_inventory 조회
    const { data: inventory, error: iErr } = await admin
      .from("printer_inventory")
      .select("*")
      .order("device_type", { ascending: true })
      .order("model_name", { ascending: true });

    if (iErr) throw iErr;

    // 2. 전체 테넌트 settings 조회하여 기종별 실제 임대 수량 파악
    const { data: settings, error: sErr } = await admin
      .from("system_settings")
      .select("tenant_id, data");

    if (sErr) throw sErr;

    // 3. 임대 현황 세부 분석 매퍼
    const posLeaseCounts: Record<string, number> = {};
    const labelLeaseCounts: Record<string, number> = {};
    
    // 테넌트 매핑을 위한 리스트
    const leasedTenants: any[] = [];

    for (const s of settings ?? []) {
      if (s.data && typeof s.data === "object") {
        const d = s.data as Record<string, any>;
        
        // 포스프린터 체크
        if (d.pos_printer_leased && d.pos_printer_model) {
          const model = d.pos_printer_model;
          posLeaseCounts[model] = (posLeaseCounts[model] || 0) + 1;
        }

        // 라벨프린터 체크
        if (d.label_printer_leased && d.label_printer_model) {
          const model = d.label_printer_model;
          labelLeaseCounts[model] = (labelLeaseCounts[model] || 0) + 1;
        }

        // 전체 교환 이력 타임라인 리스트화 (통합 AS 히스토리용)
        if (d.pos_printer_history && Array.isArray(d.pos_printer_history)) {
          for (const h of d.pos_printer_history) {
            if (h && typeof h === "object") {
              leasedTenants.push({
                tenant_id: s.tenant_id,
                device_type: "pos",
                model: h.model || "알 수 없음",
                date: h.date || "",
                memo: h.memo || "",
              });
            }
          }
        }
        if (d.label_printer_history && Array.isArray(d.label_printer_history)) {
          for (const h of d.label_printer_history) {
            if (h && typeof h === "object") {
              leasedTenants.push({
                tenant_id: s.tenant_id,
                device_type: "label",
                model: h.model || "알 수 없음",
                date: h.date || "",
                memo: h.memo || "",
              });
            }
          }
        }
      }
    }

    // 테넌트 ID -> 테넌트 이름 맵핑
    const { data: tenants } = await admin
      .from("tenants")
      .select("id, name");
    const tenantNameMap: Record<string, string> = {};
    for (const t of tenants ?? []) {
      tenantNameMap[t.id] = t.name;
    }

    const resolvedLeasedTenants = leasedTenants.map((item) => ({
      ...item,
      tenant_name: tenantNameMap[item.tenant_id] || "알 수 없는 화원사",
    })).sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      return dateB.localeCompare(dateA);
    }); // 최신 날짜순 정렬

    // 현재 임대 현황: 각 테넌트가 실제로 임대 중인 장비 목록
    const currentLeases: Array<{
      tenant_id: string;
      tenant_name: string;
      device_type: "pos" | "label";
      model_name: string;
    }> = [];

    for (const s of settings ?? []) {
      if (s.data && typeof s.data === "object") {
        const d = s.data as Record<string, any>;
        const tName = tenantNameMap[s.tenant_id] || "알 수 없는 화원사";

        if (d.pos_printer_leased && d.pos_printer_model) {
          currentLeases.push({
            tenant_id: s.tenant_id,
            tenant_name: tName,
            device_type: "pos",
            model_name: d.pos_printer_model,
          });
        }
        if (d.label_printer_leased && d.label_printer_model) {
          currentLeases.push({
            tenant_id: s.tenant_id,
            tenant_name: tName,
            device_type: "label",
            model_name: d.label_printer_model,
          });
        }
      }
    }

    // 재고 리스트에 임대 수량과 가용 수량 병합
    const mergedInventory = (inventory ?? []).map((item) => {
      const isPos = item.device_type === "pos";
      const leased = isPos 
        ? (posLeaseCounts[item.model_name] || 0)
        : (labelLeaseCounts[item.model_name] || 0);
      const available = Math.max(0, item.total_stock - leased);

      return {
        ...item,
        leased_count: leased,
        available_count: available,
      };
    });

    return NextResponse.json({
      inventory: mergedInventory,
      history: resolvedLeasedTenants,
      currentLeases,
    });
  } catch (err: any) {
    console.error("GET /api/admin/printers error:", err);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }
}

// POST /api/admin/printers - 본사 신규 장비 등록 또는 재고량 추가/수정
export async function POST(req: Request) {
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
    const { id, device_type, model_name, total_stock } = await req.json();

    if (!device_type || !model_name || total_stock === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error: upsertErr } = await admin
      .from("printer_inventory")
      .upsert({
        ...(id ? { id } : {}),
        device_type,
        model_name,
        total_stock: Number(total_stock),
        updated_at: new Date().toISOString(),
      }, { onConflict: "model_name" });

    if (upsertErr) throw upsertErr;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/admin/printers error:", err);
    return NextResponse.json({ error: "저장 실패: " + err.message }, { status: 500 });
  }
}

// DELETE /api/admin/printers - 기종 삭제
export async function DELETE(req: Request) {
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
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { error: delErr } = await admin
      .from("printer_inventory")
      .delete()
      .eq("id", id);

    if (delErr) throw delErr;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/printers error:", err);
    return NextResponse.json({ error: "삭제 실패: " + err.message }, { status: 500 });
  }
}
