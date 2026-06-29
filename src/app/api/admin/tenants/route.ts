import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminDataLoadFailed,
  errAdminForbidden,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

/**
 * 플랫폼 슈퍼(이메일 기준)는 클라이언트에서 isSuperAdmin 이지만
 * DB profiles.role 이 아직 super_admin 이 아닐 수 있어 RLS 로 tenants + profiles 조인이 실패할 수 있음.
 * 관리자 화면 전용: 세션 검증 후 서비스 롤로 목록 반환.
 */
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

  const { data: tenants, error: tErr } = await admin
    .from("tenants")
    .select(
      "id, name, plan, status, subscription_start, subscription_end, created_at, organization_id"
    )
    .order("created_at", { ascending: false });

  if (tErr) {
    console.error("admin tenants list:", tErr);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }

  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id, email, role, tenant_id")
    .not("tenant_id", "is", null);

  if (pErr) {
    console.error("admin tenants profiles:", pErr);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }

  // settings_[id] 에서 프린터 임대 및 국가 정보 가져오기
  const tenantIds = (tenants ?? []).map((t) => t.id);
  const settingsIds = tenantIds.map((id) => `settings_${id}`);
  const { data: settings } = await admin
    .from("system_settings")
    .select("tenant_id, data")
    .in("id", settingsIds);

  const settingsMap: Record<string, { 
    country?: string; 
    currency?: string; 
    pos_printer_leased?: boolean; 
    pos_printer_model?: string; 
    pos_printer_date?: string; 
    pos_printer_history?: any[];
    label_printer_leased?: boolean;
    label_printer_model?: string;
    label_printer_date?: string;
    label_printer_history?: any[];
    // 사업자 정보
    representative?: string;
    businessNumber?: string;
    contactPhone?: string;
    address?: string;
    siteWebsite?: string;
    storeEmail?: string;
  }> = {};
  for (const s of settings ?? []) {
    if (s.data && typeof s.data === "object") {
      const d = s.data as Record<string, unknown>;
      settingsMap[s.tenant_id] = {
        country: d.country as string ?? null,
        currency: d.currency as string ?? null,
        pos_printer_leased: !!d.pos_printer_leased,
        pos_printer_model: d.pos_printer_model as string ?? "",
        pos_printer_date: d.pos_printer_date as string ?? null,
        pos_printer_history: Array.isArray(d.pos_printer_history) ? d.pos_printer_history : [],
        label_printer_leased: !!d.label_printer_leased,
        label_printer_model: d.label_printer_model as string ?? "",
        label_printer_date: d.label_printer_date as string ?? null,
        label_printer_history: Array.isArray(d.label_printer_history) ? d.label_printer_history : [],
        // 사업자 정보 (환경설정 store 탭에서 저장)
        representative: d.representative as string ?? "",
        businessNumber: d.businessNumber as string ?? "",
        contactPhone: d.contactPhone as string ?? "",
        address: d.address as string ?? "",
        siteWebsite: d.siteWebsite as string ?? "",
        storeEmail: d.storeEmail as string ?? "",
      };
    }
  }

  const byTenant = new Map<string, { id: string; email: string; role: string }[]>();
  for (const p of profiles ?? []) {
    const tid = p.tenant_id as string;
    if (!tid) continue;
    const list = byTenant.get(tid) ?? [];
    list.push({ id: String(p.id ?? ""), email: String(p.email ?? ""), role: String(p.role ?? "") });
    byTenant.set(tid, list);
  }

  const merged = (tenants ?? []).map((t) => ({
    ...t,
    profiles: byTenant.get(t.id) ?? [],
    pos_printer_leased: settingsMap[t.id]?.pos_printer_leased ?? false,
    pos_printer_model: settingsMap[t.id]?.pos_printer_model ?? null,
    pos_printer_date: settingsMap[t.id]?.pos_printer_date ?? null,
    pos_printer_history: settingsMap[t.id]?.pos_printer_history ?? null,
    label_printer_leased: settingsMap[t.id]?.label_printer_leased ?? false,
    label_printer_model: settingsMap[t.id]?.label_printer_model ?? null,
    label_printer_date: settingsMap[t.id]?.label_printer_date ?? null,
    label_printer_history: settingsMap[t.id]?.label_printer_history ?? null,
    country: settingsMap[t.id]?.country ?? null,
    currency: settingsMap[t.id]?.currency ?? null,
    // 사업자 정보
    representative: settingsMap[t.id]?.representative ?? "",
    businessNumber: settingsMap[t.id]?.businessNumber ?? "",
    contactPhone: settingsMap[t.id]?.contactPhone ?? "",
    address: settingsMap[t.id]?.address ?? "",
    siteWebsite: settingsMap[t.id]?.siteWebsite ?? "",
    storeEmail: settingsMap[t.id]?.storeEmail ?? "",
  }));

  return NextResponse.json({ tenants: merged });
}
