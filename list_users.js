const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function listUsers() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

  const supabase = createClient(url, key);

  console.log(`Checking all profiles in: ${url}`);
  
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*');

  if (profileError) {
    console.error('Error fetching profiles:', profileError);
    return;
  }

  console.log(`Found ${profiles.length} profiles:`);
  profiles.forEach(p => {
    console.log(`- ${p.email} (Tenant: ${p.tenant_id})`);
  });
}

listUsers();
