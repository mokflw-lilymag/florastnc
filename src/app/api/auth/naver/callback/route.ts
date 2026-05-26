import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import axios from 'axios';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard/marketing/admin?error=naver_auth_failed', req.url));
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  
  if (!authData?.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Get tenant ID
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', authData.user.id)
    .limit(1)
    .single();

  if (!tenantUser?.tenant_id) {
    return NextResponse.redirect(new URL('/dashboard/marketing/admin?error=no_tenant', req.url));
  }

  // Load Naver Config from platform_config
  const { data: mkData } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "marketing_keys")
    .maybeSingle();
  
  const val = mkData?.value as { naver_client_id?: string; naver_client_secret?: string } | undefined;
  const clientId = val?.naver_client_id || process.env.NAVER_CLIENT_ID;
  const clientSecret = val?.naver_client_secret || process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/dashboard/marketing/admin?error=naver_not_configured', req.url));
  }

  try {
    // Exchange code for token
    const tokenRes = await axios.get('https://nid.naver.com/oauth2.0/token', {
      params: {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        state
      }
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    if (access_token) {
      // Save to tenant_naver_integrations
      await supabase.from('tenant_naver_integrations').upsert({
        tenant_id: tenantUser.tenant_id,
        access_token,
        refresh_token,
        expires_at: new Date(Date.now() + parseInt(expires_in) * 1000).toISOString(),
        is_connected: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id' });
    }

    return NextResponse.redirect(new URL('/dashboard/marketing/admin?success=naver_connected', req.url));
  } catch (err) {
    console.error("Naver Token Error", err);
    return NextResponse.redirect(new URL('/dashboard/marketing/admin?error=naver_token_failed', req.url));
  }
}
