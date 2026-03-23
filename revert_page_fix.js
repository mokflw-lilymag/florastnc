const fs = require('fs');
const path = 'd:/mapp/florasync-saas/src/app/dashboard/orders/new/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// Fix the aggressive replacement of ? with 수 for optional chaining
content = content.replace(/profile수\.tenants수\.name/g, 'profile?.tenants?.name');
content = content.replace(/Object\.keys\(row\.message\)수\.length/g, 'Object.keys(row.message)?.length');
content = content.replace(/msg수\.sender/g, 'msg?.sender');
content = content.replace(/row\.orderer수\.name/g, 'row.orderer?.name');
content = content.replace(/row\.extra_data수\.message/g, 'row.extra_data?.message');
content = content.replace(/parts\.pop\(\)수\.trim\(\)/g, 'parts.pop()?.trim()');
content = content.replace(/\.tenants수\.plan/g, '.tenants?.plan'); 
content = content.replace(/profile수\.role/g, 'profile?.role');
content = content.replace(/profile수\.tenants수\.name/g, 'profile?.tenants?.name');

// Fix comments and title/description corruption I introduced
// Re-read a clean version of those strings if possible? 
// Or just regex replace the "수" blocks back to something readable.

// Instead of guessing, I'll try to find any "수" followed by weird chars and fix them.
// But mostly just fix the code-breaking ones above.

fs.writeFileSync(path, content, 'utf8');
console.log('Revert fix applied');
