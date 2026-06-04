require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in ../.env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching tenants...");
  const { data: tenants, error: err1 } = await supabase.from('tenants').select('*');
  if (err1) {
    console.error("Error fetching tenants:", err1);
    return;
  }
  
  const ncTenant = tenants.find(t => t.name && t.name.includes('NC'));
  if (!ncTenant) {
    console.log("Could not find NC Eastpole tenant.");
    return;
  }
  
  console.log(`Found NC Tenant: ${ncTenant.name} (ID: ${ncTenant.id})`);
  
  const { data: products, error: err2 } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', ncTenant.id);
    
  if (err2) {
     console.error("Error fetching products:", err2);
     return;
  }
  
  console.log(`Found ${products.length} products for this tenant.`);
  
  // Find duplicates by name
  const nameMap = {};
  const duplicates = [];
  const toKeep = [];
  const toDelete = [];
  
  products.forEach(p => {
    if (!nameMap[p.name]) {
      nameMap[p.name] = [];
    }
    nameMap[p.name].push(p);
  });
  
  for (const [name, items] of Object.entries(nameMap)) {
    if (items.length > 1) {
      // Sort by updated_at descending, so the newest is first
      items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      toKeep.push(items[0]);
      for (let i = 1; i < items.length; i++) {
        toDelete.push(items[i]);
      }
      duplicates.push({ name, count: items.length });
    }
  }
  
  console.log(`Found ${duplicates.length} unique names with duplicates.`);
  console.log(`Total duplicate rows to delete: ${toDelete.length}`);
  
  if (toDelete.length > 0) {
    console.log("Deleting duplicates...");
    // Split into chunks of 100 for deletion
    const chunkSize = 100;
    for (let i = 0; i < toDelete.length; i += chunkSize) {
      const chunk = toDelete.slice(i, i + chunkSize).map(p => p.id);
      const { error: delErr } = await supabase.from('products').delete().in('id', chunk);
      if (delErr) {
        console.error("Error deleting chunk:", delErr);
      } else {
        console.log(`Deleted chunk ${i / chunkSize + 1}`);
      }
    }
    console.log("Successfully deleted all duplicates.");
  } else {
    console.log("No duplicates found.");
  }
}

check();
