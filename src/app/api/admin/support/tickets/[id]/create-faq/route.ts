import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { logSupportAudit, requireSuperAdmin } from "@/lib/support-tickets/db";
import { supportCategoryLabel } from "@/lib/support-tickets/categories";

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
    .select("id, ticket_no, title, body, category, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (tErr || !ticket || ticket.deleted_at) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const question =
    (body?.question as string | undefined)?.trim() || (ticket.title as string);
  const answer =
    (body?.answer as string | undefined)?.trim() ||
    `고객센터 문의 ${ticket.ticket_no} 기준으로 정리한 답변입니다.\n\n관리자에게 문의해 주세요.`;

  const categoryLabel = supportCategoryLabel(ticket.category as string, "ko");

  const { data: faq, error } = await adminGate.admin
    .from("support_faq")
    .insert({
      category: categoryLabel,
      category_icon: "📋",
      category_order: 99,
      question,
      answer,
      question_order: 99,
      is_featured: false,
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !faq) {
    console.error("[create-faq]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  await logSupportAudit(adminGate.admin, id, "faq_created", gate.userId, {
    ticket_no: ticket.ticket_no,
    faq_id: faq.id,
  });

  return NextResponse.json({
    ok: true,
    faqId: faq.id,
    editUrl: `/dashboard/admin/faq?highlight=${faq.id}&filter=draft`,
  });
}
