import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/marketing?error=no_code', req.url));
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    // 1. Google OAuth Token 교환
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    if (!access_token) {
      throw new Error('Google 액세스 토큰을 받지 못했습니다.');
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
        provider: 'youtube', // 유튜브 플랫폼으로 구분
        is_active: true,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.redirect(new URL('/dashboard/marketing?success=youtube', req.url));
  } catch (error: any) {
    console.error('Google Auth Callback Error:', error.response?.data || error.message);
    return NextResponse.redirect(new URL(`/dashboard/marketing?error=youtube_auth_failed&msg=${encodeURIComponent(error.message)}`, req.url));
  }
}
