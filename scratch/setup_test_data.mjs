import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function setupTestData() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = (env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/))[1].trim();
  const supabase = createClient(url, key);

  console.log('--- Setting Up Test Data ---');

  // 1. 테넌트 생성 (또는 조회)
  let tenantId;
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('name', '테스트 화원')
    .maybeSingle();

  if (existingTenant) {
    tenantId = existingTenant.id;
    console.log('Tenant already exists:', tenantId);
  } else {
    const { data: newTenant, error: tErr } = await supabase
      .from('tenants')
      .insert({ name: '테스트 화원', plan: 'pro' })
      .select('id')
      .single();
    if (tErr) throw tErr;
    tenantId = newTenant.id;
    console.log('New Tenant created:', tenantId);
  }

  // 2. 고객 생성 (01012345678)
  const { data: customer, error: cErr } = await supabase
    .from('customers')
    .upsert({
      tenant_id: tenantId,
      name: '홍길동',
      contact: '01012345678',
      points: 1000,
      total_spent: 0,
      order_count: 0
    }, { onConflict: 'tenant_id,contact' })
    .select('id')
    .single();
  if (cErr) throw cErr;
  console.log('Test Customer ensured:', customer.id);

  // 3. POS 연동 설정 등록
  const { error: iErr } = await supabase
    .from('pos_integrations')
    .upsert({
      tenant_id: tenantId,
      pos_type: 'easycheck',
      store_code: 'STORE_001',
      webhook_secret: 'test_secret_123',
      auto_create_customer: true,
      auto_point_rate: 1.0,
      is_active: true
    }, { onConflict: 'tenant_id' });
  if (iErr) throw iErr;
  console.log('POS Integration configured (EasyCheck / STORE_001)');

  // 4. 카카오 배송 테스트용 주문 생성
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .insert({
      tenant_id: tenantId,
      order_number: 'ORD-KAKAO-001',
      orderer: { name: '홍길동', contact: '01012345678' },
      status: 'pending',
      delivery_tracking_id: 'TRACK_001', // 웹훅 매칭 키
      delivery_provider_status: 'ready'
    })
    .select('id')
    .single();
  if (oErr) throw oErr;
  console.log('Mock Order for Kakao T created (Tracking ID: TRACK_001)');

  console.log('--- Setup Complete ---');
}

setupTestData().catch(err => console.error('Setup failed:', err.message));
