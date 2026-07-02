export type PlatformAnnouncementCategory = "update" | "maintenance" | "notice" | "important";
export type PlatformAnnouncementPriority = "normal" | "high";
export type PlatformAnnouncementStatus = "draft" | "published";

export type PlatformAnnouncement = {
  id: string;
  title: string;
  body: string;
  category: PlatformAnnouncementCategory;
  priority: PlatformAnnouncementPriority;
  status: PlatformAnnouncementStatus;
  published_at: string | null;
  expires_at: string | null;
  send_email: boolean;
  email_sent_at: string | null;
  email_recipient_count: number;
  target_countries: string[] | null;
  target_plans: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  read_at?: string | null;
};

export type NotificationInboxItem = {
  id: string;
  source: "platform" | "hq";
  title: string;
  body: string;
  category?: PlatformAnnouncementCategory;
  priority: string;
  created_at: string;
  read_at: string | null;
  organization_name?: string | null;
  href: string;
};

export const PLATFORM_CATEGORY_LABELS: Record<PlatformAnnouncementCategory, string> = {
  update: "업데이트",
  maintenance: "점검",
  notice: "안내",
  important: "중요",
};

export const PLATFORM_PRIORITY_LABELS: Record<PlatformAnnouncementPriority, string> = {
  normal: "일반",
  high: "중요",
};

export const PLATFORM_STATUS_LABELS: Record<PlatformAnnouncementStatus, string> = {
  draft: "임시 저장",
  published: "즉시 게시",
};

/** Base UI Select는 value(영문 키)를 그대로 보여주므로, 트리거에는 반드시 한국어 라벨을 넣습니다. */
export function platformSelectLabel(
  field: "category" | "priority" | "status",
  value: string,
): string {
  if (field === "category") return PLATFORM_CATEGORY_LABELS[value as PlatformAnnouncementCategory] ?? value;
  if (field === "priority") return PLATFORM_PRIORITY_LABELS[value as PlatformAnnouncementPriority] ?? value;
  return PLATFORM_STATUS_LABELS[value as PlatformAnnouncementStatus] ?? value;
}
