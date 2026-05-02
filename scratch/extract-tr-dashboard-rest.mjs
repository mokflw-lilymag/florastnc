import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../src/app/dashboard");
const SKIP = new Set(["orders", "delivery", "customers", "external-orders"]);

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const rel = path.relative(ROOT, p);
    const firstSeg = rel.split(path.sep)[0];
    if (SKIP.has(firstSeg)) continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(name)) acc.push(p);
  }
  return acc;
}

const reDouble = /tr\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\)/g;
const reSingle = /tr\s*\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)/g;

function unescD(s) {
  return s.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
}
function unescS(s) {
  return s.replace(/\\'/g, "'").replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
}

const pairs = new Map();
for (const file of walk(ROOT)) {
  const text = fs.readFileSync(file, "utf8");
  for (const re of [reDouble, reSingle]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const ko = re === reDouble ? unescD(m[1]) : unescS(m[1]);
      const en = re === reDouble ? unescD(m[2]) : unescS(m[2]);
      if (!pairs.has(ko)) pairs.set(ko, en);
    }
  }
}

const out = Object.fromEntries([...pairs.entries()].sort((a, b) => a[0].localeCompare(b[0], "ko")));
fs.writeFileSync(path.join(__dirname, "tenant-flows-flat-rest.json"), JSON.stringify(out, null, 2) + "\n");
console.log("rest pairs:", pairs.size);
