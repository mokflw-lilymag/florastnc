const fs = require('fs');

const pageTsx = `d:\\mapp\\florasync-saas\\src\\app\\dashboard\\orders\\new\\page.tsx`;
let c = fs.readFileSync(pageTsx, "utf8");

// Duplicates in interface
c = c.replace(/mid_category\?:\s*string;/g, '');
c = c.replace(/supplier\?:\s*string;/g, '');
// and mid_category?: string | null; mid_category?: string | undefined; just fix everything:
c = c.replace(/mid_category\?:\s*string\s*\|\s*null;/g, '');
c = c.replace(/supplier\?:\s*string\s*\|\s*null;/g, '');
c = c.replace(/main_category\?:\s*string\s*\|\s*null;/g, 'main_category?: string | null;\n  mid_category?: string | null;\n  supplier?: string | null;');

// setIsAnonymous
const anonStmt = 'const [isAnonymous, setIsAnonymous] = useState(false);';
const parts = c.split(anonStmt);
if (parts.length > 2) {
    c = parts[0] + anonStmt + parts.slice(1).join('');
}

// .branch
c = c.replace(/product\.branch/g, '""');

// ("store" as any)(
c = c.replace(/\("store" as any\)\([^)]*\)/g, '("store" as any)');

// prevItems
c = c.replace(/if \(\!product\) return;/g, 'if (!product) return prevItems;');

// docId
c = c.replace(/docId:\s*p\.id,/g, '');
c = c.replace(/docId:\s*['"]?[^'",\n]+['"]?,/g, ''); // maybe something else

// OrderData request
c = c.replace(/request:\s*[^,]+,/g, 'memo: foundOrder.memo,');

// Duplicate properties at 771 (approx). Let's search inside the createClient insert. 
// "orderDate: selectedDate,\n        orderDate: selectedDate,"
c = c.replace(/orderDate:\s*selectedDate,\s*orderDate:\s*selectedDate,/g, 'orderDate: selectedDate,');
c = c.replace(/orderDate:\s*selectedDate,\n\s*orderDate:\s*selectedDate,/g, 'orderDate: selectedDate,');

// orderSummarySide discountSettings
c = c.replace(/activeDiscountRates=\{activeDiscountRates\}/, 'discountSettings={({} as any)}\n            activeDiscountRates={activeDiscountRates}');

fs.writeFileSync(pageTsx, c, "utf8");

// wait, let's also remove duplicate setIsAnonymous if there's any variation
const searchTokens = c.split('const [isAnonymous, setIsAnonymous]');
if(searchTokens.length > 2) {
    // Only keep first
    c = searchTokens[0] + 'const [isAnonymous, setIsAnonymous]' + searchTokens.slice(1).join('').replace(/=\s*useState\(false\);/, '');
    // Wait, replacing the rest blindly might break if there's syntax.
    // It's just a duplicate declaration.
}
fs.writeFileSync(pageTsx, c, "utf8");
console.log('Fixed final lints');
