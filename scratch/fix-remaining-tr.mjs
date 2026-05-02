import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const koToKey = JSON.parse(fs.readFileSync(path.join(__dirname, "tenant-flow-ko-to-key.json"), "utf8"));
const ROOT = path.resolve(__dirname, "../src/app/dashboard");
const DIRS = ["orders", "delivery", "customers", "external-orders"];

const reDouble = /tr\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\)/gs;
const reSingle = /tr\s*\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)/gs;

function unescD(s) {
  return s.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
}
function unescS(s) {
  return s.replace(/\\'/g, "'").replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.tsx$/.test(name)) acc.push(p);
  }
  return acc;
}

function fixFile(filePath) {
  let text = fs.readFileSync(filePath, "utf8");
  const orig = text;
  text = text.replace(reDouble, (full, koR, enR) => {
    const ko = unescD(koR);
    const key = koToKey[ko];
    if (key) return `tf.${key}`;
    return full;
  });
  text = text.replace(reSingle, (full, koR, enR) => {
    const ko = unescS(koR);
    const key = koToKey[ko];
    if (key) return `tf.${key}`;
    return full;
  });
  if (text !== orig) {
    fs.writeFileSync(filePath, text, "utf8");
    return true;
  }
  return false;
}

let n = 0;
for (const sub of DIRS) {
  for (const f of walk(path.join(ROOT, sub))) {
    if (fixFile(f)) {
      console.log("fixed", path.relative(ROOT, f));
      n++;
    }
  }
}
console.log("files:", n);
