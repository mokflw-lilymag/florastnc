import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { toListItem } from "@/lib/support-tickets/mask";
import { logSupportAudit, requireSuperAdmin } from "@/lib/support-tickets/db";
import { signedAttachmentUrls } from "@/lib/support-tickets/storage";
import { isRemoteSettingsCategory } from "@/lib/support-tickets/remote-settings";
import type { SupportTicketReplyRow, SupportTicketRow } from "@/lib/support-tickets/types";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));
  const adminGate = requireSuperAdmin(gate, bl);
  if (!adminGate.ok) return adminGate.response;

  const { data: row, error } = await adminGate.admin
    .from("support_tickets")
    .select("*, tenants(name)")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const ticket = row as SupportTicketRow & { tenants?: { name?: string } | null };

  const { data: replies } = await adminGate.admin
    .from("support_ticket_replies")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const now = new Date().toISOString();
  if (!ticket.deleted_at && !ticket.admin_read_at) {
    await adminGate.admin.from("support_tickets").update({ admin_read_at: now }).eq("id", id);
  }

  return NextResponse.json({
    ticket: {
      ...toListItem(ticket, gate.userId, true),
      body: ticket.body,
      body_locale: ticket.body_locale,
      deleted_at: ticket.deleted_at,
      attachment_paths: await signedAttachmentUrls(adminGate.admin, ticket.attachment_paths ?? []),
      store_name: ticket.tenants?.name ?? null,
      author_user_id: ticket.author_user_id,
      is_remote_settings: isRemoteSettingsCategory(ticket.category),
      has_remote_assist_code: Boolean(ticket.remote_assist_code_hash),
    },
    replies: await Promise.all(
      ((replies ?? []) as SupportTicketReplyRow[]).map(async (r) => ({
        ...r,
        attachments: await signedAttachmentUrls(adminGate.admin, r.attachment_paths ?? []),
      })),
    ),
  });
}

export async function DELETE(req: Request, ctx: RouteCtx) {
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
    .update({ deleted_at: now, deleted_by: gate.userId, updated_at: now })
    .eq("id", id)
    .is("deleted_at", null)
    .select("ticket_no")
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 404 });
  }

  await logSupportAudit(adminGate.admin, id, "deleted", gate.userId, {
    ticket_no: row.ticket_no,
  });

  return NextResponse.json({ ok: true });
}
