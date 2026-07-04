export type SupportTicketStatus = "open" | "answered" | "closed";

export type SupportAttachmentMeta = {
  path: string;
  size: number;
  mime: string;
  width?: number;
  height?: number;
};

export type SupportTicketRow = {
  id: string;
  ticket_no: string;
  tenant_id: string;
  author_user_id: string;
  category: string;
  title: string;
  body: string;
  body_locale: string;
  status: SupportTicketStatus;
  is_private: boolean;
  has_admin_reply: boolean;
  attachment_paths: SupportAttachmentMeta[];
  admin_read_at: string | null;
  author_reply_read_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  last_reply_at: string | null;
  remote_assist_code_hash?: string | null;
  remote_assist_consent_at?: string | null;
};

export type SupportTicketReplyRow = {
  id: string;
  ticket_id: string;
  author_user_id: string;
  author_role: "user" | "admin";
  body_original: string;
  body_translated: string | null;
  original_locale: string | null;
  target_locale: string | null;
  attachment_paths: SupportAttachmentMeta[];
  is_internal_note: boolean;
  created_at: string;
};

export type SupportTicketListItem = {
  id: string;
  ticket_no: string;
  category: string;
  title: string;
  status: SupportTicketStatus;
  has_admin_reply: boolean;
  created_at: string;
  updated_at: string;
  is_mine: boolean;
  can_open: boolean;
  store_name?: string | null;
  is_remote_settings?: boolean;
  has_remote_assist_code?: boolean;
};
