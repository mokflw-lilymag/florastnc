const { createClient } = require('@supabase/supabase-js');

async function checkOtherProject() {
  const url = 'https://xphvycuaffifjgjaiqxe.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwaHZ5Y3VhZmZpZmpnamFpcXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjEyNDksImV4cCI6MjA4NDQ5NzI0OX0.a-M8c7B6SGHNzo-VwiImoNJvG8lysCk5I5KM9viU3bA';

  const supabase = createClient(url, key);

  console.log(`Checking OTHER project: ${url}`);
  
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*');

  if (error) {
    console.error('Error fetching tenants:', error.message);
    return;
  }

  console.log(`Found ${tenants.length} tenants in OTHER project.`);
  tenants.forEach(t => {
    console.log(`- ${t.id}: ${t.name}`);
  });
}

checkOtherProject();
