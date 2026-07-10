import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createTriggerSupabaseAdmin } from "./lib/supabase-admin";
import { formatMarketingMessage } from "../../src/lib/marketing-helper";
import { resolveSmtpFromSettings } from "../../src/lib/email/smtp-server";
import { createTransport } from "nodemailer";
import { resolveEmailShopName } from "../../src/lib/email/resolve-shop-name";
import { format, addDays } from "date-fns";

/**
 * 매일 09:00 KST — 이메일 마케팅 자동 발송 (D-7, 당일 기념일)
 */
export const marketingAutopilotDaily = schedules.task({
  id: "marketing.autopilot-daily",
  cron: {
    pattern: "0 9 * * *",
    timezone: "Asia/Seoul",
  },
  run: async (payload) => {
    logger.info("marketing.autopilot-daily run", { timestamp: payload.timestamp.toISOString() });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error("Supabase env missing");
      return { success: false, reason: "env_missing" };
    }

    const db = createTriggerSupabaseAdmin();
    
    // Get today and d+7 dates in MM-DD format
    const runAt = payload.timestamp;
    const todayYmd = format(runAt, "MM-dd");
    const d7Ymd = format(addDays(runAt, 7), "MM-dd");

    // Fetch all tenants
    const { data: tenants, error: tErr } = await db.from("tenants").select("id, name, settings, logo_url");
    if (tErr || !tenants) {
      logger.error("Failed to fetch tenants", tErr);
      return { success: false };
    }

    let sentCount = 0;

    for (const tenant of tenants) {
      const settings = (tenant.settings || {}) as Record<string, any>;
      const autoDayOf = settings.marketingEmailAutoDayOf === true;
      const autoD7 = settings.marketingEmailAutoDaysBefore7 === true;

      if (!autoDayOf && !autoD7) continue;

      const smtp = resolveSmtpFromSettings(settings, tenantData.name || 'FloXync');
      if (!smtp) continue; // Skip if SMTP is not configured

      const transporter = createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
      });

      const shopName = resolveEmailShopName({ smtpSenderName: smtp.senderName, siteName: settings.siteName }, tenant.name);

      // Fetch customers with marketing consent
      const { data: customers } = await db
        .from("customers")
        .select("id, name, email, points")
        .eq("tenant_id", tenant.id)
        .eq("marketing_consent", true)
        .not("email", "is", null)
        .not("email", "eq", "")
        .eq("is_deleted", false);

      if (!customers || customers.length === 0) continue;
      const customerMap = new Map(customers.map(c => [c.id, c]));

      // Fetch all anniversaries for this tenant
      const { data: anniversaries } = await db
        .from("customer_anniversaries")
        .select("customer_id, label, anniversary_date, recurring_yearly")
        .eq("tenant_id", tenant.id);

      if (!anniversaries) continue;

      for (const ann of anniversaries) {
        const customer = customerMap.get(ann.customer_id);
        if (!customer) continue;

        const isRecurring = ann.recurring_yearly !== false;
        let isDayOf = false;
        let isD7 = false;

        if (isRecurring) {
          const annMd = ann.anniversary_date.substring(5); // yyyy-MM-dd -> MM-dd
          if (annMd === todayYmd) isDayOf = true;
          if (annMd === d7Ymd) isD7 = true;
        } else {
          // not recurring, match exact date
          const annDate = ann.anniversary_date; // yyyy-MM-dd
          const todayFull = format(runAt, "yyyy-MM-dd");
          const d7Full = format(addDays(runAt, 7), "yyyy-MM-dd");
          if (annDate === todayFull) isDayOf = true;
          if (annDate === d7Full) isD7 = true;
        }

        if (isDayOf && autoDayOf && settings.marketingEmailSubjectDayOf && settings.marketingEmailContentDayOf) {
          // Send Day Of Email
          const data = {
            customerName: customer.name,
            customerPoint: customer.points || 0,
            branchName: shopName,
            anniversaryName: ann.label || "기념일",
            shopLogoUrl: tenant.logo_url || undefined,
            pointRate: settings.pointRate,
            minPointUsage: settings.minPointUsage,
          };
          const subject = formatMarketingMessage(settings.marketingEmailSubjectDayOf, data);
          const html = formatMarketingMessage(settings.marketingEmailContentDayOf, data);

          try {
            await transporter.sendMail({
              from: `"${shopName}" <${smtp.user}>`,
              to: customer.email,
              subject,
              html,
            });
            sentCount++;
          } catch (e) {
            logger.error(`Failed to send DayOf to ${customer.email}`, e);
          }
        }

        if (isD7 && autoD7 && settings.marketingEmailSubjectDaysBefore7 && settings.marketingEmailContentDaysBefore7) {
          // Send D-7 Email
          const data = {
            customerName: customer.name,
            customerPoint: customer.points || 0,
            branchName: shopName,
            anniversaryName: ann.label || "기념일",
            shopLogoUrl: tenant.logo_url || undefined,
            pointRate: settings.pointRate,
            minPointUsage: settings.minPointUsage,
          };
          const subject = formatMarketingMessage(settings.marketingEmailSubjectDaysBefore7, data);
          const html = formatMarketingMessage(settings.marketingEmailContentDaysBefore7, data);

          try {
            await transporter.sendMail({
              from: `"${shopName}" <${smtp.user}>`,
              to: customer.email,
              subject,
              html,
            });
            sentCount++;
          } catch (e) {
            logger.error(`Failed to send D-7 to ${customer.email}`, e);
          }
        }
      }
    }

    logger.info("marketing.autopilot-daily complete", { sentCount });
    return { success: true, sentCount };
  },
});
