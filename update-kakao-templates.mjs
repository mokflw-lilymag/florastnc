import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: records, error } = await supabase.from('system_settings').select('id, data').like('id', 'settings_%');
  if (error) {
    console.error(error);
    return;
  }
  
  let updatedCount = 0;
  for (const record of records) {
    let settings = record.data || {};
    let needsUpdate = false;
    
    if (settings.kakaoTemplateDeliveryComplete && settings.kakaoTemplateDeliveryComplete.includes('이용해 주셔서 감사합니다! {사진링크}')) {
      delete settings.kakaoTemplateDeliveryComplete;
      needsUpdate = true;
    }
    if (settings.kakaoTemplateProductionComplete && settings.kakaoTemplateProductionComplete.includes('예쁘게 제작 완료되었습니다! {사진링크}')) {
      delete settings.kakaoTemplateProductionComplete;
      needsUpdate = true;
    }
    if (settings.marketingKakaoTemplateDayOf && settings.marketingKakaoTemplateDayOf.includes('행복한 하루 보내시길 바랍니다! - {회사명} 올림')) {
      delete settings.marketingKakaoTemplateDayOf;
      needsUpdate = true;
    }
    if (settings.marketingKakaoTemplateDaysBefore7 && settings.marketingKakaoTemplateDaysBefore7.includes('회사명}에서 도와드릴게요!')) {
      delete settings.marketingKakaoTemplateDaysBefore7;
      needsUpdate = true;
    }
    if (settings.marketingKakaoTemplateFirstPurchase && settings.marketingKakaoTemplateFirstPurchase.includes('앞으로도 정성을 다하는 {회사명}이 되겠습니다.')) {
      delete settings.marketingKakaoTemplateFirstPurchase;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      console.log(`Updating setting record ${record.id}`);
      await supabase.from('system_settings').update({ data: settings }).eq('id', record.id);
      updatedCount++;
    }
  }
  console.log(`Updated ${updatedCount} setting records.`);
}

run();
