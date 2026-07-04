import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminInvalidBody, errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { logSupportAudit, requireSuperAdmin } from "@/lib/support-tickets/db";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const adminGate = requireSuperAdmin(gate, bl);
  if (!adminGate.ok) return adminGate.response;

  const { data: ticket, error: tErr } = await adminGate.admin
    .from("support_tickets")
    .select("id, ticket_no, tenant_id, author_user_id, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (tErr || !ticket || ticket.deleted_at) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const userId = (body?.userId as string | undefined) || (ticket.author_user_id as string);

  const { data: userRecord, error: userError } = await adminGate.admin.auth.admin.getUserById(userId);
  if (userError || !userRecord?.user?.email) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://floxync.com";
  const { data: linkData, error: linkErr } = await adminGate.admin.auth.admin.generateLink({
    type: "magiclink",
    email: userRecord.user.email,
    options: { redirectTo: `${appUrl}/dashboard` },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    console.error("[magic-link]", linkErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  await logSupportAudit(adminGate.admin, id, "magic_link_sent", gate.userId, {
    ticket_no: ticket.ticket_no,
    email: userRecord.user.email,
  });

  return NextResponse.json({
    ok: true,
    email: userRecord.user.email,
    actionLink: linkData.properties.action_link,
  });
}
