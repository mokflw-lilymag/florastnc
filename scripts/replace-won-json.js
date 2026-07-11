const fs = require('fs');
const glob = require('glob');
const path = require('path');

const dir = 'src/i18n/messages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let count = 0;
for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('₩')) {
    // In JSON, we can replace ₩ with {currencySymbol}
    content = content.replace(/₩/g, '{currencySymbol}');
    fs.writeFileSync(filePath, content, 'utf8');
    count++;
    console.log(`Updated ${file}`);
  }
}
console.log(`Total JSON files updated: ${count}`);
