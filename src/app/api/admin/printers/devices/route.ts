import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminDataLoadFailed,
  errAdminForbidden,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

// GET /api/admin/printers/devices - 개별 기기(시리얼) 목록 조회
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
    const { data: devices, error } = await admin
      .from("printer_devices")
      .select(`
        *,
        tenants:current_tenant_id (name, status, subscription_end)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ devices });
  } catch (err: any) {
    console.error("GET /api/admin/printers/devices error:", err);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }
}

// POST /api/admin/printers/devices - 신규 시리얼 등록 (단건/다건)
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
    const body = await req.json();
    
    // items 배열이 있으면 다건 등록, 없으면 단건 등록
    let items = body.items;
    if (!items) {
      items = [body];
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("printer_devices")
      .insert(items.map((item: any) => ({
        device_type: item.device_type,
        model_name: item.model_name,
        serial_number: item.serial_number,
        status: item.status || 'in_stock',
        memo: item.memo || null
      })))
      .select();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "이미 등록된 시리얼 번호가 포함되어 있습니다." }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, inserted: data });
  } catch (err: any) {
    console.error("POST /api/admin/printers/devices error:", err);
    return NextResponse.json({ error: "저장 실패: " + err.message }, { status: 500 });
  }
}

// PUT /api/admin/printers/devices - 기기 정보 수정 (상태 변경 등)
export async function PUT(req: Request) {
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
    const { id, status, current_tenant_id, memo, leased_at } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const updates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (status !== undefined) updates.status = status;
    if (current_tenant_id !== undefined) updates.current_tenant_id = current_tenant_id;
    if (memo !== undefined) updates.memo = memo;
    if (leased_at !== undefined) updates.leased_at = leased_at;

    const { error } = await admin
      .from("printer_devices")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PUT /api/admin/printers/devices error:", err);
    return NextResponse.json({ error: "수정 실패: " + err.message }, { status: 500 });
  }
}

// DELETE /api/admin/printers/devices - 기기 삭제
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

    const { error } = await admin
      .from("printer_devices")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/printers/devices error:", err);
    return NextResponse.json({ error: "삭제 실패: " + err.message }, { status: 500 });
  }
}
