/**
 * Regenerate dashboard-ja.json from dashboard-en.json via Lingva (no API key).
 * Preserves {{mustache}} segments; chunks long text for URL limits.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const enPath = path.join(root, "src/i18n/messages/dashboard-en.json");
const jaOut = path.join(root, "src/i18n/messages/dashboard-ja.json");
const cachePath = path.join(root, "scripts/.dashboard-ja-lingva-cache.json");

/** Public Lingva mirror (lingva.ml returns 404 when query contains `/` after decode) */
const LINGVA = "https://translate.plausibility.cloud/api/v1/en/ja";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lingva returns 404 for "." etc. — copy through when there is nothing to translate */
function skipTranslate(text) {
  if (!text.trim()) return true;
  if (!/[a-zA-Z]/.test(text)) return true;
  return false;
}

/** Max path segment for GET (stay under proxy URL limits) */
const MAX_CHUNK = 1200;

function textParts(s) {
  const re = /\{\{[^}]+\}\}/g;
  const parts = [];
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push({ type: "t", v: s.slice(last, m.index) });
    parts.push({ type: "p", v: m[0] });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ type: "t", v: s.slice(last, s.length) });
  if (parts.length === 0) parts.push({ type: "t", v: s });
  return parts;
}

async function lingvaTranslatePlain(text) {
  if (!text.trim()) return text;
  if (skipTranslate(text)) return text;
  const chunks = [];
  for (let i = 0; i < text.length; i += MAX_CHUNK) {
    const piece = text.slice(i, i + MAX_CHUNK);
    const url = `${LINGVA}/${encodeURIComponent(piece)}`;
    let lastErr = /** @type {Error | null} */ (null);
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await fetch(url);
      if (res.ok) {
        const j = await res.json();
        if (typeof j.translation !== "string") {
          lastErr = new Error(`Lingva bad JSON: ${JSON.stringify(j).slice(0, 200)}`);
        } else {
          chunks.push(j.translation);
          lastErr = null;
          break;
        }
      } else {
        lastErr = new Error(`Lingva ${res.status} ${res.statusText}`);
      }
      await delay(2000 * (attempt + 1));
    }
    if (lastErr) throw lastErr;
    await delay(650);
  }
  return chunks.join("");
}

/** @type {Map<string, string>} */
const cache = new Map();

async function translateString(s) {
  if (!s) return s;
  if (cache.has(s)) return cache.get(s);

  const parts = textParts(s);
  let out = "";
  for (const p of parts) {
    if (p.type === "p") {
      out += p.v;
      continue;
    }
    out += await lingvaTranslatePlain(p.v);
  }
  cache.set(s, out);
  return out;
}

function collectStrings(obj, set) {
  if (typeof obj === "string") {
    set.add(obj);
    return;
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const v of Object.values(obj)) collectStrings(v, set);
  }
}

function applyDict(obj, dict) {
  if (typeof obj === "string") return dict.get(obj) ?? obj;
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = applyDict(v, dict);
    }
    return out;
  }
  return obj;
}

function loadDiskCache() {
  try {
    const raw = fs.readFileSync(cachePath, "utf8");
    const o = JSON.parse(raw);
    if (o && typeof o === "object") {
      for (const [k, v] of Object.entries(o)) {
        if (typeof v === "string") cache.set(k, v);
      }
      console.log("Loaded disk cache:", cache.size, "entries");
    }
  } catch {
    /* none */
  }
}

function saveDiskCache() {
  const o = Object.fromEntries(cache);
  fs.writeFileSync(cachePath, JSON.stringify(o), "utf8");
}

async function main() {
  loadDiskCache();
  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const set = new Set();
  collectStrings(en, set);
  const unique = [...set];
  console.log("Unique strings:", unique.length);

  let i = 0;
  for (const s of unique) {
    i++;
    if (cache.has(s)) continue;
    if (i % 5 === 0) console.log(`  ${i}/${unique.length}`);
    try {
      await translateString(s);
      saveDiskCache();
    } catch (e) {
      console.error(`FAIL on string #${i}:`, (e && e.message) || e);
      throw e;
    }
  }

  let ja = applyDict(en, cache);
  ja = postProcess(ja);
  fs.writeFileSync(jaOut, `${JSON.stringify(ja, null, 2)}\n`, "utf8");
  console.log("Wrote", jaOut);
}

/** @param {unknown} obj */
function postProcess(obj) {
  if (typeof obj === "string") return obj;
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const o = /** @type {Record<string, unknown>} */ ({ ...obj });
  for (const [k, v] of Object.entries(o)) {
    o[k] = postProcess(v);
  }
  if ("ribbon" in o && o.ribbon && typeof o.ribbon === "object" && !Array.isArray(o.ribbon)) {
    const r = /** @type {Record<string, unknown>} */ (o.ribbon);
    r.authDemoEmail = "test@test.com";
    r.adminDeleteConfirmWord = "強制削除";
  }
  return o;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
