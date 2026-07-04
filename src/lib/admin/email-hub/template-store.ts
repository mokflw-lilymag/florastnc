import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PLATFORM_EMAIL_TEMPLATES } from "./default-templates";
import { isMissingDbTableError } from "./db-errors";
import type { PlatformEmailTemplate } from "./types";

export const EMAIL_HUB_SCHEMA_HINT =
  "supabase/platform_email_hub_schema.sql 을 Supabase SQL Editor에서 실행하세요.";

function memoryFallbackTemplates(): PlatformEmailTemplate[] {
  const now = new Date().toISOString();
  return DEFAULT_PLATFORM_EMAIL_TEMPLATES.map((t) => ({
    ...t,
    created_at: now,
    updated_at: now,
    updated_by: null,
  }));
}

export async function isEmailHubSchemaReady(db: SupabaseClient): Promise<boolean> {
  const { error } = await db
    .from("platform_email_templates")
    .select("slug", { count: "exact", head: true });

  if (error) {
    if (isMissingDbTableError(error, "platform_email_templates")) return false;
    throw error;
  }
  return true;
}

export async function ensurePlatformEmailTemplatesSeeded(db: SupabaseClient): Promise<boolean> {
  const ready = await isEmailHubSchemaReady(db);
  if (!ready) return false;

  const { count, error: countErr } = await db
    .from("platform_email_templates")
    .select("slug", { count: "exact", head: true });

  if (countErr) throw countErr;
  if ((count ?? 0) > 0) return true;

  const rows = DEFAULT_PLATFORM_EMAIL_TEMPLATES.map((t) => ({
    ...t,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db.from("platform_email_templates").insert(rows);
  if (error) throw error;
  return true;
}

export async function listPlatformEmailTemplates(
  db: SupabaseClient,
): Promise<{ templates: PlatformEmailTemplate[]; schemaReady: boolean }> {
  const ready = await ensurePlatformEmailTemplatesSeeded(db);
  if (!ready) {
    return { templates: memoryFallbackTemplates(), schemaReady: false };
  }

  const { data, error } = await db
    .from("platform_email_templates")
    .select("*")
    .order("category")
    .order("sort_order");

  if (error) throw error;
  return { templates: (data ?? []) as PlatformEmailTemplate[], schemaReady: true };
}

export async function getPlatformEmailTemplate(
  db: SupabaseClient,
  slug: string,
): Promise<PlatformEmailTemplate | null> {
  const ready = await ensurePlatformEmailTemplatesSeeded(db);
  if (!ready) {
    const found = DEFAULT_PLATFORM_EMAIL_TEMPLATES.find((t) => t.slug === slug);
    if (!found) return null;
    const now = new Date().toISOString();
    return { ...found, created_at: now, updated_at: now, updated_by: null };
  }

  const { data, error } = await db
    .from("platform_email_templates")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return (data as PlatformEmailTemplate) ?? null;
}
