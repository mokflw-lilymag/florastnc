import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import { loadPlatformPostizConfig } from "@/lib/revenue/postiz-service";
import { getPostizOAuthUrl } from "@/trigger/lib/postiz-client";

/** GET — Instagram OAuth URL로 리다이렉트 (사용자는 Floxync 안에서 [Instagram 계정 연결]만 누르면 됨) */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  const db = createAdminClient() ?? gate.supabase;
  const config = await loadPlatformPostizConfig(db);
  if (!config) {
    return NextResponse.json({ error: "POSTIZ_NOT_CONFIGURED" }, { status: 503 });
  }

  const oauth = await getPostizOAuthUrl(config, "instagram");
  if (!oauth.ok || !oauth.url) {
    return NextResponse.json({ error: oauth.error ?? "OAUTH_URL_FAILED" }, { status: 503 });
  }

  const sp = new URL(req.url).searchParams;
  const wantsJson = sp.get("format") === "json";

  if (wantsJson) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    return NextResponse.json({
      instructions:
        "Facebook·Instagram 로그인 창에서 본인 계정을 선택·승인한 뒤, Floxync로 돌아와 연결 상태를 확인해 주세요.",
      oauthUrl: oauth.url,
      returnUrl: `${appUrl}/dashboard/revenue?instagram=check`,
      tenantId,
    });
  }

  return NextResponse.redirect(oauth.url);
}
