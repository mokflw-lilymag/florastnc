import { task, logger } from "@trigger.dev/sdk/v3";
import { createTriggerSupabaseAdmin } from "./lib/supabase-admin";
import { formatMarketingMessage } from "../../src/lib/marketing-helper";
import { resolveSmtpFromSettings } from "../../src/lib/email/smtp-server";
import { createTransport } from "nodemailer";
import { resolveEmailShopName } from "../../src/lib/email/resolve-shop-name";

export const marketingBulkEmail = task({
  id: "marketing-bulk-email",
  run: async (payload: { tenantId: string; templateType: 'firstPurchase' | 'd7' | 'dayOf' | 'custom_ad'; templateId?: string; triggeredBy: string }) => {
    logger.info("marketing-bulk-email started", payload);

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error("Supabase env missing");
      return { success: false, reason: "env_missing" };
    }

    const db = createTriggerSupabaseAdmin();
    const { tenantId, templateType, templateId } = payload;

    // 1. Fetch Tenant Settings
    const { data: tenantData } = await db
      .from("tenants")
      .select("name, settings, logo_url")
      .eq("id", tenantId)
      .single();

    if (!tenantData) {
      logger.error("Tenant not found", { tenantId });
      return { success: false, reason: "tenant_not_found" };
    }

    const settings = tenantData.settings as Record<string, any>;
    let subjectTpl = "";
    let contentTpl = "";

    if (templateType === 'firstPurchase') {
      subjectTpl = settings.marketingEmailSubjectFirstPurchase;
      contentTpl = settings.marketingEmailContentFirstPurchase;
    } else if (templateType === 'd7') {
      subjectTpl = settings.marketingEmailSubjectDaysBefore7;
      contentTpl = settings.marketingEmailContentDaysBefore7;
    } else if (templateType === 'dayOf') {
      subjectTpl = settings.marketingEmailSubjectDayOf;
      contentTpl = settings.marketingEmailContentDayOf;
    } else if (templateType === 'custom_ad' && templateId) {
      const adTemplates = settings.marketingAdTemplates || [];
      const template = adTemplates.find((t: any) => t.id === templateId);
      if (template) {
        subjectTpl = template.subject;
        contentTpl = template.content;
      }
    }

    if (!subjectTpl || !contentTpl) {
      logger.warn("Template missing for type", { templateType });
      return { success: false, reason: "template_missing" };
    }

    // 2. Fetch all customers with marketing_consent = true and valid email
    const { data: customers, error } = await db
      .from("customers")
      .select("id, name, email, points")
      .eq("tenant_id", tenantId)
      .eq("marketing_consent", true)
      .not("email", "is", null)
      .not("email", "eq", "")
      .eq("is_deleted", false);

    if (error || !customers || customers.length === 0) {
      logger.info("No target customers found for bulk email");
      return { success: true, count: 0 };
    }

    // 3. Setup SMTP connection
    const smtp = resolveSmtpFromSettings(settings, tenantData.name || 'FloXync');
    if (!smtp) {
      logger.error("SMTP not configured for tenant", { tenantId });
      return { success: false, reason: "smtp_not_configured" };
    }

    const transporter = createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.auth.user,
        pass: smtp.auth.pass,
      },
    });

    const shopName = resolveEmailShopName({ smtpSenderName: smtp.senderName, siteName: settings.siteName }, tenantData.name);
    let sentCount = 0;
    let failedCount = 0;

    // 4. Loop and send emails
    for (const customer of customers) {
      try {
        const data = {
          customerName: customer.name,
          customerPoint: customer.points || 0,
          branchName: shopName,
          anniversaryName: "기념일", // Fallback for bulk send
          shopLogoUrl: tenantData?.logo_url || undefined,
          pointRate: settings.pointRate,
          minPointUsage: settings.minPointUsage,
        };

        const subject = formatMarketingMessage(subjectTpl, data);
        const html = formatMarketingMessage(contentTpl, data);

        await transporter.sendMail({
          from: `"${shopName}" <${smtp.auth.user}>`,
          to: customer.email,
          subject,
          html,
        });

        sentCount++;
      } catch (err: any) {
        logger.error(`Failed to send email to ${customer.email}`, { error: err.message });
        failedCount++;
      }
    }

    logger.info("Bulk email completed", { sent: sentCount, failed: failedCount });
    return { success: true, sent: sentCount, failed: failedCount };
  },
});
