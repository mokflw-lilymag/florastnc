import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { readOwnerPinCode, writeOwnerPinCode } from "@/lib/owner-pin";

async function getCallerContext(userId: string) {
  const adminClient = createAdminClient();
  if (!adminClient) return null;

  const { data } = await adminClient
    .from("profiles")
    .select("tenant_id, org_work_tenant_id, role")
    .eq("id", userId)
    .single();

  if (!data) return null;
  if (data.role === "tenant_staff" || data.role === "staff") return null;

  const tenantId = data.org_work_tenant_id || data.tenant_id;
  if (!tenantId) return null;

  return { tenantId, userId };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getCallerContext(user.id);
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: "Admin client not configured" }, { status: 500 });
    }

    const pin = await readOwnerPinCode(ctx.tenantId, ctx.userId);

    const { count } = await adminClient
      .from("tenant_staff")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId);

    return NextResponse.json({
      hasPin: !!pin,
      staffCount: count ?? 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getCallerContext(user.id);
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { newPin } = await req.json();
    if (!newPin || String(newPin).length !== 4) {
      return NextResponse.json({ error: "4자리 PIN 번호를 입력해주세요." }, { status: 400 });
    }

    await writeOwnerPinCode(ctx.tenantId, ctx.userId, String(newPin));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
