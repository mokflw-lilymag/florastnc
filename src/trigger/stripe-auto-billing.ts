import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { applySubscriptionToTenant } from "../lib/subscription/apply-subscription";
import Stripe from "stripe";

// Initialize Supabase Client for Trigger.dev (Admin)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const stripeAutoBillingCron = schedules.task({
  id: "stripe-auto-billing-cron",
  cron: "0 * * * *", // Run every hour
  maxDuration: 300, // 5 minutes
  run: async (payload, { ctx }) => {
    logger.info("Starting Stripe Auto-Billing cron job");

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not defined");
    }
    const stripe = new Stripe(stripeSecretKey);

    // Fetch tenants whose next_billing_date is due
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id, name, stripe_payment_method_id, stripe_customer_id, next_billing_date, cancel_at_period_end, auto_billing_enabled, plan, period")
      .eq("auto_billing_enabled", true)
      .not("stripe_payment_method_id", "is", null)
      .lte("next_billing_date", new Date().toISOString());

    if (error) {
      logger.error("Failed to fetch tenants for Stripe auto-billing", { error });
      throw new Error(`DB Error: ${error.message}`);
    }

    if (!tenants || tenants.length === 0) {
      logger.info("No tenants require Stripe auto-billing at this time.");
      return { processed: 0, successful: 0, failed: 0 };
    }

    logger.info(`Found ${tenants.length} tenants due for Stripe auto-billing.`);

    let successful = 0;
    let failed = 0;

    for (const tenant of tenants) {
      logger.info(`Processing Stripe billing for tenant ${tenant.id} (${tenant.name})`);

      try {
        if (tenant.cancel_at_period_end) {
          // If the user cancelled, do not bill. Just disable auto_billing.
          logger.info(`Tenant ${tenant.id} has cancelled subscription. Disabling auto-billing.`);
          await supabase.from("tenants").update({
            auto_billing_enabled: false,
            stripe_payment_method_id: null,
          }).eq("id", tenant.id);
          continue;
        }

        const { PLAN_USD_TOTAL_CENTS } = await import("../lib/subscription/pricing");
        const amountCents = PLAN_USD_TOTAL_CENTS[tenant.plan as keyof typeof PLAN_USD_TOTAL_CENTS]?.[tenant.period as "1m" | "12m"] || 0;
        
        if (amountCents <= 0) {
           logger.error(`Invalid amount ${amountCents} for tenant ${tenant.id}`);
           failed++;
           continue;
        }

        const orderId = `sub_${tenant.id}_${Date.now()}`;

        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: "usd",
          customer: tenant.stripe_customer_id,
          payment_method: tenant.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          description: `FloXync Subscription (${tenant.plan})`,
          metadata: {
            tenant_id: tenant.id,
            plan_id: tenant.plan,
            period: tenant.period,
            order_id: orderId,
            auto_billing: "true",
          },
        });

        logger.info(`Stripe payment intent successful for tenant ${tenant.id}`, { paymentIntentId: paymentIntent.id });

        // Apply subscription with Referral stacking support
        const result = await applySubscriptionToTenant(
          supabase,
          tenant.id,
          tenant.plan as any,
          tenant.period as any,
          {
            actorUserId: "system",
            source: "stripe",
            externalRef: paymentIntent.id,
            amountCents: amountCents,
            currency: "USD",
            orderId: orderId,
          }
        );

        // Update next_billing_date correctly
        await supabase.from("tenants").update({
          next_billing_date: result.expiry,
          cancel_at_period_end: false,
        }).eq("id", tenant.id);

        successful++;
      } catch (err: any) {
        logger.error(`Stripe billing error for tenant ${tenant.id}`, { err });
        failed++;

        if (err.code === "authentication_required" || err.type === "StripeCardError") {
           // Payment failed due to card issues. 
           // Disable auto billing and maybe send email (omitted for now)
           await supabase.from("tenants").update({
             auto_billing_enabled: false,
           }).eq("id", tenant.id);
        }
      }
    }

    return { processed: tenants.length, successful, failed };
  },
});
