import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { runSupportSelfCheck } from "@/lib/support-tickets/self-check";

export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  try {
    const result = await runSupportSelfCheck(gate.supabase, gate.userId);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[support/self-check]", e);
    return NextResponse.json({ error: "셀프 점검에 실패했습니다." }, { status: 500 });
  }
}
