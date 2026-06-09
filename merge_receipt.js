const fs = require('fs');
let code = fs.readFileSync('D:/mapp/floxync.com/bridge-app/index.js', 'utf8');

let erp = fs.readFileSync('D:/lilymagerp-v4_supa/bridge-app/index.js', 'utf8');
const erpStart = erp.indexOf('function generateHtmlReceipt');
const erpEnd = erp.indexOf('// 3. 메인 프로세스');
let erpFunc = erp.substring(erpStart, erpEnd);

// Modify erpFunc to support logo_html and Floxync payload format
erpFunc = erpFunc.replace('const { job_type, payload } = job;', 'const payload = job.payload || job.data;\n  const job_type = job.type || job.job_type;');
erpFunc = erpFunc.replace(`const rawOrderId = payload?.orderId || job.order_id || job.id || '';`, `const rawOrderId = payload?.orderId || payload?.id || job.order_id || job.id || '';`);
erpFunc = erpFunc.replace('const displayPhone = settings.branchPhone || globalBranchPhone;', `const displayPhone = settings.branchPhone || globalBranchPhone;\n\n  let logoHtml = '';\n  if (payload && payload.logo_url) {\n    logoHtml = \`<img src="\${payload.logo_url}" style="max-width: 120px; height: auto;" alt="Logo">\`;\n  } else {\n    logoHtml = \`<img src="https://ecimg.cafe24img.com/pg1472b45444056090/lilymagflower/web/upload/category/logo/v2_d13ecd48bab61a0269fab4ecbe56ce07_lZMUZ1lORo_top.jpg" style="max-width: 120px; height: auto;" alt="LilyMag Flower">\`;\n  }\n`);
erpFunc = erpFunc.replace(/\.replace\('\{\{shop_info\}\}', shopInfoStr\);/g, ".replace('{{shop_info}}', shopInfoStr)\n      .replace('{{logo_html}}', logoHtml);");
erpFunc = erpFunc.replace(/\.replace\('\{\{message_html\}\}', driverMessageHtml\)/g, ".replace('{{message_html}}', driverMessageHtml)\n      .replace('{{logo_html}}', logoHtml)");
erpFunc = erpFunc.replace(/\.replace\('\{\{message_html\}\}', msgHtml\);/g, ".replace('{{message_html}}', msgHtml)\n    .replace('{{logo_html}}', logoHtml);");

const floxStart = code.indexOf('function generateHtmlReceipt');
const floxEnd = code.indexOf('// 3. 메인 프로세스');
let before = code.substring(0, floxStart);
let after = code.substring(floxEnd || code.indexOf('async function start'));

fs.writeFileSync('D:/mapp/floxync.com/bridge-app/index.js', before + erpFunc + '\n// 3. 메인 프로세스\n' + after, 'utf8');
console.log('Success');
