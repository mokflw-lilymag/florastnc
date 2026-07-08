import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: Request) {
  // 1. Authenticate user
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured (admin client failed)" }, { status: 503 });
  }

  // 2. Extract payload
  const body = await req.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const role_key = body?.role_key;

  if (!email || !role_key) {
    return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
  }

  // 3. Find the current user's tenant_id (HQ)
  const { data: currentUserProfile, error: profileErr } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", gate.userId)
    .single();

  if (profileErr || !currentUserProfile?.tenant_id) {
    return NextResponse.json({ error: "Could not find your organization." }, { status: 404 });
  }

  const tenantId = currentUserProfile.tenant_id;

  // 4. Check if the user already exists
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, tenant_id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    if (existingProfile.tenant_id === tenantId) {
      return NextResponse.json({ error: "This user is already part of your organization." }, { status: 400 });
    } else if (existingProfile.tenant_id) {
      return NextResponse.json({ error: "This user belongs to another organization." }, { status: 400 });
    }
  }

  // 5. Send Invite using Supabase Admin Auth
  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      tenant_id: tenantId,
      role: role_key
    }
  });

  if (inviteErr) {
    console.error("[staff-invite] error:", inviteErr);
    // If the user already exists in auth, inviteUserByEmail might return an error like "User already registered"
    return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  }

  // If the user existed in auth but had no tenant_id, we might need to manually link them.
  // We'll update the profile if it was created/exists without a tenant.
  if (inviteData?.user?.id) {
    await admin.from("profiles").update({
      tenant_id: tenantId,
      role: role_key
    }).eq("id", inviteData.user.id);
  }
  
  return NextResponse.json({ ok: true, user: inviteData.user });
}
