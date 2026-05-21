import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { errApiRequiredParamsMissing, errApiPublishDispatchFailed } from '@/lib/admin/admin-api-errors';
import { hqApiUiBase } from '@/lib/hq/hq-api-locale';
import { resolveEffectiveTenantId } from '@/lib/revenue/resolve-tenant';
import { publishMarketingContent } from '@/lib/revenue/publish-service';

/** POST — Trigger.dev + Postiz (n8n 제거, Phase 2) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const bl = await hqApiUiBase(req, typeof body?.uiLocale === 'string' ? body.uiLocale : undefined);
    const { platform, title, content, imageUrl } = body as {
      platform?: string;
      title?: string;
      content?: string;
      imageUrl?: string;
    };

    if (!platform || !content) {
      return NextResponse.json({ error: errApiRequiredParamsMissing(bl) }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const tenantId = await resolveEffectiveTenantId(supabase, user.id);
    if (!tenantId) {
      return NextResponse.json({ error: 'TENANT_REQUIRED' }, { status: 400 });
    }

    const db = createAdminClient() ?? supabase;
    const result = await publishMarketingContent(db, {
      tenantId,
      platform,
      title,
      content,
      imageUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message ?? errApiPublishDispatchFailed(bl), code: result.error, fallback: result.fallback },
        { status: result.fallback ? 503 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      channel: result.channel,
      postizPostId: result.postizPostId,
      draftId: result.draftId,
    });
  } catch (error: unknown) {
    console.error('Publish API Error:', error);
    const bl = await hqApiUiBase(req);
    return NextResponse.json({
      error: errApiPublishDispatchFailed(bl),
      details: (error as { message?: string })?.message,
    }, { status: 500 });
  }
}
