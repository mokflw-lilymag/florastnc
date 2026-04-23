import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateWebhookUrl() {
  // 기존 설정 가져오기
  const { data: config } = await supabase
    .from('platform_config')
    .select('value')
    .eq('key', 'marketing_keys')
    .maybeSingle();

  const newValue = {
    ...(config?.value || {}),
    n8n_webhook_url: 'http://localhost:5678/webhook/marketing-ultra-v5'
  };

  const { error } = await supabase
    .from('platform_config')
    .upsert({
      key: 'marketing_keys',
      value: newValue,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error('웹훅 주소 업데이트 오류:', error);
  } else {
    console.log('✅ n8n 로컬 웹훅 주소가 DB에 저장되었습니다: http://localhost:5678/webhook/marketing-ultra-v5');
  }
}

updateWebhookUrl();
