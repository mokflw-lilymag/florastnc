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
    
    // Delivery complete
    if (settings.emailTemplateDeliveryComplete && settings.emailTemplateDeliveryComplete.includes('<div style="padding: 40px 32px;">')) {
      settings.emailTemplateDeliveryComplete = settings.emailTemplateDeliveryComplete.replace('<div style="padding: 40px 32px;">', '<div style="padding: 40px 32px; text-align: center;">');
      needsUpdate = true;
    }
    // Production complete
    if (settings.emailTemplateProductionComplete && settings.emailTemplateProductionComplete.includes('<div style="padding: 40px 32px;">')) {
      settings.emailTemplateProductionComplete = settings.emailTemplateProductionComplete.replace('<div style="padding: 40px 32px;">', '<div style="padding: 40px 32px; text-align: center;">');
      needsUpdate = true;
    }
    // D-7
    if (settings.emailTemplateAnniversaryD7 && settings.emailTemplateAnniversaryD7.includes('<div style="padding: 32px 28px;">')) {
      settings.emailTemplateAnniversaryD7 = settings.emailTemplateAnniversaryD7.replace('<div style="padding: 32px 28px;">', '<div style="padding: 32px 28px; text-align: center;">');
      needsUpdate = true;
    }
    // Day Of
    if (settings.marketingEmailContentDayOf && settings.marketingEmailContentDayOf.includes('<div style="padding: 32px 28px;">')) {
      settings.marketingEmailContentDayOf = settings.marketingEmailContentDayOf.replace('<div style="padding: 32px 28px;">', '<div style="padding: 32px 28px; text-align: center;">');
      needsUpdate = true;
    }
    // First purchase
    if (settings.marketingEmailContentFirstPurchase && settings.marketingEmailContentFirstPurchase.includes('<div style="padding: 32px 28px;">')) {
      settings.marketingEmailContentFirstPurchase = settings.marketingEmailContentFirstPurchase.replace('<div style="padding: 32px 28px;">', '<div style="padding: 32px 28px; text-align: center;">');
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
