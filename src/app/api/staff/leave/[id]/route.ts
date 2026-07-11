import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getStaffManagerContext,
  isManagerContext,
} from "@/lib/staff-api-context";
import { STAFF_LEAVE_SELECT } from "@/types/staff-salary";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getStaffManagerContext();
  if (!isManagerContext(ctx)) return ctx;

  const { id } = await params;
  const body = await req.json();
  const { status, rejectReason } = body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = createAdminClient()!;
  const { data, error } = await admin
    .from("staff_leave_requests")
    .update({
      status,
      approved_by: ctx.userId,
      approved_at: new Date().toISOString(),
      reject_reason: status === "rejected" ? rejectReason?.trim() || null : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .select(STAFF_LEAVE_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ request: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getStaffManagerContext();
  if (!isManagerContext(ctx)) return ctx;

  const { id } = await params;
  const admin = createAdminClient()!;

  const { error } = await admin
    .from("staff_leave_requests")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
