import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminInvalidBody, errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { logSupportAudit, requireSuperAdmin } from "@/lib/support-tickets/db";
import { removeStoragePaths } from "@/lib/support-tickets/storage";
import type { SupportAttachmentMeta } from "@/lib/support-tickets/types";

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const adminGate = requireSuperAdmin(gate, bl);
  if (!adminGate.ok) return adminGate.response;

  const confirm = (body?.confirm as string | undefined)?.trim();
  if (confirm !== "영구삭제") {
    return NextResponse.json(
      { error: errAdminInvalidBody(bl), hint: "confirm 필드에 '영구삭제'를 입력하세요." },
      { status: 400 },
    );
  }

  const { data: ticket, error: ticketErr } = await adminGate.admin
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: "휴지통에 있는 문의만 영구 삭제할 수 있습니다." }, { status: 404 });
  }

  const { data: replies } = await adminGate.admin
    .from("support_ticket_replies")
    .select("attachment_paths")
    .eq("ticket_id", id);

  const allPaths: SupportAttachmentMeta[] = [
    ...((ticket.attachment_paths as SupportAttachmentMeta[]) ?? []),
    ...((replies ?? []).flatMap((r) => (r.attachment_paths as SupportAttachmentMeta[]) ?? [])),
  ];

  await removeStoragePaths(adminGate.admin, allPaths);
  await adminGate.admin.from("support_ticket_replies").delete().eq("ticket_id", id);
  await adminGate.admin.from("support_tickets").delete().eq("id", id);

  await logSupportAudit(adminGate.admin, id, "purged", gate.userId, {
    ticket_no: ticket.ticket_no,
  });

  return NextResponse.json({ ok: true });
}
