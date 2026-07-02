import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminInvalidBody, errAdminOperationFailed } from "@/lib/admin/admin-api-errors";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  if (!id) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }

  const { error: insErr } = await gate.supabase.from("platform_announcement_reads").insert({
    announcement_id: id,
    user_id: gate.userId,
  });

  if (insErr?.code === "23505") {
    const { error: upErr } = await gate.supabase
      .from("platform_announcement_reads")
      .update({ read_at: new Date().toISOString() })
      .eq("announcement_id", id)
      .eq("user_id", gate.userId);
    if (upErr) {
      console.error("[platform/announcements read]", upErr);
      return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (insErr) {
    console.error("[platform/announcements read]", insErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
