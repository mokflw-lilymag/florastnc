import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateToV6() {
  const { data: config } = await supabase
    .from('platform_config')
    .select('value')
    .eq('key', 'marketing_keys')
    .maybeSingle();

  const newValue = {
    ...(config?.value || {}),
    n8n_webhook_url: 'http://localhost:5678/webhook/marketing-v6'
  };

  await supabase
    .from('platform_config')
    .upsert({
      key: 'marketing_keys',
      value: newValue,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  console.log('✅ 웹훅 주소가 V6 경로로 업데이트되었습니다: http://localhost:5678/webhook/marketing-v6');
}

updateToV6();
