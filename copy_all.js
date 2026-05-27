const fs = require('fs');
const path = require('path');

const srcBase = 'D:\\lilymagerp-v4_supa\\src';
const tgtBase = 'D:\\mapp\\floxync.com\\src';

const dirsToCopy = [
  'app\\dashboard\\orders\\new-mobile',
  'app\\dashboard\\pickup-delivery',
  'app\\dashboard\\pos\\quick',
  'hooks\\use-simple-expenses.ts',
  'types\\simple-expense.ts',
  'lib\\excel-export.ts', // Might overwrite, we will just copy missing functions manually later, so let's skip lib/excel-export.ts for now.
  'lib\\alimtalk-service.ts',
  'lib\\storage-manager.ts'
];

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName),
                        path.join(dest, childItemName));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    
    // Apply replacements for ts/tsx
    if (dest.endsWith('.ts') || dest.endsWith('.tsx')) {
        let content = fs.readFileSync(dest, 'utf8');
        content = content.replace(/import \{ supabase \} from "@\/lib\/supabase";/g, "import { createClient } from '@/utils/supabase/client';\nconst supabase = createClient();");
        content = content.replace(/import \{ supabase \} from "@\/lib\/supabase"/g, "import { createClient } from '@/utils/supabase/client';\nconst supabase = createClient();");
        content = content.replace(/'branch_id'/g, "'tenant_id'");
        content = content.replace(/branch_id:/g, "tenant_id:");
        content = content.replace(/branchName/g, "tenantName");
        content = content.replace(/branch_name/g, "tenant_name");
        content = content.replace(/actualDeliveryCostCash/g, "actual_delivery_cost_cash");
        content = content.replace(/actualDeliveryCost/g, "actual_delivery_cost");
        content = content.replace(/receiptType/g, "receipt_type");
        content = content.replace(/pickupInfo/g, "pickup_info");
        content = content.replace(/deliveryInfo/g, "delivery_info");
        content = content.replace(/orderDate/g, "order_date");
        content = content.replace(/import \{ Textarea \} from "@\/components\/ui\/textarea"/g, "import Textarea from \"@/components/ui/textarea\"");
        fs.writeFileSync(dest, content);
    }
  }
}

dirsToCopy.forEach(dir => {
    if (dir === 'lib\\excel-export.ts') return;
    const src = path.join(srcBase, dir);
    const dest = path.join(tgtBase, dir);
    if (fs.existsSync(src)) {
        copyRecursiveSync(src, dest);
        console.log('Copied ' + dir);
    }
});
