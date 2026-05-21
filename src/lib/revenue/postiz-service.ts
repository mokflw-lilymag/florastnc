import type { SupabaseClient } from "@supabase/supabase-js";
import { REVENUE_INTEGRATIONS_KEY } from "@/lib/revenue/types";
import { resolvePostizConfig, listPostizIntegrations, findInstagramIntegration } from "@/trigger/lib/postiz-client";

export interface TenantPostizRow {
  tenant_id: string;
  postiz_integration_id: string | null;
  instagram_connected: boolean;
  channel_ids: string[];
  connected_at: string | null;
}

export async function loadPlatformPostizConfig(db: SupabaseClient) {
  const { data } = await db.from("platform_config").select("value").eq("key", REVENUE_INTEGRATIONS_KEY).maybeSingle();
  const val = data?.value as { postiz_api_url?: string; postiz_api_key?: string } | undefined;
  return resolvePostizConfig({
    apiUrl: val?.postiz_api_url,
    apiKey: val?.postiz_api_key ?? process.env.POSTIZ_API_KEY,
  });
}

export async function getTenantPostizIntegration(
  db: SupabaseClient,
  tenantId: string
): Promise<TenantPostizRow | null> {
  const { data, error } = await db
    .from("tenant_postiz_integrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error && !error.message.includes("does not exist")) throw error;
  if (!data) return null;
  return {
    tenant_id: data.tenant_id as string,
    postiz_integration_id: data.postiz_integration_id as string | null,
    instagram_connected: Boolean(data.instagram_connected),
    channel_ids: (data.channel_ids as string[]) ?? [],
    connected_at: data.connected_at as string | null,
  };
}

/** Postiz API에서 인스타 integration 탐색 후 tenant에 저장 */
export async function syncTenantInstagramFromPostiz(db: SupabaseClient, tenantId: string) {
  const config = await loadPlatformPostizConfig(db);
  if (!config) return { synced: false, reason: "postiz_not_configured" };

  const integrations = await listPostizIntegrations(config);
  const ig = findInstagramIntegration(integrations);
  if (!ig?.id) return { synced: false, reason: "instagram_not_found_in_postiz" };

  const row = {
    tenant_id: tenantId,
    postiz_integration_id: ig.id,
    instagram_connected: true,
    channel_ids: integrations.map((i) => i.id),
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from("tenant_postiz_integrations").upsert(row, { onConflict: "tenant_id" });
  if (error) throw error;

  return { synced: true, integrationId: ig.id, integrationName: ig.name };
}

export async function listTenantsForSnsAutopilot(db: SupabaseClient) {
  const { data: settings, error } = await db
    .from("revenue_autopilot_settings")
    .select("tenant_id, sns_autopilot, sns_requires_approval")
    .eq("sns_autopilot", true);
  if (error) throw error;
  if (!settings?.length) return [];

  const tenantIds = settings.map((s) => s.tenant_id as string);
  const { data: integrations } = await db
    .from("tenant_postiz_integrations")
    .select("tenant_id, postiz_integration_id, instagram_connected")
    .in("tenant_id", tenantIds)
    .eq("instagram_connected", true);

  const igMap = new Map(
    (integrations ?? []).map((i) => [i.tenant_id as string, i.postiz_integration_id as string])
  );

  return settings
    .filter((s) => igMap.has(s.tenant_id as string))
    .map((s) => ({
      tenantId: s.tenant_id as string,
      integrationId: igMap.get(s.tenant_id as string)!,
      requiresApproval: s.sns_requires_approval !== false,
    }));
}
