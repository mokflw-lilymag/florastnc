import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getStaffManagerContext,
  isManagerContext,
} from "@/lib/staff-api-context";
import { STAFF_LEAVE_SELECT } from "@/types/staff-salary";
import type { LeaveType } from "@/types/staff-salary";

export async function GET(req: Request) {
  const ctx = await getStaffManagerContext();
  if (!isManagerContext(ctx)) return ctx;

  const url = new URL(req.url);
  const staffId = url.searchParams.get("staffId");
  const status = url.searchParams.get("status");

  const admin = createAdminClient()!;
  let query = admin
    .from("staff_leave_requests")
    .select(STAFF_LEAVE_SELECT)
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  if (staffId) query = query.eq("staff_id", staffId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req: Request) {
  const ctx = await getStaffManagerContext();
  if (!isManagerContext(ctx)) return ctx;

  const body = await req.json();
  const { staffId, leaveType, startDate, endDate, reason, contact, autoApprove } = body;

  if (!staffId || !startDate || !endDate) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
  }

  const admin = createAdminClient()!;

  const { data: staff } = await admin
    .from("tenant_staff")
    .select("id")
    .eq("id", staffId)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const { data, error } = await admin
    .from("staff_leave_requests")
    .insert({
      tenant_id: ctx.tenantId,
      staff_id: staffId,
      leave_type: (leaveType as LeaveType) || "연차",
      start_date: startDate,
      end_date: endDate,
      reason: reason?.trim() || null,
      contact: contact?.trim() || null,
      status: autoApprove === false ? "pending" : "approved",
      approved_by: autoApprove === false ? null : ctx.userId,
      approved_at: autoApprove === false ? null : new Date().toISOString(),
    })
    .select(STAFF_LEAVE_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ request: data });
}
