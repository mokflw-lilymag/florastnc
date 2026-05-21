import type { SupabaseClient } from "@supabase/supabase-js";
import { MarketingEngine } from "@/lib/ai/marketing-engine";
import { NaverService } from "@/services/marketing/naver-service";
import { createCampaign, generateCampaignCode } from "./attribution-service";
import { resolvePersonaString, DEFAULT_PROMO_TOPICS } from "./personas";
import snsHarness from "./harness/sns-content-7types.json";
import { generateLimbicAbVariants } from "./limbic-ab";
import { buildNaverSeoPromptPack, NAVER_SEO_TEMPLATES } from "./naver-seo-pack";

export interface SuggestFromOrderResult {
  orderId: string;
  orderNumber: string;
  topic: string;
  persona: string;
  contentType?: string;
  contentTypeLabel?: string;
  instagram: { caption: string; draftId?: string };
  naver: { title: string; content: string; draftId?: string };
  abVariants?: { segment: string; label: string; caption: string }[];
  naverSeoTemplate?: string;
  campaignId?: string;
}

export { NAVER_SEO_TEMPLATES };

function buildOrderTopic(order: {
  items?: { name?: string }[];
  message?: { content?: string };
  delivery_info?: { recipientName?: string } | null;
}): string {
  const items = (order.items ?? [])
    .map((i) => i.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const ribbon = order.message?.content?.trim();
  const recipient = order.delivery_info?.recipientName;
  const parts = [items, ribbon ? `리본: ${ribbon.slice(0, 40)}` : null, recipient ? `${recipient}님께` : null].filter(
    Boolean
  );
  return parts.join(" · ") || "꽃 선물";
}

async function saveDraft(
  db: SupabaseClient,
  tenantId: string,
  params: {
    draft_type: "instagram_caption" | "naver_blog";
    title?: string;
    content: string;
    campaign_id?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const { data, error } = await db
    .from("marketing_drafts")
    .insert({
      tenant_id: tenantId,
      campaign_id: params.campaign_id ?? null,
      draft_type: params.draft_type,
      title: params.title ?? null,
      content: params.content,
      metadata: params.metadata ?? {},
      status: "ready",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** 주문 기반 인스타 캡션 + 네이버 블로그 초안 생성 */
export async function suggestMarketingFromOrder(
  db: SupabaseClient,
  tenantId: string,
  orderId: string,
  opts?: {
    persona?: string;
    saveDrafts?: boolean;
    contentType?: string;
    promoTopicIndex?: number;
    abTest?: boolean;
    naverSeoTemplateId?: string;
    region?: string;
  }
): Promise<SuggestFromOrderResult> {
  const { data: settings } = await db
    .from("revenue_autopilot_settings")
    .select("marketing_persona, promo_topics")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const { data: order, error } = await db
    .from("orders")
    .select("id, order_number, items, message, delivery_info, completionphotourl")
    .eq("id", orderId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw error;
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const { data: tenant } = await db.from("tenants").select("name").eq("id", tenantId).maybeSingle();
  const shopName = (tenant?.name as string) ?? "꽃집";
  const promoTopics = (settings?.promo_topics as string[] | null) ?? [...DEFAULT_PROMO_TOPICS];
  const promoIdx = opts?.promoTopicIndex ?? 0;
  const promoTopic = promoTopics[promoIdx] ?? promoTopics[0] ?? "꽃 선물";
  const persona = opts?.persona ?? resolvePersonaString(settings?.marketing_persona as string | undefined, shopName);
  const baseTopic = buildOrderTopic(order as Parameters<typeof buildOrderTopic>[0]);
  const topic = `${promoTopic} · ${baseTopic}`;

  const contentTypes = snsHarness.content_types as { id: string; label: string; focus: string }[];
  const contentType = opts?.contentType ?? contentTypes[0]?.id ?? "work_showcase";
  const contentMeta = contentTypes.find((c) => c.id === contentType);
  const harnessHint = contentMeta ? `[콘텐츠 유형: ${contentMeta.label}] ${contentMeta.focus}` : "";

  const photoUrl =
    (order as { completionphotourl?: string }).completionphotourl ??
    (order.delivery_info as { completionPhotoUrl?: string } | null)?.completionPhotoUrl;

  const seoPack = opts?.naverSeoTemplateId
    ? buildNaverSeoPromptPack(opts.naverSeoTemplateId, { region: opts.region, shopName, topic: baseTopic })
    : null;
  const naverTopic = seoPack
    ? `${seoPack.enrichedTopic}\n${seoPack.seoBlock}`
    : `${topic}\n${harnessHint}`;

  const [instagramCaption, naverPost] = await Promise.all([
    MarketingEngine.generateMarketingCopy({
      topic,
      persona,
      description: [harnessHint, photoUrl ? `작품 사진 URL: ${photoUrl}` : undefined].filter(Boolean).join("\n"),
      platform: "instagram",
    }),
    NaverService.generateBlogPost({ topic: naverTopic, persona }),
  ]);

  const abVariants = opts?.abTest
    ? await generateLimbicAbVariants({ baseCaption: instagramCaption, topic, persona })
    : undefined;

  let campaignId: string | undefined;
  if (opts?.saveDrafts !== false) {
    const campaign = await createCampaign(db, tenantId, {
      campaign_code: generateCampaignCode("sns"),
      campaign_type: "sns_copy",
      channel: "copy",
      status: "draft",
      title: `${topic} · SNS 초안`,
      order_id: orderId,
      metadata: { topic, persona, source: "suggest-from-order" },
    });
    campaignId = campaign.id;

    const igDraftId = await saveDraft(db, tenantId, {
      draft_type: "instagram_caption",
      content: instagramCaption,
      campaign_id: campaignId,
      metadata: { order_id: orderId, photo_url: photoUrl },
    });

    const nvDraftId = await saveDraft(db, tenantId, {
      draft_type: "naver_blog",
      title: naverPost.title,
      content: naverPost.content,
      campaign_id: campaignId,
      metadata: { order_id: orderId },
    });

    return {
      orderId,
      orderNumber: order.order_number as string,
      topic,
      persona,
      contentType,
      contentTypeLabel: contentMeta?.label,
      abVariants,
      naverSeoTemplate: seoPack?.template.label,
      instagram: { caption: instagramCaption, draftId: igDraftId },
      naver: { title: naverPost.title, content: naverPost.content, draftId: nvDraftId },
      campaignId,
    };
  }

  return {
    orderId,
    orderNumber: order.order_number as string,
    topic,
    persona,
    contentType,
    contentTypeLabel: contentMeta?.label,
    abVariants,
    naverSeoTemplate: seoPack?.template.label,
    instagram: { caption: instagramCaption },
    naver: { title: naverPost.title, content: naverPost.content },
  };
}
