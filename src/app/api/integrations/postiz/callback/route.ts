import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { syncTenantInstagramFromPostiz } from "@/lib/revenue/postiz-service";

/** GET — Postiz 연결 후 콜백 (OAuth proxy 단순화: sync 트리거) */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const tenantId = sp.get("tenant");
  if (!tenantId) {
    return NextResponse.redirect(new URL("/dashboard/revenue?postiz=missing_tenant", req.url));
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.redirect(new URL("/dashboard/revenue?postiz=db_error", req.url));
  }

  try {
    const result = await syncTenantInstagramFromPostiz(db, tenantId);
    const q = result.synced ? "postiz=connected" : `postiz=${result.reason ?? "failed"}`;
    return NextResponse.redirect(new URL(`/dashboard/revenue?${q}`, req.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard/revenue?postiz=error", req.url));
  }
}
