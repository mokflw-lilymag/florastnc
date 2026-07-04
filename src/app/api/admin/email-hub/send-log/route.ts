import { NextResponse } from "next/server";
import { requireEmailHubAdmin } from "@/lib/admin/email-hub/guard";
import { isMissingDbTableError } from "@/lib/admin/email-hub/db-errors";
import { EMAIL_HUB_SCHEMA_HINT } from "@/lib/admin/email-hub/template-store";

export async function GET(req: Request) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  const sp = new URL(req.url).searchParams;
  const limit = Math.min(parseInt(sp.get("limit") || "50", 10) || 50, 200);

  const { data, error } = await auth.admin
    .from("platform_email_send_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingDbTableError(error, "platform_email_send_log")) {
      return NextResponse.json({ logs: [], schemaReady: false, warning: EMAIL_HUB_SCHEMA_HINT });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [], schemaReady: true });
}
