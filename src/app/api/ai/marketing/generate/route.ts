import { NextRequest, NextResponse } from 'next/server';
import { NaverService } from '@/services/marketing/naver-service';
import { MarketingEngine } from '@/lib/ai/marketing-engine';
import { pickUiText } from '@/i18n/pick-ui-text';
import { errAdminOperationFailed } from '@/lib/admin/admin-api-errors';
import { hqApiUiBase } from '@/lib/hq/hq-api-locale';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const bl = await hqApiUiBase(req, typeof body?.uiLocale === "string" ? body.uiLocale : undefined);
    const { topic, persona, platform, description } = body as {
      topic?: string;
      persona?: string;
      platform?: string;
      description?: string;
      uiLocale?: string;
    };
    const safeTopic = String(topic ?? "flowers");
    const safePersona = String(persona ?? "florist");
    const safePlatform = String(platform ?? "instagram");
    const safeDescription = typeof description === "string" ? description : "";
    const L = (
      ko: string,
      en: string,
      vi?: string,
      ja?: string,
      zh?: string,
      es?: string,
      pt?: string,
      fr?: string,
      de?: string,
      ru?: string,
    ) => pickUiText(bl, ko, en, vi, ja, zh, es, pt, fr, de, ru);

    // 1. Naver Blog / Google Blogger
    if (safePlatform === 'blog' || safePlatform === 'naver') {
      try {
        const blogPost = await NaverService.generateBlogPost({ topic: safeTopic, persona: safePersona });
        return NextResponse.json(blogPost);
      } catch (err) {
        console.warn("AI Blog Generation failed, using fallback");
        return NextResponse.json({
          title: L(`[블로그] ${safeTopic} 소식`, `[Blog] ${safeTopic} update`),
          content: L(
            `플록싱크에서 전해드리는 ${safeTopic}에 대한 특별한 이야기입니다.\n\n${safeDescription || '아름다운 꽃과 함께하는 일상을 만나보세요.'}`,
            `A special story from Floxync about ${safeTopic}.\n\n${safeDescription || 'Discover everyday moments brightened by beautiful flowers.'}`
          )
        });
      }
    } 
    
    // 2. SNS Platforms (Instagram, TikTok, Threads, etc.)
    try {
      const copy = await MarketingEngine.generateMarketingCopy({
        topic: safeTopic,
        persona: safePersona,
        description: safeDescription,
        platform: safePlatform as any
      });
      return NextResponse.json({ 
        title: L(`[${safePlatform.toUpperCase()}] 포스팅`, `[${safePlatform.toUpperCase()}] Post`),
        content: copy 
      });
    } catch (error) {
      console.warn("AI SNS Generation failed, using fallback");
      const fallbackCopy = L(
        `[🌸 플록싱크 특별 제안]\n\n오늘 당신의 공간을 화사하게 채워줄 싱그러운 꽃들이 도착했습니다. \n전문 플로리스트의 감각으로 디자인된 특별한 꽃다발로 소중한 마음을 전해보세요.\n\n✨ 지금 바로 매장에서 만나보실 수 있습니다.`,
        `[🌸 Floxync Special Offer]\n\nFresh flowers have arrived to brighten your space today.\nShare your feelings with bouquets thoughtfully designed by professional florists.\n\n✨ Available in-store now.`
      );
      return NextResponse.json({ 
        title: L(`[${safePlatform.toUpperCase()}] 포스팅`, `[${safePlatform.toUpperCase()}] Post`),
        content: fallbackCopy 
      });
    }

  } catch (error: unknown) {
    console.error('Generation API Error:', error);
    const bl = await hqApiUiBase(req);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }
}
