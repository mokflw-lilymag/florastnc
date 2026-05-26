import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolvePostizConfig, getPostizOAuthUrl } from '@/trigger/lib/postiz-client';
import { REVENUE_INTEGRATIONS_KEY } from '@/lib/revenue/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const integration = url.searchParams.get('integration') || 'instagram';

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  
  if (!authData?.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Load platform config for Postiz
  const { data: mkData } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", REVENUE_INTEGRATIONS_KEY)
    .maybeSingle();
  
  const val = mkData?.value as { postiz_api_url?: string; postiz_api_key?: string } | undefined;
  const config = resolvePostizConfig({
    apiUrl: val?.postiz_api_url,
    apiKey: val?.postiz_api_key ?? process.env.POSTIZ_API_KEY,
  });

  if (!config) {
    return NextResponse.redirect(new URL('/dashboard/marketing/admin?error=postiz_not_configured', req.url));
  }

  const result = await getPostizOAuthUrl(config, integration);
  
  if (result.ok && result.url) {
    // Redirect to Postiz OAuth Flow
    return NextResponse.redirect(result.url);
  }

  return NextResponse.redirect(new URL('/dashboard/marketing/admin?error=oauth_failed', req.url));
}
