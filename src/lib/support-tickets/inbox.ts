import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import type { NotificationInboxItem } from "@/lib/platform-announcements/types";
import { isSuperAdminProfile } from "@/lib/support-tickets/access";

export async function fetchSupportNotificationItems(
  _supabase: SupabaseClient,
  userId: string,
  email: string | undefined,
  profile: { role?: string } | null,
  limit = 15,
): Promise<NotificationInboxItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const items: NotificationInboxItem[] = [];
  const isAdmin = isSuperAdminProfile(profile, email);

  if (isAdmin) {
    const { data: rows } = await admin
      .from("support_tickets")
      .select("id, ticket_no, title, status, created_at, admin_read_at, tenants(name)")
      .is("deleted_at", null)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(limit);

    for (const row of rows ?? []) {
      const read = row.admin_read_at != null;
      items.push({
        id: row.id as string,
        source: "support_ticket",
        title: `새 문의: ${row.title as string}`,
        body: `${row.ticket_no as string} · ${(row.tenants as { name?: string })?.name ?? "매장"}`,
        priority: "high",
        created_at: row.created_at as string,
        read_at: read ? (row.admin_read_at as string) : null,
        href: `/dashboard/admin/support/${row.id}`,
      });
    }
  } else {
    const { data: rows } = await admin
      .from("support_tickets")
      .select("id, ticket_no, title, has_admin_reply, author_reply_read_at, last_reply_at, updated_at")
      .eq("author_user_id", userId)
      .is("deleted_at", null)
      .eq("has_admin_reply", true)
      .is("author_reply_read_at", null)
      .order("last_reply_at", { ascending: false })
      .limit(limit);

    for (const row of rows ?? []) {
      items.push({
        id: row.id as string,
        source: "support_reply",
        title: "문의에 답변이 등록되었습니다",
        body: `${row.ticket_no as string}: ${row.title as string}`,
        priority: "normal",
        created_at: (row.last_reply_at as string) ?? (row.updated_at as string),
        read_at: null,
        href: `/dashboard/support/${row.id}`,
      });
    }
  }

  return items;
}
