import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { readOwnerPinCode } from "@/lib/owner-pin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetUserId, pin_code } = await req.json();
    if (!targetUserId || !pin_code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: "Admin client not configured" }, { status: 500 });
    }

    const { data: requestorProfile } = await supabase
      .from("profiles")
      .select("tenant_id, org_work_tenant_id")
      .eq("id", user.id)
      .single();

    if (!requestorProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = requestorProfile.org_work_tenant_id || requestorProfile.tenant_id;

    // First try to find in tenant_staff
    let targetProfile = null;
    const { data: staffData } = await adminClient
      .from("tenant_staff")
      .select("id, pin_code, role, name")
      .eq("id", targetUserId)
      .eq("tenant_id", tenantId)
      .single();

    if (staffData) {
      targetProfile = {
        ...staffData,
        full_name: staffData.name,
        email: ""
      };
    } else {
      // If not in staff, check if it's the owner themselves (in profiles)
      const { data: ownerData } = await adminClient
        .from("profiles")
        .select("id, pin_code, role, full_name, email, tenant_id")
        .eq("id", targetUserId)
        .single();
        
      if (ownerData && (ownerData.tenant_id === tenantId || ownerData.id === user.id)) {
        const ownerPin = await readOwnerPinCode(tenantId, ownerData.id);
        targetProfile = {
          ...ownerData,
          pin_code: ownerPin ?? ownerData.pin_code,
        };
      }
    }

    if (!targetProfile) {
      return NextResponse.json({ error: "User not found or not in your tenant" }, { status: 404 });
    }

    if (!targetProfile.pin_code) {
      // If it's the owner and they don't have a PIN, allow them to switch back without PIN?
      // Wait, let's just require a PIN. Or if it's the owner, allow if PIN matches or owner has no PIN?
      // Actually, if they haven't set a PIN, they can't switch. Let's return error.
      return NextResponse.json({ success: false, error: "해당 계정의 PIN 번호가 설정되지 않았습니다. 환경 설정 > 직원 관리에서 사장님 PIN을 먼저 설정해주세요." }, { status: 400 });
    }

    if (targetProfile.pin_code !== pin_code) {
      return NextResponse.json({ success: false, error: "PIN이 일치하지 않습니다." }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: targetProfile.id,
        role: targetProfile.role,
        full_name: targetProfile.full_name,
        email: targetProfile.email
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
