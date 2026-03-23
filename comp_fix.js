const fs = require('fs');
const path = require('path');

const baseDir = `d:\\mapp\\florasync-saas\\src\\app\\dashboard\\orders\\new\\components`;

// 1. Fix customer-search.tsx
const custSearch = path.join(baseDir, "customer-search.tsx");
if (fs.existsSync(custSearch)) {
    let c = fs.readFileSync(custSearch, "utf8");
    c = c.replace(/import\s*\{\s*Customer\s*\}\s*from\s*['"]@\/hooks\/use-customers['"];?/g, '');
    c = c.replace(/import\s*\{\s*Customer\s*\}\s*from\s*['"]@\/types\/customer['"];;?/g, 'import { Customer } from "@/types/customer";');
    fs.writeFileSync(custSearch, c, "utf8");
}

// 2. Fix CustomerSection.tsx
const custSec = path.join(baseDir, "CustomerSection.tsx");
if (fs.existsSync(custSec)) {
    let c = fs.readFileSync(custSec, "utf8");
    c = c.replace(/import\s*\{\s*Customer\s*\}\s*from\s*['"]@\/hooks\/use-customers['"];?/g, '');
    c = c.replace(/import\s*\{\s*Customer\s*\}\s*from\s*['"]@\/types\/customer['"];;?/g, 'import { Customer } from "@/types/customer";');
    c = c.replace(/import\s*\{\s*useBranches\s*\}\s*from\s*['"]@\/hooks\/use-branches['"];?/g, '');
    c = c.replace(/const\s*\{\s*branches\s*\}[\s\S]*?useBranches\(\);?/, 'const branches: any[] = [];');
    fs.writeFileSync(custSec, c, "utf8");
}

// 3. Fix FulfillmentSection.tsx
const fulfSec = path.join(baseDir, "FulfillmentSection.tsx");
if (fs.existsSync(fulfSec)) {
    let c = fs.readFileSync(fulfSec, "utf8");
    c = c.replace(/import\s*\{\s*Textarea\s*\}\s*from\s*['"]@\/components\/ui\/textarea['"];?/g, 'import { Textarea } from "@/components/ui/textarea";');
    c = c.replace(/import Textarea/g, 'import { Textarea }');
    c = c.replace(/asChild=\{true\}/g, 'asChild');
    c = c.replace(/<Button variant="outline" className="w-\[120px\] justify-start text-left font-normal" asChild>/g, 
                  '<Button variant="outline" className="w-[120px] justify-start text-left font-normal">');
    c = c.replace(/onValueChange=\{\(time:\s*string\)/g, 'onValueChange={(time: string | null)');
    c = c.replace(/\(e\)\s*=>/g, '(e: any) =>');
    c = c.replace(/catch\s*\(\s*e\s*\)\s*\{/g, 'catch (e: any) {');
    fs.writeFileSync(fulfSec, c, "utf8");
}

// 4. Fix OrderSummarySide.tsx
const ordSum = path.join(baseDir, "OrderSummarySide.tsx");
if (fs.existsSync(ordSum)) {
    let c = fs.readFileSync(ordSum, "utf8");
    c = c.replace(/import\s*\{\s*Product\s*\}\s*from\s*['"]@\/hooks\/use-products['"];?/g, '');
    c = c.replace(/import\s*\{\s*Product\s*\}\s*from\s*['"]@\/types\/product['"];;?/g, 'import { Product } from "@/types/product";');
    fs.writeFileSync(ordSum, c, "utf8");
}

// 5. Fix ProductSection.tsx
const prodSec = path.join(baseDir, "ProductSection.tsx");
if (fs.existsSync(prodSec)) {
    let c = fs.readFileSync(prodSec, "utf8");
    c = c.replace(/import\s*\{\s*Product\s*\}\s*from\s*['"]@\/hooks\/use-products['"];?/g, '');
    c = c.replace(/import\s*\{\s*Product\s*\}\s*from\s*['"]@\/types\/product['"];;?/g, 'import { Product } from "@/types/product";');
    fs.writeFileSync(prodSec, c, "utf8");
}

// 6. page.tsx fixes
const pageTsx = `d:\\mapp\\florasync-saas\\src\\app\\dashboard\\orders\\new\\page.tsx`;
if (fs.existsSync(pageTsx)) {
    let c = fs.readFileSync(pageTsx, "utf8");
    
    // remove duplicate setIsAnonymous
    const isAnonStmt = 'const [isAnonymous, setIsAnonymous] = useState(false);';
    c = c.replace(new RegExp(isAnonStmt + '\\s*' + isAnonStmt, 'g'), isAnonStmt);
    let parts = c.split(isAnonStmt);
    if (parts.length > 2) {
        c = parts[0] + isAnonStmt + parts.slice(1).join('');
    }
    
    // discount settings
    c = c.replace(/getActiveDiscountRates/g, '(() => [])');
    c = c.replace(/discountSettings\./g, '({} as any).');
    
    // main_category string | null -> string | undefined
    c = c.replace(/main_category\?:\s*string;/g, 'main_category?: string | null;\n  mid_category?: string | null;');
    
    // branch, tenant_name
    c = c.replace(/foundOrder\.branch/g, '""');
    c = c.replace(/product\.branch/g, '""');
    c = c.replace(/order\.tenant_name/g, '""');
    
    // properties not on Order
    c = c.replace(/order\.isAnonymous/g, 'false');
    c = c.replace(/order\.orderType/g, '""');
    c = c.replace(/foundOrder\.orderType/g, '""');
    c = c.replace(/foundOrder\.isAnonymous/g, 'false');
    c = c.replace(/order\.request/g, 'order.memo');
    c = c.replace(/foundOrder\.request/g, 'foundOrder.memo');
    
    c = c.replace(/(if \(\!product\) return;)[\s\S]*?(return prevItems\.map)/g, '$1 return prevItems; $2');
    
    // docId
    c = c.replace(/docId:\s*p\.docId,/g, 'docId: p.id,');
    c = c.replace(/docId:\s*p\.id,/g, '');
    
    c = c.replace(/isAnonymous:\s*isAnonymous\s*as\s*any,/g, '');
    
    c = c.replace(/orderDate:\s*selectedDate,\n\s*orderDate:\s*selectedDate,/g, 'orderDate: selectedDate,');

    fs.writeFileSync(pageTsx, c, "utf8");
}

console.log("Done sub-component fixes");
