import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { isSuperAdminProfile } from "@/lib/support-tickets/access";
import { requireSupportDb } from "@/lib/support-tickets/db";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const dbGate = requireSupportDb(bl);
  if (!dbGate.ok) return dbGate.response;

  const isAdmin = isSuperAdminProfile(gate.profile, gate.email);
  const now = new Date().toISOString();

  if (isAdmin) {
    await dbGate.admin
      .from("support_tickets")
      .update({ admin_read_at: now })
      .eq("id", id)
      .is("deleted_at", null);
  } else {
    await dbGate.admin
      .from("support_tickets")
      .update({ author_reply_read_at: now })
      .eq("id", id)
      .eq("author_user_id", gate.userId);
  }

  return NextResponse.json({ ok: true });
}
