import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { canOpenTicketDetail, isSuperAdminProfile } from "@/lib/support-tickets/access";
import { toListItem } from "@/lib/support-tickets/mask";
import { requireSupportDb } from "@/lib/support-tickets/db";
import { signedAttachmentUrls } from "@/lib/support-tickets/storage";
import type { SupportTicketReplyRow, SupportTicketRow } from "@/lib/support-tickets/types";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));
  const dbGate = requireSupportDb(bl);
  if (!dbGate.ok) return dbGate.response;

  const isAdmin = isSuperAdminProfile(gate.profile, gate.email);

  const { data: row, error } = await dbGate.admin
    .from("support_tickets")
    .select("*, tenants(name)")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const ticket = row as SupportTicketRow & { tenants?: { name?: string } | null };

  if (!canOpenTicketDetail(ticket, gate.userId, isAdmin)) {
    return NextResponse.json(
      {
        denied: true,
        message: "비밀글입니다. 작성자와 관리자만 열람할 수 있습니다.",
        ticket: toListItem(ticket, gate.userId, isAdmin),
      },
      { status: 403 },
    );
  }

  const { data: replies } = await dbGate.admin
    .from("support_ticket_replies")
    .select("*")
    .eq("ticket_id", id)
    .eq("is_internal_note", false)
    .order("created_at", { ascending: true });

  const attachmentPaths = await signedAttachmentUrls(
    dbGate.admin,
    ticket.attachment_paths ?? [],
  );

  const replyRows = (replies ?? []) as SupportTicketReplyRow[];
  const repliesWithUrls = await Promise.all(
    replyRows.map(async (r) => ({
      ...r,
      attachments: await signedAttachmentUrls(dbGate.admin, r.attachment_paths ?? []),
    })),
  );

  const now = new Date().toISOString();
  if (isAdmin && !ticket.admin_read_at) {
    await dbGate.admin
      .from("support_tickets")
      .update({ admin_read_at: now })
      .eq("id", id);
  }
  if (!isAdmin && ticket.author_user_id === gate.userId && ticket.has_admin_reply) {
    await dbGate.admin
      .from("support_tickets")
      .update({ author_reply_read_at: now })
      .eq("id", id);
  }

  return NextResponse.json({
    ticket: {
      ...toListItem(ticket, gate.userId, isAdmin),
      body: ticket.body,
      body_locale: ticket.body_locale,
      attachment_paths: attachmentPaths,
      store_name: isAdmin ? ticket.tenants?.name ?? null : undefined,
    },
    replies: repliesWithUrls,
  });
}
