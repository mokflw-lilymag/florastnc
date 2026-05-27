require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
async function test() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/rest/v1/print_jobs?select=*&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
