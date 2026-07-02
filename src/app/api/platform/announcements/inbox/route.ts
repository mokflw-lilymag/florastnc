import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { countUnreadNotifications, fetchNotificationInbox } from "@/lib/platform-announcements/inbox";

export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));

  try {
    const items = await fetchNotificationInbox(gate.supabase, gate.userId, 40);
    const unreadCount = countUnreadNotifications(items);
    return NextResponse.json({ items, unreadCount });
  } catch (e) {
    console.error("[platform/announcements/inbox GET]", e);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }
}
