import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";

// GET /api/admin/printers/devices/logs?device_id=xxx
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const deviceId = new URL(req.url).searchParams.get("device_id");
  if (!deviceId) return NextResponse.json({ logs: [] });

  try {
    // printer_device_logs 테이블이 없으면 빈 배열 반환
    const { data, error } = await admin
      .from("printer_device_logs")
      .select("*, tenants(name)")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false });

    if (error) {
      // 테이블이 없으면 조용히 빈 배열
      console.warn("printer_device_logs not found:", error.message);
      return NextResponse.json({ logs: [] });
    }

    const logs = (data || []).map((row: any) => ({
      ...row,
      tenant_name: row.tenants?.name || null,
    }));

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error("GET /api/admin/printers/devices/logs error:", err);
    return NextResponse.json({ logs: [] });
  }
}
