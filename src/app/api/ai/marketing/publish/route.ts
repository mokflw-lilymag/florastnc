import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@/utils/supabase/server';
import {
  errApiN8nUrlMissing,
  errApiPublishDispatchFailed,
  errApiRequiredParamsMissing,
} from '@/lib/admin/admin-api-errors';
import { hqApiUiBase } from '@/lib/hq/hq-api-locale';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const bl = await hqApiUiBase(req, typeof body?.uiLocale === 'string' ? body.uiLocale : undefined);
    const { platform, title, content, imageUrl, persona, topic } = body as {
      platform?: string;
      title?: string;
      content?: string;
      imageUrl?: string;
      persona?: string;
      topic?: string;
    };

    if (!platform || !content) {
      return NextResponse.json({ error: errApiRequiredParamsMissing(bl) }, { status: 400 });
    }

    // 현재 로그인한 사용자 ID 가져오기
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    console.log(`[Publish] User ID: ${userId}`);

    const n8nWebhookUrl = process.env.N8N_MASTER_URL;
    
    if (!n8nWebhookUrl) {
      console.error('N8N_MASTER_URL is not defined in environment variables');
      return NextResponse.json({ error: errApiN8nUrlMissing(bl) }, { status: 500 });
    }

    console.log(`[Publish] Sending webhook to n8n for platform: ${platform}`);
    console.log(`[Publish] Webhook URL: ${n8nWebhookUrl}`);

    // n8n 웹훅 호출 - user_id 포함
    const response = await axios.post(n8nWebhookUrl, {
      user_id: userId,
      platform,
      title: title || `${platform.toUpperCase()} 포스팅`,
      content,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1563241597-12a414531d5e?q=80&w=1000&auto=format&fit=crop',
      persona: persona || '일반 플로리스트',
      topic: topic || '오늘의 꽃 소식',
      timestamp: new Date().toISOString()
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('[Publish] n8n response:', response.data);

    return NextResponse.json({ 
      success: true, 
      message: `${platform} 홍보 작전이 n8n 로봇에게 전달되었습니다.`,
      n8nResponse: response.data 
    });

  } catch (error: unknown) {
    console.error('Publish API Error:', (error as { response?: { data?: unknown }; message?: string })?.response?.data || (error as { message?: string })?.message);
    const bl = await hqApiUiBase(req);
    return NextResponse.json({ 
      error: errApiPublishDispatchFailed(bl), 
      details: (error as { message?: string })?.message,
    }, { status: 500 });
  }
}
