import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // 보안을 위해 CSRF 체크용

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/marketing?error=no_code', req.url));
  }

  try {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;

    // 1. Access Token 교환
    const tokenResponse = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key: clientKey || '',
        client_secret: clientSecret || '',
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri || '',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, open_id, expires_in } = tokenResponse.data;

    if (!access_token) {
      throw new Error('TikTok 액세스 토큰을 받지 못했습니다.');
    }

    // 2. Supabase에 저장
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('인증된 사용자가 아닙니다.');
    }

    const { error } = await supabase
      .from('user_credentials')
      .upsert({
        user_id: user.id,
        provider: 'tiktok',
        is_active: true,
        access_token: access_token,
        refresh_token: refresh_token,
        provider_user_id: open_id,
        expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    // 성공 시 마케팅 페이지로 리다이렉트
    return NextResponse.redirect(new URL('/dashboard/marketing?success=tiktok', req.url));
  } catch (error: any) {
    console.error('TikTok Auth Callback Error:', error.response?.data || error.message);
    return NextResponse.redirect(new URL(`/dashboard/marketing?error=tiktok_auth_failed&msg=${encodeURIComponent(error.message)}`, req.url));
  }
}
