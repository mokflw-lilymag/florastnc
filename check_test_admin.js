const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkTestUser() {
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

  const user = authData.user;
  console.log('Logged in as:', user.email);

  // Check its profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Profile fetch failed:', profileError.message);
  } else {
    console.log('Profile:', JSON.stringify(profile, null, 2));
  }

  // If super_admin, try to list all profiles
  if (profile && profile.role === 'super_admin') {
     console.log('User is super_admin. fetching all profiles...');
     const { data: allProfiles } = await supabase.from('profiles').select('*');
     console.log('All profiles count:', allProfiles?.length);
     console.log('Profiles:', JSON.stringify(allProfiles, null, 2));
  } else {
     console.log('User is NOT super_admin.');
  }
}

checkTestUser();
