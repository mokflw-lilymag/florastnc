/**
 * Extract tr("ko", "en") and tr(`ko`, `en`) pairs from TSX (single-line only).
 * Run: node scratch/extract-tr-pairs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../src/app/dashboard");

const DIRS = [
  "orders",
  "delivery",
  "customers",
  "external-orders",
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(name)) acc.push(p);
  }
  return acc;
}

// tr("...", "...") or tr('...', '...')
const reDouble =
  /tr\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\)/g;
const reSingle =
  /tr\s*\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)/g;

const pairs = new Map(); // ko -> en (first wins)

for (const sub of DIRS) {
  const files = walk(path.join(ROOT, sub));
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const re of [reDouble, reSingle]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const ko = m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'");
        const en = m[2].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'");
        if (!pairs.has(ko)) pairs.set(ko, en);
      }
    }
  }
}

const out = Object.fromEntries([...pairs.entries()].sort((a, b) => a[0].localeCompare(b[0])));
fs.writeFileSync(
  path.join(__dirname, "tenant-flows-flat.json"),
  JSON.stringify(out, null, 2),
  "utf8"
);
console.log("pairs:", pairs.size, "→ scratch/tenant-flows-flat.json");
