import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createTriggerSupabaseAdmin } from "./lib/supabase-admin";
import { formatMarketingMessage } from "../../src/lib/marketing-helper";
import { resolveSmtpForTenant } from "../../src/lib/email/tenant-email-settings";
import { createTransport } from "nodemailer";
import { resolveEmailShopName } from "../../src/lib/email/resolve-shop-name";
import { subHours } from "date-fns";

/**
 * 매시간 실행 — 첫 구매 감사 메일 자동 발송
 */
export const marketingAutopilotHourly = schedules.task({
  id: "marketing.autopilot-hourly",
  cron: {
    pattern: "0 * * * *", // Every hour
    timezone: "Asia/Seoul",
  },
  run: async (payload) => {
    logger.info("marketing.autopilot-hourly run", { timestamp: payload.timestamp.toISOString() });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error("Supabase env missing");
      return { success: false, reason: "env_missing" };
    }

    const db = createTriggerSupabaseAdmin();
    const runAt = payload.timestamp;
    const oneHourAgo = subHours(runAt, 1).toISOString();
    const nowIso = runAt.toISOString();

    // Fetch all tenants
    const { data: tenants, error: tErr } = await db.from("tenants").select("id, name, settings, logo_url");
    if (tErr || !tenants) {
      logger.error("Failed to fetch tenants", tErr);
      return { success: false };
    }

    let sentCount = 0;

    for (const tenant of tenants) {
      const settings = (tenant.settings || {}) as Record<string, any>;
      const autoFirstPurchase = settings.marketingEmailAutoFirstPurchase === true;

      if (!autoFirstPurchase || !settings.marketingEmailSubjectFirstPurchase || !settings.marketingEmailContentFirstPurchase) {
        continue;
      }

      const smtp = resolveSmtpForTenant(settings);
      if (!smtp) continue;

      const transporter = createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
      });

      const shopName = resolveEmailShopName({ smtpSenderName: smtp.senderName, siteName: settings.siteName }, tenant.name);

      // Fetch customers created in the last 1 hour
      const { data: customers } = await db
        .from("customers")
        .select("id, name, email, points, created_at")
        .eq("tenant_id", tenant.id)
        .eq("marketing_consent", true)
        .not("email", "is", null)
        .not("email", "eq", "")
        .eq("is_deleted", false)
        .gte("created_at", oneHourAgo)
        .lt("created_at", nowIso);

      if (!customers || customers.length === 0) continue;

      for (const customer of customers) {
        const data = {
          customerName: customer.name,
          customerPoint: customer.points || 0,
          branchName: shopName,
          shopLogoUrl: tenant.logo_url || undefined,
          pointRate: settings.pointRate,
          minPointUsage: settings.minPointUsage,
        };

        const subject = formatMarketingMessage(settings.marketingEmailSubjectFirstPurchase, data);
        const html = formatMarketingMessage(settings.marketingEmailContentFirstPurchase, data);

        try {
          await transporter.sendMail({
            from: `"${shopName}" <${smtp.user}>`,
            to: customer.email,
            subject,
            html,
          });
          sentCount++;
        } catch (e) {
          logger.error(`Failed to send First Purchase to ${customer.email}`, e);
        }
      }
    }

    logger.info("marketing.autopilot-hourly complete", { sentCount });
    return { success: true, sentCount };
  },
});
