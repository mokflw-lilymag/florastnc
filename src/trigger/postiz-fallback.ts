import { task, logger } from "@trigger.dev/sdk/v3";

/**
 * Postiz 게시 실패 시 marketing_drafts + copy 채널 fallback
 * @see docs/revenue_engine_task_list.md P2-S9
 */
export const postizFallback = task({
  id: "revenue.postiz-fallback",
  run: async (payload: {
    tenantId: string;
    campaignId?: string;
    caption: string;
    title?: string;
    orderId?: string;
    error?: string;
  }) => {
    logger.info("revenue.postiz-fallback", payload);

    const { createTriggerSupabaseAdmin } = await import("./lib/supabase-admin");
    const db = createTriggerSupabaseAdmin();

    const { data: draft, error } = await db
      .from("marketing_drafts")
      .insert({
        tenant_id: payload.tenantId,
        campaign_id: payload.campaignId ?? null,
        draft_type: "instagram_caption",
        title: payload.title ?? "Postiz fallback",
        content: payload.caption,
        status: "ready",
        metadata: { fallback: true, error: payload.error, order_id: payload.orderId },
      })
      .select("id")
      .single();

    if (error) {
      logger.error("draft insert failed", { error: error.message });
      return { ok: false, error: error.message };
    }

    if (payload.campaignId) {
      await db
        .from("marketing_campaigns")
        .update({
          status: "degraded",
          channel: "copy",
          metadata: { postiz_error: payload.error, fallback_draft_id: draft.id },
        })
        .eq("id", payload.campaignId)
        .eq("tenant_id", payload.tenantId);
    }

    return { ok: true, draftId: draft.id };
  },
});
