import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_MESSAGE_TEMPLATES } from "./default-message-templates";
import { ORDER_FOLLOWUP_TEMPLATES, type FollowupMessageContext } from "./order-followup-templates";
export type TemplateKey =
  | "anniversary_d7"
  | "order_followup_d1"
  | "order_followup_d7"
  | "order_followup_d30";

export type MessageTemplates = Partial<Record<TemplateKey, string>>;

const PLACEHOLDER_HELP: Record<TemplateKey, string[]> = {
  anniversary_d7: ["{{customerName}}", "{{label}}", "{{eventDate}}", "{{shopName}}", "{{orderLink}}"],
  order_followup_d1: ["{{customerName}}", "{{orderNumber}}", "{{shopName}}", "{{productSummary}}", "{{orderLink}}"],
  order_followup_d7: ["{{customerName}}", "{{orderNumber}}", "{{shopName}}", "{{productSummary}}", "{{orderLink}}"],
  order_followup_d30: ["{{customerName}}", "{{orderNumber}}", "{{shopName}}", "{{productSummary}}", "{{orderLink}}"],
};

export function getTemplatePlaceholderHelp(): Record<TemplateKey, string[]> {
  return PLACEHOLDER_HELP;
}

function interpolate(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export async function loadTenantMessageTemplates(
  db: SupabaseClient,
  tenantId: string
): Promise<MessageTemplates> {
  const { data } = await db
    .from("revenue_autopilot_settings")
    .select("message_templates")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const raw = data?.message_templates;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as MessageTemplates;
  }
  return {};
}

export function renderAnniversaryMessageWithTemplate(
  customTemplates: MessageTemplates,
  params: {
    customerName: string;
    label: string;
    eventDateYmd: string;
    shopName?: string;
    orderLink?: string;
  }
): string {
  const custom = customTemplates.anniversary_d7?.trim();
  const template = custom || DEFAULT_MESSAGE_TEMPLATES.anniversary_d7;
  return interpolate(template, {
    customerName: params.customerName,
    label: params.label,
    eventDate: params.eventDateYmd,
    shopName: params.shopName ?? "꽃집",
    orderLink: params.orderLink ?? "",
  });
}

export function renderFollowupMessageWithTemplate(
  step: "order_followup_d1" | "order_followup_d7" | "order_followup_d30",
  customTemplates: MessageTemplates,
  ctx: FollowupMessageContext
): string {
  const custom = customTemplates[step]?.trim();
  const template = custom || DEFAULT_MESSAGE_TEMPLATES[step];
  if (template) {
    return interpolate(template, {
      customerName: ctx.customerName,
      orderNumber: ctx.orderNumber,
      shopName: ctx.shopName ?? "꽃집",
      productSummary: ctx.productSummary ?? "",
      orderLink: ctx.orderLink ?? "",
    });
  }
  return ORDER_FOLLOWUP_TEMPLATES[step].render(ctx);
}
