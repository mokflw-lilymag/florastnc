/**
 * Replace tr("ko","en") / tr('ko','en') with tf.f***** in dashboard scope files.
 * Run after: node scratch/build-tenant-flows.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../src/app/dashboard");
const flat = JSON.parse(fs.readFileSync(path.join(__dirname, "tenant-flows-flat.json"), "utf8"));
const koToKey = JSON.parse(fs.readFileSync(path.join(__dirname, "tenant-flow-ko-to-key.json"), "utf8"));

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

function replaceInFile(filePath) {
  let text = fs.readFileSync(filePath, "utf8");
  const orig = text;

  text = text.replace(reDouble, (full, koR, enR) => {
    const ko = unescD(koR);
    const en = unescD(enR);
    const key = koToKey[ko];
    if (key && flat[ko] === en) return `tf.${key}`;
    return full;
  });

  text = text.replace(reSingle, (full, koR, enR) => {
    const ko = unescS(koR);
    const en = unescS(enR);
    const key = koToKey[ko];
    if (key && flat[ko] === en) return `tf.${key}`;
    return full;
  });

  // Remove tr helper definitions (common patterns)
  text = text.replace(
    /^\s*const tr = \(ko(?:Text)?: string, en(?:Text)?: string\) => \(isKo \? ko(?:Text)? : en(?:Text)?\);\s*\r?\n/gm,
    ""
  );
  text = text.replace(
    /^\s*const tr = \(koText: string, enText: string\) => \(isKo \? koText : enText\);\s*\r?\n/gm,
    ""
  );
  text = text.replace(
    /^\s*const tr = \(koText: string, enText: string\) => \(baseLocale === "ko" \? koText : enText\);\s*\r?\n/gm,
    ""
  );

  if (text === orig) return false;

  // Add getMessages import if tf. is used
  if (/\btf\.\w+/.test(text) && !text.includes("@/i18n/getMessages")) {
    const insertAt = text.startsWith('"use client"') ? text.indexOf("\n") + 1 : 0;
    const importLine = `import { getMessages } from "@/i18n/getMessages";\n`;
    text = text.slice(0, insertAt) + importLine + text.slice(insertAt);
  }

  // Inject const tf after each usePreferredLocale() when this scope uses tf.
  if (/\btf\.\w+/.test(text)) {
    let pos = 0;
    const needle = "const locale = usePreferredLocale();";
    while (true) {
      const m = text.indexOf(needle, pos);
      if (m === -1) break;
      const after = text.slice(m, m + needle.length + 80);
      if (!after.includes("getMessages(locale).tenantFlows")) {
        const end = m + needle.length;
        const lineStart = text.lastIndexOf("\n", m - 1) + 1;
        const indent = text.slice(lineStart, m).match(/^\s*/)[0] || "  ";
        text = text.slice(0, end) + `\n${indent}const tf = getMessages(locale).tenantFlows;` + text.slice(end);
        pos = end + 50;
      } else {
        pos = m + needle.length;
      }
    }
  }

  fs.writeFileSync(filePath, text, "utf8");
  return true;
}

let n = 0;
for (const sub of DIRS) {
  for (const file of walk(path.join(ROOT, sub))) {
    if (replaceInFile(file)) {
      console.log("rewrote", path.relative(ROOT, file));
      n++;
    }
  }
}
console.log("files changed:", n);
