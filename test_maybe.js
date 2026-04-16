const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function check() {
  console.log('Testing maybeSingle() on empty table');
  const { data, error, status } = await supabase
    .from('shop_settings')
    .select('*')
    .eq('user_id', 'non-existent-id')
    .maybeSingle();
  console.log('maybeSingle() status:', status);
  if (error) console.log('Error:', error);
  else console.log('Data:', data);
}
check();
