/**
 * POS Webhook 수신 엔드포인트 (범용)
 * POST /api/pos/webhook/[provider]
 * 
 * provider: 'easycheck' | 'toss'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PosIntegrationService } from '@/services/pos/PosIntegrationService';
import { parseEasyCheckPayload } from '@/services/pos/parsers/EasyCheckParser';
import { parseTossPosPayload } from '@/services/pos/parsers/TossPosParser';
import {
  errApiInvalidJson,
  errApiMethodNotAllowed,
  errApiPosParseFailed,
  errApiPosProcessingFailed,
  errApiSignatureVerificationFailed,
  errApiStoreCodeMissing,
  errApiUnsupportedPosProvider,
  errApiWebhookConfigMissing,
  msgApiUnregisteredStoreIgnored,
} from '@/lib/admin/admin-api-errors';
import { hqApiUiBase } from '@/lib/hq/hq-api-locale';

// Service-role 클라이언트 (RLS 우회 - Webhook은 인증 없이 도달)
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    console.error('[POS Webhook][CONFIG_MISSING] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락');
    return null;
  }

  return createClient(
    url,
    serviceKey,
    { auth: { persistSession: false } }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const bl = await hqApiUiBase(request);
  const { provider } = await params;

  if (!['easycheck', 'toss'].includes(provider)) {
    return NextResponse.json({ error: errApiUnsupportedPosProvider(bl) }, { status: 400 });
  }

  // ── 원본 Body 읽기 (서명 검증용) ────────────────────────────────────────────
  const rawBody = await request.text();
  let parsedBody: any;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: errApiInvalidJson(bl) }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: errApiWebhookConfigMissing(bl), code: 'CONFIG_MISSING' },
      { status: 503 }
    );
  }

  // ── Tenant 식별 (헤더 또는 payload에서 store_code로 조회) ────────────────────
  const storeCode =
    request.headers.get('x-store-code') ||
    parsedBody.store_code ||
    parsedBody.storeCode ||
    parsedBody.store_id;

  if (!storeCode) {
    console.warn(`[POS Webhook] store_code를 찾을 수 없습니다. payload:`, parsedBody);
    return NextResponse.json({ error: errApiStoreCodeMissing(bl) }, { status: 400 });
  }

  // store_code로 tenant 조회
  const { data: integration, error: integrationError } = await supabase
    .from('pos_integrations')
    .select('*')
    .eq('store_code', storeCode)
    .eq('pos_type', provider)
    .eq('is_active', true)
    .maybeSingle();

  if (integrationError) {
    console.error(`[POS Webhook] 연동 정보 조회 DB 오류:`, integrationError);
  }

  if (!integration) {
    console.warn(`[POS Webhook] 등록되지 않은 상점 코드입니다: ${storeCode} (provider: ${provider})`);
    // 미등록 store_code는 조용히 무시 (보안상 상세 에러 노출 금지)
    return NextResponse.json(
      { received: true, note: 'unregistered_store', message: msgApiUnregisteredStoreIgnored(bl) },
      { status: 200 }
    );
  }

  // ── HMAC 서명 검증 ───────────────────────────────────────────────────────────
  const signature =
    request.headers.get('x-signature') ||
    request.headers.get('x-easycheck-signature') ||
    request.headers.get('toss-signature');

  if (integration.webhook_secret && signature) {
    const isValid = await PosIntegrationService.verifyWebhookSignature(
      rawBody,
      signature,
      integration.webhook_secret
    );
    if (!isValid) {
      console.warn(`[POS Webhook] 서명 검증 실패 - store: ${storeCode}`);
      return NextResponse.json({ error: errApiSignatureVerificationFailed(bl) }, { status: 401 });
    }
  }

  // ── Payload 파싱 (POS별 정규화) ──────────────────────────────────────────────
  let normalizedPayload;
  try {
    if (provider === 'easycheck') {
      normalizedPayload = parseEasyCheckPayload(parsedBody);
    } else if (provider === 'toss') {
      normalizedPayload = parseTossPosPayload(parsedBody);
    } else {
      throw new Error('알 수 없는 POS 유형');
    }
  } catch (err: unknown) {
    console.error(`[POS Webhook] 파싱 오류:`, err);
    return NextResponse.json(
      { error: errApiPosParseFailed(bl, (err as { message?: string })?.message) },
      { status: 422 }
    );
  }

  // ── 핵심 처리: 주문 생성 + 고객 매칭 + 포인트 적립 ────────────────────────────
  const result = await PosIntegrationService.processPosTransaction(
    supabase,
    integration.tenant_id,
    normalizedPayload,
    integration
  );

  if (!result.success && result.isNewTransaction) {
    console.error(`[POS Webhook] 처리 실패:`, result.errorMessage);
    return NextResponse.json({ error: errApiPosProcessingFailed(bl) }, { status: 500 });
  }

  console.log(`[POS Webhook] ✅ 처리 완료 - orderId: ${result.orderId}, new: ${result.isNewTransaction}`);

  return NextResponse.json({
    received: true,
    orderId: result.orderId,
    isNewTransaction: result.isNewTransaction
  }, { status: 200 });
}

// Webhook은 GET 허용 안 함
export async function GET(req: Request) {
  const bl = await hqApiUiBase(req);
  return NextResponse.json({ error: errApiMethodNotAllowed(bl) }, { status: 405 });
}
