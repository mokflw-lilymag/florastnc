/**
 * Ensures ribbon-phrase-desc-*.json files match en keys and per-category array lengths.
 * Run: node scripts/check-ribbon-phrase-desc-keys.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "src/i18n/messages");

const en = JSON.parse(fs.readFileSync(path.join(dir, "ribbon-phrase-desc-en.json"), "utf8"));
const enKeys = Object.keys(en).sort((a, b) => Number(a) - Number(b));
const LOCALES = ["ja", "zh", "vi", "es", "pt", "fr", "de", "ru"];
let failed = false;

for (const loc of LOCALES) {
  const file = `ribbon-phrase-desc-${loc}.json`;
  const p = path.join(dir, file);
  let j;
  try {
    j = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.error(file, String(e && e.message ? e.message : e));
    failed = true;
    continue;
  }
  const keys = Object.keys(j).sort((a, b) => Number(a) - Number(b));
  const missing = enKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !enKeys.includes(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`\n${file}:`);
    if (missing.length) console.error(`  missing keys: ${missing.join(", ")}`);
    if (extra.length) console.error(`  extra keys: ${extra.join(", ")}`);
    continue;
  }
  for (const k of enKeys) {
    const a = en[k];
    const b = j[k];
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      failed = true;
      console.error(`${file}: category "${k}" length en=${Array.isArray(a) ? a.length : "?"} vs ${Array.isArray(b) ? b.length : "?"}`);
    }
  }
}

if (failed) {
  console.error("\nribbon phrase desc parity FAILED");
  process.exit(1);
}
console.log(`ribbon phrase desc: ${LOCALES.length} locale files match en (${enKeys.length} categories).`);
