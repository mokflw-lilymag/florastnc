import { NextRequest, NextResponse } from 'next/server';
import { NaverService } from '@/services/marketing/naver-service';
import { MarketingEngine } from '@/lib/ai/marketing-engine';

export async function POST(req: NextRequest) {
  try {
    const { topic, persona, platform, description } = await req.json();
    const engine = new MarketingEngine();

    // 1. Naver Blog / Google Blogger
    if (platform === 'blog' || platform === 'naver') {
      try {
        const blogPost = await NaverService.generateBlogPost({ topic, persona });
        return NextResponse.json(blogPost);
      } catch (err) {
        console.warn("AI Blog Generation failed, using fallback");
        return NextResponse.json({
          title: `[블로그] ${topic} 소식`,
          content: `플로라싱크에서 전해드리는 ${topic}에 대한 특별한 이야기입니다.\n\n${description || '아름다운 꽃과 함께하는 일상을 만나보세요.'}`
        });
      }
    } 
    
    // 2. SNS Platforms (Instagram, TikTok, Threads, etc.)
    try {
      const copy = await MarketingEngine.generateMarketingCopy({
        topic,
        persona,
        description,
        platform: platform as any
      });
      return NextResponse.json({ 
        title: `[${platform.toUpperCase()}] 포스팅`,
        content: copy 
      });
    } catch (error) {
      console.warn("AI SNS Generation failed, using fallback");
      const fallbackCopy = `[🌸 플로라싱크 특별 제안]\n\n오늘 당신의 공간을 화사하게 채워줄 싱그러운 꽃들이 도착했습니다. \n전문 플로리스트의 감각으로 디자인된 특별한 꽃다발로 소중한 마음을 전해보세요.\n\n✨ 지금 바로 매장에서 만나보실 수 있습니다.`;
      return NextResponse.json({ 
        title: `[${platform.toUpperCase()}] 포스팅`,
        content: fallbackCopy 
      });
    }

  } catch (error: any) {
    console.error('Generation API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
