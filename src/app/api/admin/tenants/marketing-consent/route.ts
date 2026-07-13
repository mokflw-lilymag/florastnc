import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { requireSuperAdmin } from "@/lib/support-tickets/db";

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const adminGate = requireSuperAdmin(gate);
  if (!adminGate.ok) return adminGate.response;

  try {
    const { userId, marketingAgreed } = await req.json();

    if (!userId || typeof marketingAgreed !== "boolean") {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { data: user, error: userError } = await adminGate.admin.auth.admin.getUserById(userId);
    if (userError || !user?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentMetadata = user.user.user_metadata || {};
    const updatedMetadata = { ...currentMetadata, marketing_agreed: marketingAgreed };

    const { error: updateError } = await adminGate.admin.auth.admin.updateUserById(userId, {
      user_metadata: updatedMetadata,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
