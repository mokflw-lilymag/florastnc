const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkTenants() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

  const supabase = createClient(url, key);

  console.log(`Checking tenants in: ${url}`);
  
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*');

  if (error) {
    console.error('Error fetching tenants:', error);
    return;
  }

  console.log(`Found ${tenants.length} tenants:`);
  tenants.forEach(t => {
    console.log(`- ${t.id}: ${t.name}`);
  });
}

checkTenants();
