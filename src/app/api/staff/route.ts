import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import type { TenantStaffHrInput } from "@/types/tenant-staff";

async function getCallerTenantId(userId: string): Promise<string | null> {
  const adminClient = createAdminClient();
  if (!adminClient) return null;

  const { data } = await adminClient
    .from("profiles")
    .select("tenant_id, org_work_tenant_id")
    .eq("id", userId)
    .single();

  if (!data) return null;
  return data.org_work_tenant_id || data.tenant_id || null;
}

function buildHrPayload(body: TenantStaffHrInput) {
  const payload: Record<string, string | null> = {};
  const fields = [
    "phone",
    "email",
    "address",
    "birth_date",
    "hire_date",
    "position",
    "memo",
    "emergency_contact",
    "emergency_phone",
  ] as const;

  for (const field of fields) {
    if (body[field] !== undefined) {
      payload[field] = body[field]?.trim() ? body[field]!.trim() : null;
    }
  }

  if (body.name !== undefined) payload.name = body.name.trim();
  return payload;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await getCallerTenantId(user.id);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant assigned to this account" }, { status: 403 });
    }

    const body = (await req.json()) as TenantStaffHrInput & { name: string; pin_code: string };
    if (!body.name || !body.pin_code || body.pin_code.length !== 4) {
      return NextResponse.json({ error: "이름과 4자리 PIN 번호를 입력해주세요." }, { status: 400 });
    }

    const adminClient = createAdminClient()!;
    const { data, error } = await adminClient
      .from("tenant_staff")
      .insert({
        tenant_id: tenantId,
        name: body.name.trim(),
        pin_code: body.pin_code,
        role: "tenant_staff",
        ...buildHrPayload(body),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await getCallerTenantId(user.id);
    if (!tenantId) return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });

    const body = (await req.json()) as TenantStaffHrInput & {
      targetUserId: string;
      newPin?: string;
    };

    if (!body.targetUserId) {
      return NextResponse.json({ error: "Missing staff ID" }, { status: 400 });
    }

    const adminClient = createAdminClient()!;
    const { data: targetStaff } = await adminClient
      .from("tenant_staff")
      .select("tenant_id")
      .eq("id", body.targetUserId)
      .single();

    if (!targetStaff || targetStaff.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Cannot modify user from different tenant" }, { status: 403 });
    }

    const updatePayload: Record<string, string | null> = {
      ...buildHrPayload(body),
      updated_at: new Date().toISOString(),
    };

    if (body.newPin) {
      if (body.newPin.length !== 4) {
        return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
      }
      updatePayload.pin_code = body.newPin;
    }

    const { error: updateError } = await adminClient
      .from("tenant_staff")
      .update(updatePayload)
      .eq("id", body.targetUserId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await getCallerTenantId(user.id);
    if (!tenantId) return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });

    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("id");
    if (!targetUserId) {
      return NextResponse.json({ error: "Missing staff ID" }, { status: 400 });
    }

    const adminClient = createAdminClient()!;
    const { data: targetStaff } = await adminClient
      .from("tenant_staff")
      .select("tenant_id")
      .eq("id", targetUserId)
      .single();

    if (!targetStaff || targetStaff.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Cannot delete user from different tenant" }, { status: 403 });
    }

    const { error: deleteError } = await adminClient
      .from("tenant_staff")
      .delete()
      .eq("id", targetUserId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
