const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function check() {
  console.log('Testing shop_settings with Accept: application/vnd.pgrst.object+json');
  try {
    const { data, error, status } = await supabase
      .from('shop_settings')
      .select('*')
      .limit(1)
      .single();
    console.log('single() status:', status);
    if (error) console.log('single() error:', error);
  } catch (e) {
    console.log('single() exception:', e.message);
  }
}
check();
