import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";

// 지점 개별 지출 수정 및 삭제 API
export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({}));
  const { action, id, tenantId, amount, category, description, payment_method, expense_date } = body;

  if (!action || !id || !tenantId) {
    return NextResponse.json({ error: "Missing required identifier or action" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    if (action === "update") {
      if (amount === undefined || !category || !expense_date) {
        return NextResponse.json({ error: "Missing required fields for update" }, { status: 400 });
      }

      // 본사 어드민 세션으로 RLS를 우회하여 해당 지점의 지출 행을 강제 업데이트
      const { error: updateErr } = await admin
        .from("expenses")
        .update({
          amount: Number(amount),
          category: category.trim(),
          description: (description || "").trim(),
          payment_method: (payment_method || "card").trim(),
          expense_date: expense_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true });
    } 
    
    if (action === "delete") {
      // 본사 어드민 세션으로 RLS를 우회하여 해당 지점의 지출 행을 강제 삭제
      const { error: deleteErr } = await admin
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (deleteErr) throw deleteErr;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    console.error("[hq/branch-expenses/edit POST] error:", e);
    return NextResponse.json({ error: e.message || "Failed to modify branch expense" }, { status: 500 });
  }
}
