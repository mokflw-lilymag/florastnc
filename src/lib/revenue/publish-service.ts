import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPlatformPostizConfig, getTenantPostizIntegration } from "./postiz-service";
import { createPostizPost } from "@/trigger/lib/postiz-client";
import { createCampaign, generateCampaignCode } from "./attribution-service";
import { triggerRevenueTask } from "./trigger-client";

export interface PublishMarketingInput {
  tenantId: string;
  platform: string;
  title?: string;
  content: string;
  imageUrl?: string;
  scheduleAt?: Date;
}

export async function publishMarketingContent(db: SupabaseClient, input: PublishMarketingInput) {
  const platform = input.platform.toLowerCase();

  if (platform === "naver" || platform === "naver_blog") {
    const { data: draft } = await db
      .from("marketing_drafts")
      .insert({
        tenant_id: input.tenantId,
        draft_type: "naver_blog",
        title: input.title,
        content: input.content,
        status: "ready",
      })
      .select("id")
      .single();

    await createCampaign(db, input.tenantId, {
      campaign_code: generateCampaignCode("sns"),
      campaign_type: "sns_naver",
      channel: "naver_blog",
      status: "draft",
      title: input.title ?? "네이버 초안",
      metadata: { draft_id: draft?.id, mode: "manual_publish" },
    });

    return {
      success: true,
      channel: "copy" as const,
      message: "네이버용 초안이 저장됐습니다. 매출 캘린더에서 복사 후 게시해 주세요.",
      draftId: draft?.id,
    };
  }

  const integration = await getTenantPostizIntegration(db, input.tenantId);
  const postizConfig = await loadPlatformPostizConfig(db);

  if (!postizConfig || !integration?.postiz_integration_id) {
    return {
      success: false,
      error: "POSTIZ_NOT_CONNECTED",
      message: "Instagram 자동 게시를 위해 계정 연결이 필요합니다. 매출 캘린더 → SNS에서 [Instagram 연결하기]를 완료해 주세요.",
    };
  }

  const postResult = await createPostizPost(postizConfig, {
    integrationId: integration.postiz_integration_id,
    caption: input.content,
    imageUrl: input.imageUrl,
    scheduleAt: input.scheduleAt,
    publishNow: !input.scheduleAt,
  });

  if (!postResult.ok) {
    await triggerRevenueTask("revenue.postiz-fallback", {
      tenantId: input.tenantId,
      caption: input.content,
      title: input.title,
      error: postResult.error,
    });
    return {
      success: false,
      error: postResult.error ?? "POSTIZ_FAILED",
      message: "Instagram 게시에 실패했습니다. SNS 탭에서 초안을 복사해 직접 게시해 주세요.",
      fallback: true,
    };
  }

  const campaign = await createCampaign(db, input.tenantId, {
    campaign_code: generateCampaignCode("sns"),
    campaign_type: "sns_instagram",
    channel: "instagram",
    status: "published",
    title: input.title ?? "Instagram 게시",
    executed_at: new Date().toISOString(),
    metadata: { postiz_post_id: postResult.postId },
  });

  return {
    success: true,
    channel: "instagram" as const,
    message: "Instagram 게시가 예약되었습니다.",
    postizPostId: postResult.postId,
    campaignId: campaign.id,
  };
}
