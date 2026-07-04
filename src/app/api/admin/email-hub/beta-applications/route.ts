import { NextResponse } from "next/server";
import { requireEmailHubAdmin } from "@/lib/admin/email-hub/guard";

export async function GET(req: Request) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const limit = Math.min(parseInt(sp.get("limit") || "100", 10) || 100, 500);

  let q = auth.admin
    .from("test_user_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    q = q.eq("selection_status", status);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
}

export async function PATCH(req: Request) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  let body: {
    id?: string;
    selection_status?: string;
    printer_loan_interest?: boolean;
    admin_notes?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.selection_status !== undefined) patch.selection_status = body.selection_status;
  if (body.printer_loan_interest !== undefined) patch.printer_loan_interest = body.printer_loan_interest;
  if (body.admin_notes !== undefined) patch.admin_notes = body.admin_notes;

  const { data, error } = await auth.admin
    .from("test_user_applications")
    .update(patch)
    .eq("id", body.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ application: data });
}
