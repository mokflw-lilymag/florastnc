import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isStaffRole } from "@/lib/staff-menu-permissions";

export interface StaffManagerContext {
  tenantId: string;
  userId: string;
}

export async function getStaffManagerContext(): Promise<
  StaffManagerContext | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Admin client not configured" }, { status: 500 });
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("tenant_id, org_work_tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }

  if (isStaffRole(profile.role) || profile.role === "guest") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = profile.org_work_tenant_id || profile.tenant_id;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
  }

  return { tenantId, userId: user.id };
}

export function isManagerContext(
  value: StaffManagerContext | NextResponse,
): value is StaffManagerContext {
  return "tenantId" in value;
}
