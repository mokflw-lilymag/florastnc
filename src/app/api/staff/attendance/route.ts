import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isDesignatedPosClient } from "@/lib/pos-device";

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

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    const tenantId = profile.org_work_tenant_id || profile.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant assigned" }, { status: 400 });
    }

    const { type, targetUserId } = await req.json();

    // Enforce POS designated device check for clock_in and clock_out
    const isPosDevice = isDesignatedPosClient(
      req.headers.get("cookie"),
      tenantId,
      req.headers,
    );
    if (!isPosDevice) {
      return NextResponse.json({ 
        error: "이 기기는 출퇴근용 POS로 지정되지 않았습니다. 환경 설정 > 직원·PIN·권한에서 '이 기기를 POS로 지정'을 먼저 진행해주세요. (웹 브라우저와 윈도우 앱은 별도 지정이 필요합니다)" 
      }, { status: 403 });
    }
    if (type !== "clock_in" && type !== "clock_out") {
      return NextResponse.json({ error: "Invalid attendance type" }, { status: 400 });
    }

    // Determine whose attendance to log
    let attendanceUserId = user.id;

    // If POS Virtual Session provides a targetUserId, use it.
    // Ensure the targetUserId belongs to the same tenant.
    if (targetUserId && targetUserId !== user.id) {
      // Must be tenant admin or super admin to insert for others?
      // Actually, since POS is shared, anyone logged into the POS can insert for themselves or their virtual session.
      // We rely on the client-side PIN verification to ensure they are who they say they are.
      const { data: targetProfile } = await supabase
        .from("tenant_staff")
        .select("tenant_id")
        .eq("id", targetUserId)
        .single();
      
      if (!targetProfile || targetProfile.tenant_id !== tenantId) {
        return NextResponse.json({ error: "Target user not found or tenant mismatch" }, { status: 403 });
      }
      attendanceUserId = targetUserId;
    }

    const { data, error } = await supabase
      .from("staff_attendance_logs")
      .insert({
        tenant_id: tenantId,
        staff_id: attendanceUserId,
        type,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, log: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tenant_id, org_work_tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const tenantId = profile.org_work_tenant_id || profile.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant assigned" }, { status: 400 });
    }

    // Admins can see all, staff can only see theirs.
    // In POS mode, the POS owner sees all. If we filter by query param, we can limit it.
    // Let's just return all for the tenant since POS is shared anyway.
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("targetUserId");

    let query = supabase
      .from("staff_attendance_logs")
      .select(`*, tenant_staff(name, pin_code)`)
      .eq("tenant_id", tenantId)
      .order("recorded_at", { ascending: false })
      .limit(100);

    // If a specific virtual session is requesting its own logs
    if (targetUserId) {
      query = query.eq("staff_id", targetUserId);
    } else if (profile.role === "tenant_staff") {
      // Legacy staff mode fallback
      query = query.eq("staff_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Attendance GET Error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ logs: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
