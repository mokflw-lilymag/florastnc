/**
 * Fills dashboard-es.json … dashboard-ru.json from dashboard-en.json
 * using google-translate-api-x. Reuses one pass per unique string across
 * all targets to reduce redundant work.
 *
 * Prefer `apply-dashboard-eu-mt-gap.mjs` (`npm run i18n:apply-dashboard-eu-mt-gap`) to fill
 * only strings still identical to English, preserving existing EU translations.
 *
 * Run: node scripts/generate-dashboard-eu-locales-google.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import translate from "google-translate-api-x";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const enPath = path.join(root, "src/i18n/messages/dashboard-en.json");

/** @type {{ code: string; file: string }[]} */
const TARGETS = [
  { code: "es", file: "dashboard-es.json" },
  { code: "pt", file: "dashboard-pt.json" },
  { code: "fr", file: "dashboard-fr.json" },
  { code: "de", file: "dashboard-de.json" },
  { code: "ru", file: "dashboard-ru.json" },
  { code: "id", file: "dashboard-id.json" },
  { code: "ms", file: "dashboard-ms.json" },
  { code: "th", file: "dashboard-th.json" },
];

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
const caches = new Map(TARGETS.map(({ code }) => [code, new Map()]));

/**
 * @param {string} s
 * @param {string} to
 */
async function translateText(s, to) {
  if (!s) return s;
  const map = caches.get(to);
  if (!map) throw new Error(`no cache for ${to}`);
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
      await delay(18);
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
  console.log("Unique strings:", unique.length, "| targets:", TARGETS.map((t) => t.code).join(", "));

  let i = 0;
  for (const s of unique) {
    i++;
    if (i % 15 === 0) console.log(`  strings ${i}/${unique.length}`);
    await Promise.all(TARGETS.map(({ code }) => translateText(s, code)));
    await delay(95);
  }

  for (const { code, file } of TARGETS) {
    const dict = caches.get(code);
    const outPath = path.join(root, "src/i18n/messages", file);
    fs.writeFileSync(outPath, `${JSON.stringify(applyDict(en, dict), null, 2)}\n`, "utf8");
    console.log("Wrote", outPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
