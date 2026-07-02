import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationInboxItem } from "@/lib/platform-announcements/types";
import { announcementMatchesTenant } from "@/lib/platform-announcements/targeting";

async function resolveUserTenant(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ country?: string | null; plan?: string | null } | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, org_work_tenant_id")
    .eq("id", userId)
    .maybeSingle();

  const tenantId = profile?.org_work_tenant_id ?? profile?.tenant_id;
  if (!tenantId) return null;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("country, plan")
    .eq("id", tenantId)
    .maybeSingle();

  return tenant ?? null;
}

async function resolveOrganizationIdsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const ids = new Set<string>();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);
  for (const m of memberships ?? []) ids.add(m.organization_id as string);

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("organization_id")
      .eq("id", profile.tenant_id)
      .maybeSingle();
    if (tenant?.organization_id) ids.add(tenant.organization_id as string);
  }

  return [...ids];
}

export async function fetchNotificationInbox(
  supabase: SupabaseClient,
  userId: string,
  limit = 30,
): Promise<NotificationInboxItem[]> {
  const now = new Date().toISOString();
  const items: NotificationInboxItem[] = [];

  const tenant = await resolveUserTenant(supabase, userId);

  const { data: platformRows } = await supabase
    .from("platform_announcements")
    .select("id, title, body, category, priority, published_at, created_at, target_countries, target_plans")
    .eq("status", "published")
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("published_at", { ascending: false })
    .limit(limit * 2);

  const filteredPlatform = (platformRows ?? []).filter((row) =>
    announcementMatchesTenant(row, tenant),
  );

  const platformIds = filteredPlatform.map((r) => r.id as string);
  const platformReadMap = new Map<string, string>();

  if (platformIds.length > 0) {
    const { data: reads } = await supabase
      .from("platform_announcement_reads")
      .select("announcement_id, read_at")
      .eq("user_id", userId)
      .in("announcement_id", platformIds);
    for (const r of reads ?? []) {
      if (r.announcement_id && r.read_at) {
        platformReadMap.set(r.announcement_id as string, r.read_at as string);
      }
    }
  }

  for (const row of filteredPlatform) {
    const id = row.id as string;
    items.push({
      id,
      source: "platform",
      title: row.title as string,
      body: row.body as string,
      category: row.category as NotificationInboxItem["category"],
      priority: (row.priority as string) ?? "normal",
      created_at: (row.published_at as string) ?? (row.created_at as string),
      read_at: platformReadMap.get(id) ?? null,
      href: `/dashboard/notifications?platform=${id}`,
    });
  }

  const orgIds = await resolveOrganizationIdsForUser(supabase, userId);
  if (orgIds.length > 0) {
    const { data: hqRows } = await supabase
      .from("organization_announcements")
      .select("id, organization_id, title, body, priority, created_at, expires_at")
      .in("organization_id", orgIds)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(limit);

    const hqIds = (hqRows ?? []).map((r) => r.id as string);
    const hqReadMap = new Map<string, string>();

    if (hqIds.length > 0) {
      const { data: hqReads } = await supabase
        .from("organization_announcement_reads")
        .select("announcement_id, read_at")
        .eq("user_id", userId)
        .in("announcement_id", hqIds);
      for (const r of hqReads ?? []) {
        if (r.announcement_id && r.read_at) {
          hqReadMap.set(r.announcement_id as string, r.read_at as string);
        }
      }
    }

    const { data: orgRows } = await supabase.from("organizations").select("id,name").in("id", orgIds);
    const orgNameById = Object.fromEntries((orgRows ?? []).map((o) => [o.id, o.name]));

    for (const row of hqRows ?? []) {
      const id = row.id as string;
      items.push({
        id,
        source: "hq",
        title: row.title as string,
        body: row.body as string,
        priority: (row.priority as string) ?? "normal",
        created_at: row.created_at as string,
        read_at: hqReadMap.get(id) ?? null,
        organization_name: orgNameById[row.organization_id as string] ?? null,
        href: "/dashboard/org-board",
      });
    }
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return items.slice(0, limit);
}

export function countUnreadNotifications(items: NotificationInboxItem[]): number {
  return items.filter((i) => !i.read_at).length;
}
