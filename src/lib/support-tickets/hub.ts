import type { SupabaseClient } from "@supabase/supabase-js";
import { categoryRequiresAssistCode } from "@/lib/support-tickets/assist-code";
import { isRemoteSettingsCategory } from "@/lib/support-tickets/remote-settings";

export type TenantHealth = {
  tenant_id: string;
  tenant_name: string;
  plan: string;
  status: string;
  subscription_end: string | null;
  is_expired: boolean;
  is_suspended: boolean;
  logo_url: string | null;
  users: Array<{ id: string; email: string; role: string }>;
  author_email: string | null;
  ui_locale: string | null;
  pp_bridge_enabled: boolean | null;
};

export type SupportTimelineItem = {
  id: string;
  action: string;
  actor_user_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export async function fetchTenantHealth(
  admin: SupabaseClient,
  tenantId: string,
  authorUserId: string,
): Promise<TenantHealth | null> {
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, plan, status, subscription_end, logo_url")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant) return null;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  const { data: author } = await admin
    .from("profiles")
    .select("email")
    .eq("id", authorUserId)
    .maybeSingle();

  const { data: settingsRow } = await admin
    .from("system_settings")
    .select("data")
    .eq("id", `settings_${tenantId}`)
    .maybeSingle();

  const settingsData = (settingsRow?.data ?? {}) as {
    uiLocale?: string;
    ppBridgeEnabled?: boolean;
  };

  const subEnd = tenant.subscription_end as string | null;
  const isExpired = !subEnd || new Date(subEnd) < new Date();

  return {
    tenant_id: tenant.id as string,
    tenant_name: tenant.name as string,
    plan: (tenant.plan as string) ?? "free",
    status: (tenant.status as string) ?? "active",
    subscription_end: subEnd,
    is_expired: isExpired,
    is_suspended: tenant.status === "suspended",
    logo_url: (tenant.logo_url as string) ?? null,
    users: (profiles ?? []).map((p) => ({
      id: p.id as string,
      email: p.email as string,
      role: (p.role as string) ?? "tenant_user",
    })),
    author_email: (author?.email as string) ?? null,
    ui_locale: settingsData.uiLocale ?? null,
    pp_bridge_enabled: settingsData.ppBridgeEnabled ?? null,
  };
}

export async function fetchSupportTimeline(
  admin: SupabaseClient,
  ticketId: string,
  limit = 30,
): Promise<SupportTimelineItem[]> {
  const { data } = await admin
    .from("support_ticket_audit")
    .select("id, action, actor_user_id, meta, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    action: row.action as string,
    actor_user_id: row.actor_user_id as string | null,
    meta: (row.meta as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
  }));
}

export function ticketQuickActions(category: string) {
  return {
    canOpenSettings: isRemoteSettingsCategory(category),
    canResetPassword: category === "login-help",
    canExtendSubscription: category === "subscription-help",
    requiresAssistCode: categoryRequiresAssistCode(category),
  };
}

export type RelatedSupportTicket = {
  id: string;
  ticket_no: string;
  title: string;
  status: string;
  category: string;
  created_at: string;
};

export async function fetchRelatedTickets(
  admin: SupabaseClient,
  tenantId: string,
  excludeTicketId: string,
  limit = 5,
): Promise<RelatedSupportTicket[]> {
  const { data } = await admin
    .from("support_tickets")
    .select("id, ticket_no, title, status, category, created_at")
    .eq("tenant_id", tenantId)
    .neq("id", excludeTicketId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    ticket_no: row.ticket_no as string,
    title: row.title as string,
    status: row.status as string,
    category: row.category as string,
    created_at: row.created_at as string,
  }));
}

export const TIMELINE_ACTION_LABELS: Record<string, string> = {
  created: "문의 접수",
  replied: "답변 등록",
  deleted: "삭제(휴지통)",
  restored: "복구",
  purged: "영구 삭제",
  remote_settings_unlocked: "환경설정 열기",
  remote_settings_unlock_failed: "환경설정 비밀번호 실패",
  password_reset: "비밀번호 초기화",
  subscription_extended: "구독 연장",
  magic_link_sent: "로그인 링크 발송",
  faq_created: "FAQ 등록",
  dashboard_opened: "매장 대시보드 열기",
};
