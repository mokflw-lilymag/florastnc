import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { toAdminListItem } from "@/lib/support-tickets/admin-list";
import { requireSuperAdmin } from "@/lib/support-tickets/db";

export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));
  const adminGate = requireSuperAdmin(gate, bl);
  if (!adminGate.ok) return adminGate.response;

  const status = sp.get("status");
  const category = sp.get("category");
  const q = sp.get("q")?.trim();

  let query = adminGate.admin
    .from("support_tickets")
    .select("*, tenants(name, plan, status, subscription_end)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (q) {
    query = query.or(`title.ilike.%${q}%,ticket_no.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/support/tickets GET]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const tickets = (data ?? []).map((row) =>
    toAdminListItem(row as Parameters<typeof toAdminListItem>[0], gate.userId),
  );
  const openCount = tickets.filter((t) => t.status === "open" && !t.has_admin_reply).length;

  return NextResponse.json({ tickets, openCount });
}
