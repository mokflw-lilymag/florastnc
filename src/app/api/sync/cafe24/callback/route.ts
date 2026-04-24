import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // tenantId
  const mall_id = url.searchParams.get('mall_id');

  if (!code || !state || !mall_id) {
    return new NextResponse('Missing required parameters (code, state, or mall_id)', { status: 400 });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. 기존에 저장된 Client ID 와 Secret 가져오기
    const { data: integration, error: getError } = await supabaseAdmin
      .from('shop_integrations')
      .select('*')
      .eq('shop_id', state)
      .eq('platform', 'cafe24')
      .single();

    if (getError || !integration) {
      return new NextResponse('Integration settings not found. Please save your Client ID and Secret first.', { status: 404 });
    }
    const { client_id, client_secret } = integration;

    // 2. Cafe24 API를 호출하여 Access Token 발급
    // 로컬 환경에서도 검증 통과를 위해 호출 시 사용했던 redirect_uri와 완전히 동일해야 합니다.
    const redirectUri = encodeURIComponent(`https://floxync.com/api/sync/cafe24/callback`);
    const tokenUrl = `https://${mall_id}.cafe24api.com/api/v2/oauth/token`;
    
    // Cafe24 요구사항에 따른 Basic Auth 헤더 생성 (Base64)
    const base64Auth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Cafe24 Token Error:', tokenData);
      return new NextResponse(`Failed to get access token: ${JSON.stringify(tokenData)}`, { status: 400 });
    }

    // 3. 발급받은 토큰을 DB에 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('shop_integrations')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        last_sync_at: new Date().toISOString()
      })
      .eq('shop_id', state)
      .eq('platform', 'cafe24');

    if (updateError) {
      throw updateError;
    }

    // 4. 성공 시 프론트엔드로 리다이렉트 또는 안내창 표시
    const html = `
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #10b981;">✅ 카페24 연동 성공!</h2>
          <p>이제 엑세스 토큰이 성공적으로 발급되었습니다.</p>
          <p>이 창을 닫고 프록싱크 화면으로 돌아가 [주문 수동 동기화]를 테스트해 보세요.</p>
          <script>
            setTimeout(() => { window.close(); }, 3000);
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error: any) {
    console.error('OAuth Callback Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
