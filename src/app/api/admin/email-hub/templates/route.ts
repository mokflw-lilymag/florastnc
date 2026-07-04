import { NextResponse } from "next/server";
import { requireEmailHubAdmin } from "@/lib/admin/email-hub/guard";
import { listPlatformEmailTemplates, EMAIL_HUB_SCHEMA_HINT } from "@/lib/admin/email-hub/template-store";

export async function GET(req: Request) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { templates, schemaReady } = await listPlatformEmailTemplates(auth.admin);
    return NextResponse.json({
      templates,
      schemaReady,
      ...(schemaReady ? {} : { warning: EMAIL_HUB_SCHEMA_HINT }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email-hub/templates]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
