const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function debugSettings() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

  const supabase = createClient(url, key);
  const targetEmail = 'lilymagnc@gmail.com';

  console.log(`Checking profile for: ${targetEmail}`);
  
  // 1. Find the user profile
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', targetEmail);

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('No profile found for this email.');
    return;
  }

  const profile = profiles[0];
  console.log('Profile found:', JSON.stringify(profile, null, 2));

  const tid = profile.tenant_id;
  if (!tid) {
    console.log('No tenant_id associated with this profile.');
    return;
  }

  // 2. Check system_settings
  console.log(`Checking system_settings for tenant_id: ${tid}`);
  const { data: systemSettings, error: ssError } = await supabase
    .from('system_settings')
    .select('*')
    .eq('tenant_id', tid);

  if (ssError) {
    console.error('Error fetching system_settings:', ssError);
  } else {
    console.log('system_settings entries count:', systemSettings.length);
    console.log('system_settings IDs:', systemSettings.map(s => s.id));
    const general = systemSettings.find(s => s.id === `settings_${tid}` || s.id === 'general');
    if (general) {
       console.log('General settings found:', JSON.stringify(general.data, null, 2));
    } else {
       console.log('No general settings record found for this tenant.');
    }
  }

  // 3. Check shop_settings (just in case)
  console.log(`Checking shop_settings for tenant_id: ${tid}`);
  const { data: shopSettings, error: shopError } = await supabase
    .from('shop_settings')
    .select('*')
    .eq('tenant_id', tid);

  if (shopError) {
    // console.error('Error fetching shop_settings:', shopError.message);
  } else {
    console.log('shop_settings found:', JSON.stringify(shopSettings, null, 2));
  }
}

debugSettings();
