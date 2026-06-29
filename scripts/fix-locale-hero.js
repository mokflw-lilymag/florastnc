const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '../src/i18n/messages');

const newHeroKeys = {
  subtitle: "FloXync AI secretary handles orders, printing & bookkeeping.\nAlways by your side — web, Windows, and mobile.",
  bubble1: "I'll auto-print order slips, pickup receipts & delivery forms.",
  bubble2: "I'll design ribbon text and print it for you too.",
  bubble3: "You can take orders right from your phone.",
  bubble4: "Leave the PC on and it prints at the counter automatically.",
  bubble5: "Just snap a receipt — I'll log it in the ledger.",
  bubble6: "I'll have today's closing summary ready for you.",
  applyBeta: "Apply for Beta",
  downloadWindows: "Download Windows App",
  devicePhone: "📱 Phone",
  devicePhoneDesc: "On-site orders · Pickup · Quick POS",
  devicePhoneSub: "Mobile web — no app install needed",
  devicePc: "🖥 PC",
  devicePcDesc: "Auto-print at counter · Offline",
  devicePcSub: "Windows App v0.1.2",
  deviceWeb: "🌐 Web",
  deviceWebDesc: "Orders · Delivery · Expenses · Closing",
  deviceWebSub: "From any browser, anywhere",
};

// Also update text for these locales
const localeUpdates = {
  en: {
    status: "FloXync AI Secretary · Free Beta",
    line1: "Flower shop owners,",
    line2: "you don't have to",
    line3: "do it all alone.",
    start: "Start for Free",
    demo: "See Features",
    manual: "Open full manual · no login required",
  },
};

const locales = ['en','de','fr','es','pt','ru','ar','id','ms','nl','it','vi','ja','zh','zh-TW','hi','th'];

let fixed = 0, skipped = 0;

for (const locale of locales) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { skipped++; continue; }

  // Read as buffer to detect BOM
  const buf = fs.readFileSync(filePath);
  let raw = buf.toString('utf8');
  // Strip BOM if present
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

  let data;
  try {
    data = JSON.parse(raw);
  } catch(e) {
    console.error(`❌ ${locale}: JSON parse failed - ${e.message}`);
    skipped++;
    continue;
  }

  if (!data.landing?.hero) { skipped++; continue; }

  // Inject new keys into hero
  Object.assign(data.landing.hero, newHeroKeys);

  // Apply locale-specific text overrides
  if (localeUpdates[locale]) {
    Object.assign(data.landing.hero, localeUpdates[locale]);
  }

  // Write back without BOM, with 2-space indent
  const output = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, output, { encoding: 'utf8' });
  console.log(`✅ ${locale} - updated`);
  fixed++;
}

console.log(`\nDone: ${fixed} updated, ${skipped} skipped`);
