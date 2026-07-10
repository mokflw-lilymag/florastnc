import fs from 'fs';

let content = fs.readFileSync('src/app/dashboard/settings/components/EmailSettingsCard.tsx', 'utf8');

// 1. Add marketingAdTemplates to local state
content = content.replace(
  "marketingEmailContentFirstPurchase: settings.marketingEmailContentFirstPurchase || '',",
  "marketingEmailContentFirstPurchase: settings.marketingEmailContentFirstPurchase || '',\n    marketingAdTemplates: settings.marketingAdTemplates || [],"
);

content = content.replace(
  "marketingEmailAutoFirstPurchase: settings.marketingEmailAutoFirstPurchase ?? false,",
  "marketingEmailAutoFirstPurchase: settings.marketingEmailAutoFirstPurchase ?? false,\n      marketingAdTemplates: settings.marketingAdTemplates || [],"
);

// 2. Remove "전체 발송" from Anniversary Day Of
content = content.replace(
  /<Button size="sm" variant="outline" className="h-8 gap-2 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100" onClick=\{\(\) => handleBulkSend\('dayOf'\)\}>\s*<Send className="h-3\.5 w-3\.5" \/> 전체 발송\s*<\/Button>/g,
  ""
);

// Remove "전체 발송" from Anniversary D-7
content = content.replace(
  /<Button size="sm" variant="outline" className="h-8 gap-2 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100" onClick=\{\(\) => handleBulkSend\('d7'\)\}>\s*<Send className="h-3\.5 w-3\.5" \/> 전체 발송\s*<\/Button>/g,
  ""
);

// Remove "전체 발송" from First Purchase
content = content.replace(
  /<Button size="sm" variant="outline" className="h-8 gap-2 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100" onClick=\{\(\) => handleBulkSend\('firstPurchase'\)\}>\s*<Send className="h-3\.5 w-3\.5" \/> 전체 발송\s*<\/Button>/g,
  ""
);

fs.writeFileSync('src/app/dashboard/settings/components/EmailSettingsCard.tsx', content);
console.log('Patched');
