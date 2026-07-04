import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingDbTableError } from "@/lib/admin/email-hub/db-errors";
import { replaceTemplateVariables } from "@/lib/email-service";
import { getPlatformEmailTemplate } from "@/lib/admin/email-hub/template-store";
import { resolveSmtpForHq, sendMailViaSmtp } from "@/lib/email/smtp-server";

export type SendPlatformEmailResult = {
  ok: boolean;
  status: "sent" | "simulated" | "failed";
  error?: string;
  smtpConfigured: boolean;
};

export async function sendPlatformEmail(
  db: SupabaseClient,
  params: {
    templateSlug: string;
    to: string;
    recipientName?: string;
    variables?: Record<string, string>;
    subjectOverride?: string;
    bodyOverride?: string;
    sentBy?: string;
    tenantId?: string;
  },
): Promise<SendPlatformEmailResult> {
  const template = await getPlatformEmailTemplate(db, params.templateSlug);
  if (!template) {
    return { ok: false, status: "failed", error: "TEMPLATE_NOT_FOUND", smtpConfigured: false };
  }

  const vars: Record<string, string> = {
    이름: params.recipientName || "사장님",
    이메일: params.to,
    ...params.variables,
  };

  const subject = replaceTemplateVariables(params.subjectOverride || template.subject, vars);
  const html = replaceTemplateVariables(params.bodyOverride || template.body_html, vars);
  const smtp = await resolveSmtpForHq(db);

  let status: "sent" | "simulated" | "failed" = "failed";
  let errorMessage: string | undefined;

  try {
    if (!smtp) {
      status = "simulated";
    } else {
      await sendMailViaSmtp(smtp, { to: params.to, subject, html });
      status = "sent";
    }
  } catch (err: unknown) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : "send_failed";
  }

  try {
    const { error: logErr } = await db.from("platform_email_send_log").insert({
      template_slug: params.templateSlug,
      recipient_email: params.to,
      recipient_name: params.recipientName ?? null,
      subject,
      status,
      error_message: errorMessage ?? null,
      sent_by: params.sentBy ?? null,
      tenant_id: params.tenantId ?? null,
      metadata: { variables: vars, source: "platform_send" },
    });
    if (logErr && !isMissingDbTableError(logErr, "platform_email_send_log")) {
      console.error("[send-platform-email] log insert failed", logErr);
    }
  } catch (logErr) {
    console.error("[send-platform-email] log insert failed", logErr);
  }

  return {
    ok: status !== "failed",
    status,
    error: errorMessage,
    smtpConfigured: !!smtp,
  };
}
