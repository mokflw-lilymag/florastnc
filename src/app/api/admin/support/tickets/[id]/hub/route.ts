import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import {
  fetchRelatedTickets,
  fetchSupportTimeline,
  fetchTenantHealth,
  ticketQuickActions,
} from "@/lib/support-tickets/hub";
import { requireSuperAdmin } from "@/lib/support-tickets/db";
import { SUPPORT_REPLY_TEMPLATES } from "@/lib/support-tickets/reply-templates";
import { categoryRequiresAssistCode } from "@/lib/support-tickets/assist-code";
import { isRemoteSettingsCategory } from "@/lib/support-tickets/remote-settings";
import type { SupportTicketRow } from "@/lib/support-tickets/types";

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
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const ticket = row as SupportTicketRow;
  const [health, timeline, relatedTickets] = await Promise.all([
    fetchTenantHealth(adminGate.admin, ticket.tenant_id, ticket.author_user_id),
    fetchSupportTimeline(adminGate.admin, id),
    fetchRelatedTickets(adminGate.admin, ticket.tenant_id, id),
  ]);

  return NextResponse.json({
    health,
    timeline,
    relatedTickets,
    quickActions: ticketQuickActions(ticket.category),
    templates: SUPPORT_REPLY_TEMPLATES,
    flags: {
      is_remote_settings: isRemoteSettingsCategory(ticket.category),
      has_remote_assist_code: Boolean(ticket.remote_assist_code_hash),
      requires_assist_code: categoryRequiresAssistCode(ticket.category),
      category: ticket.category,
      ticket_no: ticket.ticket_no,
    },
  });
}
