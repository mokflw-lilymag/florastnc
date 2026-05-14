import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminDataLoadFailed,
  errAdminForbidden,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

/** design_gallery_themes/assets 테이블·스키마 미적용 등으로 조회 실패 시 — 500 대신 빈 목록 */
function shouldReturnEmptyGallery(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  const code = String(error.code ?? "");
  // 컬럼 누락(구 스키마)은 여기서 제외 — schema 보강이 필요하므로 일반 500 처리
  if (code === "42703") return false;
  if (msg.includes("column") && msg.includes("does not exist")) return false;
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    (msg.includes("does not exist") &&
      !msg.includes("column") &&
      (msg.includes("relation") || msg.includes("table"))) ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache") ||
    (msg.includes("design_gallery") && msg.includes("relation"))
  );
}

/** 슈퍼관리자: 전체 테마·에셋 (비활성 테마 포함) */
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

  const { data: themes, error } = await admin
    .from("design_gallery_themes")
    .select("*, design_gallery_assets(*)")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("design-gallery GET:", error);
    if (shouldReturnEmptyGallery(error)) {
      // 스키마 미적용 등: 토스트 안 띄우고 빈 화면으로 안내
      return NextResponse.json({
        themes: [],
        schemaMissing: true,
        hint: "supabase/design_studio_gallery_templates.sql 적용 필요",
      });
    }
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }

  const normalized = (themes ?? []).map((t: any) => ({
    ...t,
    design_gallery_assets: [...(t.design_gallery_assets ?? [])].sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    ),
  }));

  return NextResponse.json({ themes: normalized });
}
