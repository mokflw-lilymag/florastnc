import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { canManageTenantStaff } from "@/lib/staff-access";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tenant_id, org_work_tenant_id")
      .eq("id", user.id)
      .single();

    const tenantId = profile?.org_work_tenant_id || profile?.tenant_id;
    const isSuperAdmin = profile?.role === "super_admin";

    if (
      !profile ||
      !canManageTenantStaff({
        role: profile.role,
        tenantId,
        isSuperAdmin,
      })
    ) {
      return NextResponse.json(
        { error: "점주 계정만 POS 기기를 지정할 수 있습니다." },
        { status: 403 },
      );
    }

    if (!tenantId) {
      return NextResponse.json({ error: "No tenant assigned" }, { status: 400 });
    }

    const { action } = await req.json();

    const response = NextResponse.json({ success: true, action });

    if (action === "register") {
      // Set long-lived HttpOnly cookie to designate this browser as POS for this tenant
      response.cookies.set("designated_pos_tenant_id", tenantId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
        path: "/",
      });
    } else if (action === "unregister") {
      // Remove the cookie
      response.cookies.delete("designated_pos_tenant_id");
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ isRegistered: false });

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, org_work_tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ isRegistered: false });
    
    const tenantId = profile.org_work_tenant_id || profile.tenant_id;
    if (!tenantId) return NextResponse.json({ isRegistered: false });

    const cookieStore = req.headers.get("cookie") || "";
    // Check if designated_pos_tenant_id cookie matches tenantId
    const isRegistered = cookieStore.includes(`designated_pos_tenant_id=${tenantId}`);

    return NextResponse.json({ isRegistered });
  } catch (error) {
    return NextResponse.json({ isRegistered: false });
  }
}
