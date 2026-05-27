const fs = require('fs');
const path = require('path');

const srcDir = 'D:\\lilymagerp-v4_supa\\src\\app\\dashboard';
const tgtDir = 'D:\\mapp\\floxync.com\\src\\app\\dashboard';
const files = [
  'orders\\new-mobile\\page.tsx',
  'pickup-delivery\\page.tsx',
  'pos\\quick\\page.tsx'
];

files.forEach(f => {
  const src = path.join(srcDir, f);
  const tgt = path.join(tgtDir, f);
  fs.mkdirSync(path.dirname(tgt), { recursive: true });
  let content = fs.readFileSync(src, 'utf8');
  content = content.replace(/import \{ supabase \} from "@\/lib\/supabase";/g, "import { createClient } from '@/utils/supabase/client';\nconst supabase = createClient();");
  content = content.replace(/'branch_id'/g, "'tenant_id'");
  content = content.replace(/branch_id:/g, "tenant_id:");
  content = content.replace(/branchName/g, "tenantName");
  fs.writeFileSync(tgt, content);
  console.log('Migrated ' + f);
});
