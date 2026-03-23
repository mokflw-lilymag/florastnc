const fs = require('fs');

const pagePath = `d:\\mapp\\florasync-saas\\src\\app\\dashboard\\orders\\new\\page.tsx`;
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Replace sonner
content = content.replace(/import\s*\{\s*toast\s*\}\s*from\s*["']@\/components\/ui\/use-toast["'];?/g, '');
content = content.replace(/import\s*\{\s*useToast\s*\}\s*from\s*["']@\/hooks\/use-toast["'];?/g, '');
content = content.replace(/\/\/\s*import\s*\{\s*useToast\s*\}\s*from\s*["']@\/hooks\/use-toast["'];?/g, '');

if (!content.includes('import { toast } from "sonner";')) {
    content = content.replace('import { Loader2 } from "lucide-react";', 'import { Loader2 } from "lucide-react";\nimport { toast } from "sonner";');
}
content = content.replace(/const\s*\{\s*toast\s*\}\s*=\s*useToast\(\);?/g, '');

// Update toast calls
content = content.replace(/toast\(\{[\s\S]*?variant:\s*["']destructive["'],[\s\S]*?title:\s*(["'].*?["']),[\s\S]*?description:\s*(["'].*?["'`])[\s\S]*?\}\)/g, 'toast.error($1, { description: $2 })');
content = content.replace(/toast\(\{[\s\S]*?title:\s*(["'].*?["']),[\s\S]*?description:\s*(["'].*?["'`])[\s\S]*?\}\)/g, 'toast.success($1, { description: $2 })');

// 2. Fix other missing TS imports and types
content = content.replace(/interface OrderItem extends Product\s*\{[\s\S]*?\}/g, 
    `interface OrderItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
  isCustomProduct?: boolean;
  main_category?: string;
  mid_category?: string;
  supplier?: string;
}`);

// Fix remaining instances of 'c' parameter any types
content = content.replace(/\(c\)\s*=>/g, '(c: any) =>');
content = content.replace(/\(df\)\s*=>/g, '(df: any) =>');
content = content.replace(/df\s*=>/g, '(df: any) =>');
content = content.replace(/\(e\)\s*=>/g, '(e: any) =>');

// Fix branch id and branch name which might be on 'foundOrder' but shouldn't be extracted
content = content.replace(/foundOrder\.branchId/g, 'foundOrder.tenant_id');
content = content.replace(/foundOrder\.branchName/g, '""');
content = content.replace(/order\.branchId/g, 'order.tenant_id');
content = content.replace(/order\.branchName/g, '""');

// Some other missing Order and OrderData properties
content = content.replace(/isAnonymous,\s*/g, '');
content = content.replace(/orderType,\s*\/\/\s*Default store\s*/g, '');
content = content.replace(/request:\s*specialRequest/g, 'memo: specialRequest');

// Remove unused
content = content.replace(/const\s*useDiscountSettings\s*=\s*\(\)\s*=>\s*(\{.*?\});/g, '');

// Fix missing properties on message payload
content = content.replace(/const\s*message\s*=\s*\{/g, 'const message = { type: messageType as any, ');

fs.writeFileSync(pagePath, content, 'utf8');
console.log("Done");
