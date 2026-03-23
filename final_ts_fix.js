const fs = require('fs');
const pagePath = `d:\\mapp\\florasync-saas\\src\\app\\dashboard\\orders\\new\\page.tsx`;
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Remove findCustomersByContact
content = content.replace(/const\s*\{\s*findCustomersByContact,\s*customers\s*\}\s*=\s*useCustomers\(\);?/g, 'const { customers } = useCustomers();');

// 2. Remove useDiscountSettings
content = content.replace(/const\s*\{\s*discountSettings,\s*getActiveDiscountRates\s*\}\s*=\s*useDiscountSettings\(\);?/g, '');

// 3. Replace Branch state
content = content.replace(/const\s*\[selectedBranch,\s*setSelectedBranch\]\s*=\s*useState<Branch\s*\|\s*null>\(null\);?/g, 'const [selectedBranch, setSelectedBranch] = useState<any | null>(null);');

// 4. Remove fetchProducts({ branch: ... }) if single branch? Yes, we can just fetchProducts() since branch isn't needed.
// It's inside a useEffect.
// 5. Remove 'branch' from Product and 'tenant_name' from Order
content = content.replace(/foundOrder\.tenant_name\b/g, '""');
content = content.replace(/product\.branch\b/g, '""');
content = content.replace(/order\.tenant_name\b/g, '""');

// 6. fix isAnonymous missing properties
content = content.replace(/isAnonymous,\s*orderType,\s*/g, '');

content = content.replace(/foundOrder\.message/g, '(foundOrder.message as any)');
content = content.replace(/\(foundOrder\.message\s*as\s*any\)\s*as\s*any/g, '(foundOrder.message as any)');

// 7. Remove docId from OrderItem
content = content.replace(/docId:\s*['"][^'"]*['"],/g, '');

// 8. Restore isAnonymous state
if (!content.includes('const [isAnonymous, setIsAnonymous]')) {
    content = content.replace(/const \[selectedBranch, setSelectedBranch\] = useState<any \| null>\(null\);/, 
        'const [selectedBranch, setSelectedBranch] = useState<any | null>(null);\n  const [isAnonymous, setIsAnonymous] = useState(false);');
}

// 9. Fix OrderData isAnonymous
content = content.replace(/isAnonymous:\s*isAnonymous,/g, '');

// 10. Fix multiple same properties
content = content.replace(/memo:\s*specialRequest,\s*memo:\s*specialRequest,/g, 'memo: specialRequest,');

// 11. Fix fetchProducts fetch argument
content = content.replace(/fetchProducts\(\{ branch: selectedBranch.name, pageSize: 1000 \}\);/g, 'fetchProducts();');

fs.writeFileSync(pagePath, content, 'utf8');
console.log('Fixed additional typescript errors.');
