/**
 * Generates dashboard-ja.json / dashboard-zh.json from dashboard-en.json
 * using google-translate-api-x (no API key; for local regen only).
 *
 * Run: node scripts/generate-dashboard-ja-zh-google.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import translate from "google-translate-api-x";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const enPath = path.join(root, "src/i18n/messages/dashboard-en.json");
const jaOut = path.join(root, "src/i18n/messages/dashboard-ja.json");
const zhOut = path.join(root, "src/i18n/messages/dashboard-zh.json");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function textParts(s) {
  const re = /\{\{[^}]+\}\}/g;
  /** @type {{ type: "t" | "p"; v: string }[]} */
  const parts = [];
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push({ type: "t", v: s.slice(last, m.index) });
    parts.push({ type: "p", v: m[0] });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ type: "t", v: s.slice(last) });
  if (parts.length === 0) parts.push({ type: "t", v: s });
  return parts;
}

/** @type {Map<string, Map<string, string>>} */
const cache = new Map([
  ["ja", new Map()],
  ["zh-CN", new Map()],
]);

/**
 * @param {string} s
 * @param {"ja" | "zh-CN"} to
 */
async function translateText(s, to) {
  if (!s) return s;
  const map = cache.get(to);
  if (map.has(s)) return map.get(s);

  const parts = textParts(s);
  let out = "";
  for (const p of parts) {
    if (p.type === "p") {
      out += p.v;
      continue;
    }
    const t = p.v;
    if (!t.trim()) {
      out += t;
      continue;
    }
    const chunks = [];
    const max = 4500;
    for (let i = 0; i < t.length; i += max) {
      const chunk = t.slice(i, i + max);
      try {
        const r = await translate(chunk, { from: "en", to });
        chunks.push(r.text);
      } catch {
        chunks.push(chunk);
      }
      await delay(22);
    }
    out += chunks.join("");
  }
  map.set(s, out);
  return out;
}

function collectStrings(obj, /** @type {Set<string>} */ set) {
  if (typeof obj === "string") {
    set.add(obj);
    return;
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const v of Object.values(obj)) collectStrings(v, set);
  }
}

function applyDict(obj, /** @type {Map<string, string>} */ dict) {
  if (typeof obj === "string") return dict.get(obj) ?? obj;
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = applyDict(v, dict);
    }
    return out;
  }
  return obj;
}

async function main() {
  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const set = new Set();
  collectStrings(en, set);
  const unique = [...set];
  console.log("Unique strings:", unique.length);

  console.log("Japanese + Chinese (parallel per string)…");
  let i = 0;
  for (const s of unique) {
    i++;
    if (i % 15 === 0) console.log(`  ${i}/${unique.length}`);
    await Promise.all([translateText(s, "ja"), translateText(s, "zh-CN")]);
    await delay(95);
  }

  const dictJa = cache.get("ja");
  const dictZh = cache.get("zh-CN");
  fs.writeFileSync(jaOut, `${JSON.stringify(applyDict(en, dictJa), null, 2)}\n`, "utf8");
  console.log("Wrote", jaOut);
  fs.writeFileSync(zhOut, `${JSON.stringify(applyDict(en, dictZh), null, 2)}\n`, "utf8");
  console.log("Wrote", zhOut);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
