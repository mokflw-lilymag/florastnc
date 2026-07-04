export const EMAIL_TEMPLATE_CATEGORIES = [
  { id: "contract", labelKo: "계약·동의", labelEn: "Contracts" },
  { id: "extension", labelKo: "구독·연장", labelEn: "Subscription" },
  { id: "hardware", labelKo: "포스·임대 장비", labelEn: "Hardware lease" },
  { id: "marketing", labelKo: "마케팅·안내", labelEn: "Marketing" },
  { id: "onboarding", labelKo: "온보딩·가입", labelEn: "Onboarding" },
  { id: "billing", labelKo: "결제·청구", labelEn: "Billing" },
  { id: "support", labelKo: "고객 지원", labelEn: "Support" },
  { id: "operations", labelKo: "운영·점검", labelEn: "Operations" },
] as const;

export type EmailTemplateCategory = (typeof EMAIL_TEMPLATE_CATEGORIES)[number]["id"];

export type PlatformEmailTemplate = {
  slug: string;
  category: EmailTemplateCategory;
  name_ko: string;
  name_en: string | null;
  description: string | null;
  subject: string;
  body_html: string;
  variables: string[];
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  updated_by?: string | null;
};

export type EmailSendLogRow = {
  id: string;
  created_at: string;
  template_slug: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: "sent" | "simulated" | "failed";
  error_message: string | null;
  metadata: Record<string, unknown>;
};

export type BetaApplicationRow = {
  id: string;
  created_at: string;
  full_name: string;
  business_name: string;
  contact: string;
  email: string;
  apply_reason: string;
  feature_notes: string | null;
  selection_status: string;
  printer_loan_interest: boolean;
  admin_notes: string | null;
};
