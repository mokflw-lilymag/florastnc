import { NextRequest, NextResponse } from 'next/server';
import { NaverService } from '@/services/marketing/naver-service';
import { MarketingEngine } from '@/lib/ai/marketing-engine';

export async function POST(req: NextRequest) {
  try {
    const { topic, persona, platform, description } = await req.json();

    if (platform === 'blog' || platform === 'naver') {
      const blogPost = await NaverService.generateBlogPost({
        topic,
        persona
      });
      return NextResponse.json(blogPost); // { title, content }
    } 
    else if (platform === 'instagram' || platform === 'threads') {
      const content = await MarketingEngine.generateMarketingCopy({
        topic,
        persona,
        description,
        platform: platform as 'instagram' | 'tiktok' | 'blog'
      });
      
      // We return { title, content } to match the blog structure for the UI
      return NextResponse.json({
        title: `[${platform.toUpperCase()}] ${topic} 포스팅 초안`,
        content: content
      });
    }

    return NextResponse.json({ error: 'Unsupported platform: ' + platform }, { status: 400 });
  } catch (error: any) {
    console.error('Generation API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
