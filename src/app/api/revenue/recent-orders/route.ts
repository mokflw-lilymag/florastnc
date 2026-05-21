import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";

/** GET — SNS 초안용 최근 완료 주문 */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Number(sp.get("limit") ?? 10), 30);

  const db = createAdminClient() ?? gate.supabase;
  const { data, error } = await db
    .from("orders")
    .select("id, order_number, order_date, status, items, completionphotourl, delivery_info")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []).map((o) => {
    const items = (o.items as { name?: string }[]) ?? [];
    const summary = items
      .map((i) => i.name)
      .filter(Boolean)
      .slice(0, 2)
      .join(", ");
    const di = o.delivery_info as { completionPhotoUrl?: string } | null;
    return {
      id: o.id,
      orderNumber: o.order_number,
      orderDate: o.order_date,
      itemSummary: summary,
      photoUrl: o.completionphotourl ?? di?.completionPhotoUrl ?? null,
    };
  });

  return NextResponse.json({ orders });
}
