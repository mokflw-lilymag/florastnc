import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = url.origin; // e.g., http://localhost:3000

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  
  if (!authData?.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Load Naver Client ID from platform_config
  const { data: mkData } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "marketing_keys")
    .maybeSingle();
  
  const val = mkData?.value as { naver_client_id?: string } | undefined;
  const clientId = val?.naver_client_id || process.env.NAVER_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(new URL('/dashboard/marketing/admin?error=naver_not_configured', req.url));
  }

  const redirectUri = `${host}/api/auth/naver/callback`;
  const state = Math.random().toString(36).substring(2, 15);

  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return NextResponse.redirect(naverAuthUrl);
}
