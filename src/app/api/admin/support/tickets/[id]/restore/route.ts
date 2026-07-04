import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { logSupportAudit, requireSuperAdmin } from "@/lib/support-tickets/db";
import { toListItem } from "@/lib/support-tickets/mask";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const adminGate = requireSuperAdmin(gate, bl);
  if (!adminGate.ok) return adminGate.response;

  const now = new Date().toISOString();
  const { data: row, error } = await adminGate.admin
    .from("support_tickets")
    .update({ deleted_at: null, deleted_by: null, updated_at: now })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("*, tenants(name)")
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 404 });
  }

  await logSupportAudit(adminGate.admin, id, "restored", gate.userId, {
    ticket_no: row.ticket_no,
  });

  return NextResponse.json({
    ticket: toListItem(row as Parameters<typeof toListItem>[0], gate.userId, true),
  });
}
