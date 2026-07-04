import { NextResponse } from "next/server";
import { requireEmailHubAdmin } from "@/lib/admin/email-hub/guard";
import { getPlatformEmailTemplate, EMAIL_HUB_SCHEMA_HINT, isEmailHubSchemaReady } from "@/lib/admin/email-hub/template-store";
import { isMissingDbTableError } from "@/lib/admin/email-hub/db-errors";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  const { slug } = await ctx.params;

  try {
    const template = await getPlatformEmailTemplate(auth.admin, slug);
    if (!template) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  const { slug } = await ctx.params;

  let body: {
    subject?: string;
    body_html?: string;
    name_ko?: string;
    name_en?: string | null;
    description?: string | null;
    variables?: string[];
    is_active?: boolean;
    sort_order?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: auth.userId,
  };

  if (body.subject !== undefined) patch.subject = body.subject;
  if (body.body_html !== undefined) patch.body_html = body.body_html;
  if (body.name_ko !== undefined) patch.name_ko = body.name_ko;
  if (body.name_en !== undefined) patch.name_en = body.name_en;
  if (body.description !== undefined) patch.description = body.description;
  if (body.variables !== undefined) patch.variables = body.variables;
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  if (body.sort_order !== undefined) patch.sort_order = body.sort_order;

  if (!(await isEmailHubSchemaReady(auth.admin))) {
    return NextResponse.json({ error: EMAIL_HUB_SCHEMA_HINT }, { status: 503 });
  }

  const { data, error } = await auth.admin
    .from("platform_email_templates")
    .update(patch)
    .eq("slug", slug)
    .select("*")
    .maybeSingle();

  if (error) {
    if (isMissingDbTableError(error, "platform_email_templates")) {
      return NextResponse.json({ error: EMAIL_HUB_SCHEMA_HINT }, { status: 503 });
    }
    console.error("[email-hub/templates PUT]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ template: data });
}
