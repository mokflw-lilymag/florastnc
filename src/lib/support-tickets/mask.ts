import type { SupportTicketListItem, SupportTicketRow } from "@/lib/support-tickets/types";

export function toListItem(
  row: SupportTicketRow & { tenants?: { name?: string } | null },
  viewerUserId: string,
  isAdmin: boolean,
): SupportTicketListItem {
  const isMine = row.author_user_id === viewerUserId;
  return {
    id: row.id,
    ticket_no: row.ticket_no,
    category: row.category,
    title: row.title,
    status: row.status,
    has_admin_reply: row.has_admin_reply,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_mine: isMine,
    can_open: isMine || isAdmin,
    store_name: isAdmin ? row.tenants?.name ?? null : undefined,
  };
}

export const STATUS_LABELS: Record<string, { ko: string; en: string; tone: string }> = {
  open: { ko: "접수중", en: "Open", tone: "bg-amber-100 text-amber-800" },
  answered: { ko: "답변완료", en: "Answered", tone: "bg-emerald-100 text-emerald-800" },
  closed: { ko: "종료", en: "Closed", tone: "bg-slate-100 text-slate-600" },
};
