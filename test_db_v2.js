const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function check() {
  // Query info schema to see column types
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'shop_settings' });
  if (error) {
     // fallback to direct query if rpc doesn't exist
     const { data: cols, error: err2 } = await supabase.from('shop_settings').select('count', { count: 'exact', head: true });
     console.log('Direct query check:', err2 || 'OK');
     
     // Try to fetch one row with specific columns to see if one is problematic
     const { data: sample, error: err3 } = await supabase.from('shop_settings').select('*').limit(1);
     console.log('Sample data check:', err3 || sample);
  } else {
     console.log('Table info:', data);
  }
}
check();
