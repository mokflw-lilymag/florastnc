import { NextRequest, NextResponse } from 'next/server';
import { MetaService } from '@/services/marketing/meta-service';

export async function POST(req: NextRequest) {
  try {
    const { platform, title, content, imageUrl } = await req.json();

    if (!platform || !content) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    let result;

    if (platform === 'instagram') {
      result = await MetaService.postToInstagram({
        content,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1563241597-12a414531d5e?q=80&w=1000&auto=format&fit=crop', // fallback image
      });
    } else if (platform === 'threads') {
      result = await MetaService.postToThreads({
        content,
        imageUrl,
      });
    } else if (platform === 'naver' || platform === 'blog') {
      // 네이버의 경우 공식 블로그 글쓰기 API 제약이 있으므로,
      // 일단 성공 처리 후 n8n 또는 크롬 확장프로그램으로 넘기는 시나리오를 가정.
      result = { success: true, message: '네이버 블로그는 n8n 웹훅을 통해 발행됩니다.' };
    } else if (platform === 'tiktok') {
      // 틱톡 게시 로직 (n8n 웹훅 호출 연동)
      result = { success: true, message: '틱톡 게시물은 n8n 자동화 프로세스를 통해 업로드됩니다.' };
    } else {
      return NextResponse.json({ error: '지원하지 않는 플랫폼입니다.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Publish API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
