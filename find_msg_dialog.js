const fs = require('fs');
const content = fs.readFileSync('D:\\lilymagerp-v4_supa\\src\\app\\dashboard\\orders\\page.tsx', 'utf8');
const lines = content.split(/\r?\n/);
lines.forEach((line, index) => {
  if (line.includes('MessagePrintDialog')) {
    console.log(`${index + 1}: ${line}`);
  }
});
