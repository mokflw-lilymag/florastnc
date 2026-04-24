import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // tenantId 또는 tenantId:mallId
  
  // mall_id가 쿼리에 없으면 state에서 파싱 시도
  let mall_id = url.searchParams.get('mall_id');
  let tenantId = state;

  if (state && state.includes(':')) {
    const parts = state.split(':');
    tenantId = parts[0];
    mall_id = mall_id || parts[1];
  }

  if (!code || !tenantId || !mall_id) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;">
        <h2 style="color:#ef4444;">❌ 파라미터 누락</h2>
        <p>code: ${code ? '✅' : '❌ 없음'}</p>
        <p>tenantId: ${tenantId ? '✅' : '❌ 없음'}</p>
        <p>mall_id: ${mall_id ? '✅' : '❌ 없음'}</p>
        <p>전체 URL: ${url.toString()}</p>
      </body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // 환경 변수 체크
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;">
        <h2 style="color:#ef4444;">❌ 서버 환경 변수 누락</h2>
        <p>NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 설정됨' : '❌ 없음'}</p>
        <p>SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 없음'}</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. 기존에 저장된 Client ID 와 Secret 가져오기
    const { data: integration, error: getError } = await supabaseAdmin
      .from('shop_integrations')
      .select('*')
      .eq('shop_id', tenantId)
      .eq('platform', 'cafe24')
      .single();

    if (getError || !integration) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px;">
          <h2 style="color:#ef4444;">❌ DB 조회 실패</h2>
          <p>tenantId: ${tenantId}</p>
          <p>에러: ${getError?.message || 'integration 데이터 없음'}</p>
          <p>먼저 설정 페이지에서 Client ID와 Secret을 저장해주세요.</p>
        </body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const { client_id, client_secret } = integration;

    // 2. Cafe24 API를 호출하여 Access Token 발급
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

    let tokenData: any;
    const responseText = await tokenResponse.text();
    try {
      tokenData = JSON.parse(responseText);
    } catch {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px;">
          <h2 style="color:#ef4444;">❌ 카페24 응답 파싱 실패</h2>
          <p>Status: ${tokenResponse.status}</p>
          <p>Response: ${responseText.substring(0, 500)}</p>
        </body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    if (!tokenResponse.ok) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px;">
          <h2 style="color:#ef4444;">❌ 카페24 토큰 발급 실패</h2>
          <p>Status: ${tokenResponse.status}</p>
          <p>Error: ${JSON.stringify(tokenData, null, 2)}</p>
          <p>Token URL: ${tokenUrl}</p>
          <p>Client ID: ${client_id}</p>
          <p>Client Secret 길이: ${client_secret?.length || 0}자</p>
          <hr/>
          <p style="color:#666;font-size:12px;">redirect_uri: https://floxync.com/api/sync/cafe24/callback</p>
        </body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // 3. 발급받은 토큰을 DB에 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('shop_integrations')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        last_sync_at: new Date().toISOString()
      })
      .eq('shop_id', tenantId)
      .eq('platform', 'cafe24');

    if (updateError) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px;">
          <h2 style="color:#ef4444;">❌ DB 업데이트 실패</h2>
          <p>${updateError.message}</p>
        </body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // 4. 성공 시 안내창 표시
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
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;">
        <h2 style="color:#ef4444;">❌ 서버 내부 오류</h2>
        <p>에러 타입: ${error?.name || 'Unknown'}</p>
        <p>에러 메시지: ${error?.message || '알 수 없는 오류'}</p>
        <p>스택: <pre style="font-size:11px;overflow:auto;max-height:300px;">${error?.stack || 'N/A'}</pre></p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
