import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { applySubscriptionToTenant } from "../lib/subscription/apply-subscription";

// Initialize Supabase Client for Trigger.dev (Admin)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const tossAutoBillingCron = schedules.task({
  id: "toss-auto-billing-cron",
  cron: "0 * * * *", // Run every hour
  maxDuration: 300, // 5 minutes
  run: async (payload, { ctx }) => {
    logger.info("Starting Toss Auto-Billing cron job");

    const widgetSecretKey = process.env.TOSS_SECRET_KEY;
    if (!widgetSecretKey) {
      throw new Error("TOSS_SECRET_KEY is not defined");
    }
    const encryptedSecretKey = Buffer.from(widgetSecretKey + ":").toString("base64");

    // Fetch tenants whose next_billing_date is due
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id, name, toss_billing_key, next_billing_date, cancel_at_period_end, auto_billing_enabled, plan, period")
      .eq("auto_billing_enabled", true)
      .not("toss_billing_key", "is", null)
      .lte("next_billing_date", new Date().toISOString());

    if (error) {
      logger.error("Failed to fetch tenants for auto-billing", { error });
      throw new Error(`DB Error: ${error.message}`);
    }

    if (!tenants || tenants.length === 0) {
      logger.info("No tenants require auto-billing at this time.");
      return { processed: 0, successful: 0, failed: 0 };
    }

    logger.info(`Found ${tenants.length} tenants due for auto-billing.`);

    let successful = 0;
    let failed = 0;

    for (const tenant of tenants) {
      logger.info(`Processing billing for tenant ${tenant.id} (${tenant.name})`);

      try {
        if (tenant.cancel_at_period_end) {
          // If the user cancelled, do not bill. Just disable auto_billing.
          logger.info(`Tenant ${tenant.id} has cancelled subscription. Disabling auto-billing.`);
          await supabase.from("tenants").update({
            auto_billing_enabled: false,
            toss_billing_key: null,
          }).eq("id", tenant.id);
          continue;
        }

        // Fetch plan amount (we assume the plan has a fixed price, we should look it up from pricing.ts, 
        // but since this is backend, we can fetch it, or we could just use the current plan/period)
        // For simplicity, let's look it up or calculate it.
        // Wait, applySubscriptionToTenant does not calculate amount, it just records it.
        // Let's import pricing from lib.
        
        // Dynamic import to avoid next.js specific issues if any
        const { PLAN_KRW_TOTAL } = await import("../lib/subscription/pricing");
        const amountCents = PLAN_KRW_TOTAL[tenant.plan as keyof typeof PLAN_KRW_TOTAL]?.[tenant.period as "1m" | "12m"] || 0;
        
        if (amountCents <= 0) {
           logger.error(`Invalid amount ${amountCents} for tenant ${tenant.id}`);
           failed++;
           continue;
        }

        const orderId = `sub_${tenant.id}_${Date.now()}`;

        // Call Toss Billing API
        const paymentResponse = await fetch(`https://api.tosspayments.com/v1/billing/${tenant.toss_billing_key}`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${encryptedSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            amount: amountCents,
            customerKey: `cust_${tenant.id}`,
            orderName: `FloXync Subscription (${tenant.plan})`,
          }),
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
           logger.error(`Toss billing failed for tenant ${tenant.id}`, { paymentData });
           
           // You might want to handle retries or notification to user here.
           // For now, we update next_billing_date slightly to retry later, or mark as failed.
           // Let's disable auto_billing for hard failures, or just leave it for the next run.
           failed++;
           continue;
        }

        logger.info(`Toss billing successful for tenant ${tenant.id}. PaymentKey: ${paymentData.paymentKey}`);

        // Calculate next billing date
        const months = tenant.period === "12m" ? 12 : 1;
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + months);

        // Update tenant
        await supabase.from("tenants").update({
          next_billing_date: nextBillingDate.toISOString(),
        }).eq("id", tenant.id);

        // Apply subscription
        await applySubscriptionToTenant(
          supabase,
          tenant.id,
          tenant.plan as any,
          tenant.period as any,
          {
            source: "toss",
            externalRef: paymentData.paymentKey,
            amountCents: amountCents,
            currency: "KRW",
            orderId,
            actorUserId: "system",
          }
        );

        successful++;

      } catch (err: any) {
        logger.error(`Exception while processing tenant ${tenant.id}`, { error: err.message });
        failed++;
      }
    }

    return {
      processed: tenants.length,
      successful,
      failed
    };
  },
});
