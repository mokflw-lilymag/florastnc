import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { requireSuperAdmin } from "@/lib/support-tickets/db";
import { toListItem } from "@/lib/support-tickets/mask";

export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));
  const adminGate = requireSuperAdmin(gate, bl);
  if (!adminGate.ok) return adminGate.response;

  const { data, error } = await adminGate.admin
    .from("support_tickets")
    .select("*, tenants(name)")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[admin/support/trash GET]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const tickets = (data ?? []).map((row) =>
    toListItem(row as Parameters<typeof toListItem>[0], gate.userId, true),
  );

  return NextResponse.json({ tickets });
}
