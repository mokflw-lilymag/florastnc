const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function getTenantsAsTestUser() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

  const supabase = createClient(url, key);
  
  // Login as test@test.com
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@test.com',
    password: '123456'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }

  // Use the session to query tenants
  const { data: tenants, error: tenantError } = await supabase
    .from('tenants')
    .select('*');

  if (tenantError) {
    console.error('Tenant fetch failed:', tenantError.message);
  } else {
    console.log('Tenants found:', JSON.stringify(tenants, null, 2));
  }
}

getTenantsAsTestUser();
