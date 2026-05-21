import type { SupabaseClient } from "@supabase/supabase-js";
import { createCampaign, generateCampaignCode } from "./attribution-service";
import { suggestMarketingFromOrder } from "./suggest-from-order";
import { loadPlatformPostizConfig, getTenantPostizIntegration } from "./postiz-service";
import { createPostizPost } from "@/trigger/lib/postiz-client";
import { sendAnniversaryReminder } from "./messaging";

export interface DailyAutopilotResult {
  tenantId: string;
  status: "published" | "pending_approval" | "skipped" | "failed";
  reason?: string;
  campaignId?: string;
  scheduledPostId?: string;
  postizPostId?: string;
}

async function pickRecentOrderWithPhoto(db: SupabaseClient, tenantId: string) {
  const { data } = await db
    .from("orders")
    .select("id, order_number, completionphotourl, delivery_info")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .order("updated_at", { ascending: false })
    .limit(5);

  for (const o of data ?? []) {
    const di = o.delivery_info as { completionPhotoUrl?: string } | null;
    const photo = o.completionphotourl ?? di?.completionPhotoUrl;
    if (photo) return { orderId: o.id as string, orderNumber: o.order_number as string, photoUrl: photo as string };
  }
  const first = data?.[0];
  if (first) {
    const di = first.delivery_info as { completionPhotoUrl?: string } | null;
    return {
      orderId: first.id as string,
      orderNumber: first.order_number as string,
      photoUrl: (first.completionphotourl ?? di?.completionPhotoUrl ?? null) as string | null,
    };
  }
  return null;
}

/** 테넌트 1곳 SNS daily-autopilot */
export async function runDailyAutopilotForTenant(
  db: SupabaseClient,
  params: {
    tenantId: string;
    integrationId: string;
    requiresApproval: boolean;
    runAt?: Date;
  }
): Promise<DailyAutopilotResult> {
  const base: DailyAutopilotResult = { tenantId: params.tenantId, status: "skipped" };

  const order = await pickRecentOrderWithPhoto(db, params.tenantId);
  if (!order) return { ...base, reason: "no_completed_order" };

  let suggest;
  try {
    suggest = await suggestMarketingFromOrder(db, params.tenantId, order.orderId, { saveDrafts: true });
  } catch (e) {
    return { ...base, status: "failed", reason: e instanceof Error ? e.message : "suggest_failed" };
  }

  const scheduleAt = new Date((params.runAt ?? new Date()).getTime() + 30 * 60_000);
  const caption = suggest.instagram.caption;

  if (params.requiresApproval) {
    const { data: row, error } = await db
      .from("marketing_scheduled_posts")
      .insert({
        tenant_id: params.tenantId,
        channel: "instagram",
        title: suggest.naver.title,
        content: caption,
        media_url: order.photoUrl,
        scheduled_at: scheduleAt.toISOString(),
        status: "pending_approval",
        metadata: { order_id: order.orderId, order_number: order.orderNumber },
      })
      .select("id")
      .single();
    if (error) return { ...base, status: "failed", reason: error.message };

    const campaign = await createCampaign(db, params.tenantId, {
      campaign_code: generateCampaignCode("sns-auto"),
      campaign_type: "sns_instagram",
      channel: "instagram",
      status: "scheduled",
      title: `SNS 승인 대기 · ${order.orderNumber}`,
      order_id: order.orderId,
      scheduled_at: scheduleAt.toISOString(),
      metadata: { scheduled_post_id: row.id, mode: "approval" },
    });

    await db.from("marketing_scheduled_posts").update({ campaign_id: campaign.id }).eq("id", row.id);

    return {
      tenantId: params.tenantId,
      status: "pending_approval",
      campaignId: campaign.id,
      scheduledPostId: row.id as string,
    };
  }

  const postizConfig = await loadPlatformPostizConfig(db);
  if (!postizConfig) return { ...base, status: "failed", reason: "postiz_not_configured" };

  const postResult = await createPostizPost(postizConfig, {
    integrationId: params.integrationId,
    caption,
    imageUrl: order.photoUrl ?? undefined,
    scheduleAt,
  });

  if (!postResult.ok) {
    return { ...base, status: "failed", reason: postResult.error ?? "postiz_failed" };
  }

  const campaign = await createCampaign(db, params.tenantId, {
    campaign_code: generateCampaignCode("sns-auto"),
    campaign_type: "sns_instagram",
    channel: "instagram",
    status: "published",
    title: `SNS 자동 · ${order.orderNumber}`,
    order_id: order.orderId,
    executed_at: new Date().toISOString(),
    metadata: { postiz_post_id: postResult.postId, mode: "autopilot" },
  });

  return {
    tenantId: params.tenantId,
    status: "published",
    campaignId: campaign.id,
    postizPostId: postResult.postId,
  };
}

/** 승인된 예약 게시 → Postiz publish */
export async function publishApprovedScheduledPost(db: SupabaseClient, scheduledPostId: string, tenantId: string) {
  const { data: row, error } = await db
    .from("marketing_scheduled_posts")
    .select("*")
    .eq("id", scheduledPostId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("NOT_FOUND");
  if (row.status !== "pending_approval" && row.status !== "approved") {
    throw new Error("INVALID_STATUS");
  }

  const integration = await getTenantPostizIntegration(db, tenantId);
  if (!integration?.postiz_integration_id) throw new Error("INSTAGRAM_NOT_CONNECTED");

  const postizConfig = await loadPlatformPostizConfig(db);
  if (!postizConfig) throw new Error("POSTIZ_NOT_CONFIGURED");

  const scheduleAt = new Date(row.scheduled_at as string);
  const postResult = await createPostizPost(postizConfig, {
    integrationId: integration.postiz_integration_id,
    caption: row.content as string,
    imageUrl: (row.media_url as string) ?? undefined,
    scheduleAt: scheduleAt > new Date() ? scheduleAt : undefined,
    publishNow: scheduleAt <= new Date(),
  });

  if (!postResult.ok) {
    await db
      .from("marketing_scheduled_posts")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", scheduledPostId);
    throw new Error(postResult.error ?? "POSTIZ_FAILED");
  }

  await db
    .from("marketing_scheduled_posts")
    .update({
      status: "published",
      postiz_post_id: postResult.postId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduledPostId);

  if (row.campaign_id) {
    await db
      .from("marketing_campaigns")
      .update({ status: "published", executed_at: new Date().toISOString() })
      .eq("id", row.campaign_id);
  }

  return { postizPostId: postResult.postId };
}

/** 네이버 초안 알림톡 (복사 유도) — 연락처는 테넌트 대표 번호 등 metadata에서 */
export async function notifyNaverDraftReady(
  db: SupabaseClient,
  tenantId: string,
  params: { orderNumber: string; draftPreview: string; notifyPhone?: string }
) {
  const phone = params.notifyPhone?.replace(/\D/g, "");
  if (!phone || phone.length < 10) {
    return { sent: false, reason: "no_notify_phone" };
  }

  const text =
    `[Floxync] 네이버 블로그 초안 준비 완료 ✍️\n` +
    `주문 ${params.orderNumber} 작품용 글이 생성됐어요.\n` +
    `매출 캘린더 → SNS 초안에서 [복사] 후 네이버에 붙여넣어 주세요.\n\n` +
    params.draftPreview.slice(0, 80) + "…";

  const sent = await sendAnniversaryReminder(db, {
    tenantId,
    to: phone,
    text,
    customerName: "사장님",
  });

  return { sent: sent.ok, channel: sent.channel };
}
