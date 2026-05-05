/**
 * Fills tenantFlows from en.json into locale JSON files (tenantFlows key only).
 *
 * Default locales: es, pt, fr, de, ru. Optional: ja, zh (zh uses API code zh-CN).
 *   I18N_TENANT_FLOW_TARGETS=all  → es,pt,fr,de,ru,ja,zh
 *
 * 1) GOOGLE_TRANSLATE_API_KEY — Cloud Translation v2 (batched, fast).
 * 2) Otherwise — google-translate-api-x batchTranslate + TLD rotation + disk cache.
 *
 * Optional env:
 *   I18N_TENANT_FLOW_TARGETS=es,pt | ja | zh | all
 *   I18N_TENANT_FLOW_F_MIN / I18N_TENANT_FLOW_F_MAX — numeric range (e.g. 1 and 500
 *     for keys f00001–f00500). Merges only those keys into existing locale files.
 *   I18N_TENANT_FLOW_BATCH_SIZE — strings per unofficial batch (default 4; lower = fewer 429s)
 *   I18N_TENANT_FLOW_BATCH_DELAY_MS — pause between unofficial batches (default 2000)
 *   I18N_TENANT_FLOW_CHUNK_DELAY_MS — pause after each unofficial single-chunk call (default 450)
 *   (Cloud path uses the same I18N_TENANT_FLOW_BATCH_DELAY_MS for pauses between batches, default 120)
 *
 * Disk cache (speeds reruns): scripts/data/tenant-flow-mt-cache.json (gitignored).
 *
 * Run: node scripts/generate-tenant-flows-eu-google.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import translate, { batchTranslate } from "google-translate-api-x";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const enPath = path.join(root, "src/i18n/messages/en.json");
const MT_CACHE_PATH = path.join(root, "scripts/data/tenant-flow-mt-cache.json");

/** @type {string[]} */
const TLDS = ["com", "co.uk", "ca", "com.au", "ie", "co.nz"];

/** @type {{ code: string; file: string; translateTo?: string }[]} */
const EU_TARGETS = [
  { code: "es", file: "es.json" },
  { code: "pt", file: "pt.json" },
  { code: "fr", file: "fr.json" },
  { code: "de", file: "de.json" },
  { code: "ru", file: "ru.json" },
];

/** @type {{ code: string; file: string; translateTo?: string }[]} */
const EXTRA_TARGETS = [
  { code: "ja", file: "ja.json" },
  { code: "zh", file: "zh.json", translateTo: "zh-CN" },
];

const ALL_TARGETS = [...EU_TARGETS, ...EXTRA_TARGETS];

/** @param {{ translateTo?: string; code: string }} t */
function apiTranslateTarget(t) {
  return t.translateTo ?? t.code;
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function parseTargetsFilter() {
  const raw = process.env.I18N_TENANT_FLOW_TARGETS;
  if (!raw || !raw.trim()) return EU_TARGETS;
  const norm = raw.trim().toLowerCase();
  if (norm === "all") return ALL_TARGETS;
  const want = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const picked = ALL_TARGETS.filter((t) => want.has(t.code));
  if (!picked.length) throw new Error(`I18N_TENANT_FLOW_TARGETS matched no codes: ${raw}`);
  return picked;
}

/** @returns {{ nMin: number; nMax: number } | null} */
function parseFKeyRange() {
  const rawMin = process.env.I18N_TENANT_FLOW_F_MIN;
  const rawMax = process.env.I18N_TENANT_FLOW_F_MAX;
  if ((rawMin == null || String(rawMin).trim() === "") && (rawMax == null || String(rawMax).trim() === "")) {
    return null;
  }
  const parseN = (v) => {
    const s = String(v).trim().replace(/^f/i, "");
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : NaN;
  };
  const nMin = rawMin != null && String(rawMin).trim() !== "" ? parseN(rawMin) : 1;
  const nMax = rawMax != null && String(rawMax).trim() !== "" ? parseN(rawMax) : 999_999;
  if (!Number.isFinite(nMin) || !Number.isFinite(nMax)) throw new Error("I18N_TENANT_FLOW_F_MIN / F_MAX must be integers");
  if (nMin > nMax) throw new Error("I18N_TENANT_FLOW_F_MIN must be <= F_MAX");
  return { nMin, nMax };
}

/**
 * @param {Record<string, string>} enFlows
 * @param {{ nMin: number; nMax: number } | null} range
 */
function sliceEnFlowsByFRange(enFlows, range) {
  if (!range) {
    return { flows: enFlows, mergeKeys: null };
  }
  /** @type {Record<string, string>} */
  const flows = {};
  /** @type {string[]} */
  const mergeKeys = [];
  for (const k of Object.keys(enFlows)) {
    const m = /^f(\d+)$/.exec(k);
    const n = m ? parseInt(m[1], 10) : NaN;
    if (!Number.isFinite(n) || n < range.nMin || n > range.nMax) continue;
    flows[k] = enFlows[k];
    mergeKeys.push(k);
  }
  if (!mergeKeys.length) {
    throw new Error(`No tenantFlows keys in f${String(range.nMin).padStart(5, "0")}–f${String(range.nMax).padStart(5, "0")} range`);
  }
  return { flows, mergeKeys };
}

function isRateLimitError(e) {
  const msg = String((e && e.message) || e);
  return /429|too many|rate|quota/i.test(msg);
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

/**
 * @param {string} file
 * @param {Record<string, string>} outFlows full or partial tenantFlows values by key
 * @param {string[] | null} mergeKeys if set, merge into existing tenantFlows
 */
function writeLocaleTenantFlows(file, outFlows, mergeKeys) {
  const localePath = path.join(root, "src/i18n/messages", file);
  const j = JSON.parse(fs.readFileSync(localePath, "utf8"));
  if (!mergeKeys) {
    j.tenantFlows = outFlows;
  } else {
    if (!j.tenantFlows || typeof j.tenantFlows !== "object") j.tenantFlows = {};
    for (const k of mergeKeys) {
      if (k in outFlows) j.tenantFlows[k] = outFlows[k];
    }
  }
  fs.writeFileSync(localePath, `${JSON.stringify(j, null, 2)}\n`, "utf8");
  const label = mergeKeys ? `merged ${mergeKeys.length} keys` : `full ${Object.keys(outFlows).length} keys`;
  console.log("Wrote tenantFlows →", localePath, `(${label})`);
}

/** @param {string[]} strings @param {number} maxStrings @param {number} maxChars */
function batchStrings(strings, maxStrings, maxChars) {
  /** @type {string[][]} */
  const batches = [];
  let cur = [];
  let chars = 0;
  for (const s of strings) {
    const len = s.length;
    if (cur.length >= maxStrings || (chars + len > maxChars && cur.length > 0)) {
      batches.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(s);
    chars += len;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

/**
 * @param {string[]} q
 * @param {string} target
 */
async function googleCloudTranslateBatch(q, target) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return null;
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q,
      source: "en",
      target,
      format: "text",
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Google Cloud Translate HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = JSON.parse(text);
  const trs = data?.data?.translations;
  if (!Array.isArray(trs) || trs.length !== q.length) {
    throw new Error("Google Cloud Translate: unexpected response shape");
  }
  return trs.map((/** @type {{ translatedText: string }} */ t) => t.translatedText);
}

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
let caches = new Map();

/** @type {Record<string, Record<string, string>>} */
function readMtCache() {
  try {
    const o = JSON.parse(fs.readFileSync(MT_CACHE_PATH, "utf8"));
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function writeMtCache(/** @type {Record<string, Record<string, string>>} */ obj) {
  fs.mkdirSync(path.dirname(MT_CACHE_PATH), { recursive: true });
  fs.writeFileSync(MT_CACHE_PATH, `${JSON.stringify(obj)}\n`, "utf8");
}

/**
 * @param {string} chunk
 * @param {string} to
 * @param {number} tldIndex
 */
async function translateChunkUnofficial(chunk, to, tldIndex) {
  let attempt = 0;
  while (true) {
    const tld = TLDS[(tldIndex + attempt) % TLDS.length];
    try {
      const r = await translate(chunk, {
        from: "en",
        to,
        tld,
        forceBatch: true,
        fallbackBatch: true,
      });
      return r.text;
    } catch (e) {
      attempt++;
      if ((!isRateLimitError(e) && !/status|network|fetch/i.test(String(e && e.message))) || attempt > 22) {
        throw e;
      }
      const wait = Math.min(120_000, Math.round(1800 * Math.pow(1.45, attempt - 1)));
      console.warn(`  [${to}] retry (${attempt}) tld=${tld} wait ${wait}ms`);
      await delay(wait);
    }
  }
}

/**
 * @param {string} s
 * @param {string} localeCode cache key (e.g. zh)
 * @param {string} apiTo translate API code (e.g. zh-CN)
 */
async function translateTextUnofficialSingle(s, localeCode, apiTo) {
  if (!s) return s;
  const map = caches.get(localeCode);
  if (!map) throw new Error(`no cache for ${localeCode}`);
  if (map.has(s)) return map.get(s);

  const parts = textParts(s);
  let out = "";
  let ti = 0;
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
      chunks.push(await translateChunkUnofficial(chunk, apiTo, ti++));
      await delay(Number(process.env.I18N_TENANT_FLOW_CHUNK_DELAY_MS || 450));
    }
    out += chunks.join("");
  }
  map.set(s, out);
  return out;
}

/**
 * @param {string[]} batch
 * @param {string} apiTo
 * @param {string} localeCode
 * @returns {Promise<string[]>}
 */
async function translateStringsBatchUnofficial(batch, apiTo, localeCode) {
  const input = batch.map((text) => ({ text, from: "en", to: apiTo }));
  let attempt = 0;
  while (true) {
    const tld = TLDS[attempt % TLDS.length];
    try {
      const results = await batchTranslate(input, {
        tld,
        rejectOnPartialFail: false,
        forceBatch: true,
        fallbackBatch: true,
      });
      /** @type {string[]} */
      const out = [];
      for (let i = 0; i < batch.length; i++) {
        const r = results[i];
        const txt = r && typeof r.text === "string" ? r.text : null;
        out.push(txt != null && txt !== "" ? txt : batch[i]);
      }
      return out;
    } catch (e) {
      attempt++;
      if (attempt > 5) {
        console.warn(
          `  [${localeCode}→${apiTo}] batch failed after ${attempt - 1} tries (${batch.length} strings) → singles`,
        );
        /** @type {string[]} */
        const one = [];
        for (const s of batch) {
          one.push(await translateTextUnofficialSingle(s, localeCode, apiTo));
          await delay(900);
        }
        return one;
      }
      const wait = Math.min(120_000, Math.round(2000 * Math.pow(1.5, attempt - 1)));
      console.warn(`  [${localeCode}] batch rate/error → wait ${wait}ms (try ${attempt}, tld=${tld})`);
      await delay(wait);
    }
  }
}

/**
 * @param {Record<string, Record<string, string>>} mtCache
 * @param {string} to
 * @param {string} src
 * @param {string} translated
 */
function rememberMt(mtCache, to, src, translated) {
  if (!mtCache[to]) mtCache[to] = {};
  mtCache[to][src] = translated;
}

async function runOfficial(enFlows, unique, TARGETS, mergeKeys) {
  for (const t of TARGETS) {
    const { code, file } = t;
    const apiTo = apiTranslateTarget(t);
    console.log(`\n--- Cloud API: ${code} (${apiTo}) ---`);
    const dict = new Map();
    const batches = batchStrings(unique, 80, 12_000);
    let bi = 0;
    for (const batch of batches) {
      bi++;
      if (bi % 8 === 1 || bi === batches.length) console.log(`  [${code}] batch ${bi}/${batches.length} (${batch.length} strings)`);
      const out = await googleCloudTranslateBatch(batch, apiTo);
      if (!out) throw new Error("internal: null batch");
      batch.forEach((orig, i) => dict.set(orig, out[i]));
      await delay(Number(process.env.I18N_TENANT_FLOW_BATCH_DELAY_MS || 120));
    }
    const outFlows = /** @type {Record<string, string>} */ (applyDict(enFlows, dict));
    writeLocaleTenantFlows(file, outFlows, mergeKeys);
  }
}

/**
 * @param {Record<string, Record<string, string>>} mtCache
 */
async function runUnofficial(enFlows, unique, TARGETS, mergeKeys, mtCache) {
  const batchSize = Math.max(1, Math.min(25, Number(process.env.I18N_TENANT_FLOW_BATCH_SIZE || 4)));
  const batchDelay = Number(process.env.I18N_TENANT_FLOW_BATCH_DELAY_MS || 2000);
  console.log(
    `\nUnofficial batchTranslate: batch=${batchSize}, delay=${batchDelay}ms, cache=${MT_CACHE_PATH}`,
  );
  console.log(
    "Tip: GOOGLE_TRANSLATE_API_KEY → fast Cloud API. F_MIN/F_MAX → partial merge. If you still see 429s, lower I18N_TENANT_FLOW_BATCH_SIZE or raise I18N_TENANT_FLOW_BATCH_DELAY_MS.\n",
  );

  for (const tgt of TARGETS) {
    const { code, file } = tgt;
    const apiTo = apiTranslateTarget(tgt);
    console.log(`\n--- Language: ${code} (API → ${apiTo}) ---`);
    const map = caches.get(code);
    if (!map) throw new Error(`no cache for ${code}`);
    for (const s of unique) {
      const hit = mtCache[code]?.[s];
      if (hit != null && hit !== "") map.set(s, hit);
    }
    const pending = unique.filter((s) => !map.has(s));
    console.log(`  [${code}] cached ${unique.length - pending.length} / ${unique.length}, translating ${pending.length}`);

    let bi = 0;
    for (let i = 0; i < pending.length; i += batchSize) {
      bi++;
      const batch = pending.slice(i, i + batchSize);
      if (bi % 20 === 1 || i + batchSize >= pending.length) {
        console.log(`  [${code}] batch ${bi} (~${Math.ceil(pending.length / batchSize)} total), size ${batch.length}`);
      }
      const translated = await translateStringsBatchUnofficial(batch, apiTo, code);
      batch.forEach((src, j) => {
        const tr = translated[j];
        map.set(src, tr);
        rememberMt(mtCache, code, src, tr);
      });
      if (bi % 8 === 0 || i + batchSize >= pending.length) writeMtCache(mtCache);
      await delay(batchDelay);
    }
    writeMtCache(mtCache);

    const dict = map;
    const outFlows = /** @type {Record<string, string>} */ (applyDict(enFlows, dict));
    writeLocaleTenantFlows(file, outFlows, mergeKeys);
  }
}

async function main() {
  const TARGETS = parseTargetsFilter();
  caches = new Map(TARGETS.map(({ code }) => [code, new Map()]));

  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const enFlowsFull = en.tenantFlows;
  if (!enFlowsFull || typeof enFlowsFull !== "object") throw new Error("en.json missing tenantFlows");

  const fRange = parseFKeyRange();
  const { flows: enFlows, mergeKeys } = sliceEnFlowsByFRange(enFlowsFull, fRange);
  if (fRange) {
    console.log(`Key range: f${String(fRange.nMin).padStart(5, "0")}–f${String(fRange.nMax).padStart(5, "0")} (${mergeKeys?.length} keys)`);
  }

  const set = new Set();
  collectStrings(enFlows, set);
  const unique = [...set];
  console.log("tenantFlows unique strings (this slice):", unique.length, "| targets:", TARGETS.map((t) => t.code).join(", "));

  const mtCache = readMtCache();

  if (process.env.GOOGLE_TRANSLATE_API_KEY) {
    console.log("Using Google Cloud Translation API (batched).");
    await runOfficial(enFlows, unique, TARGETS, mergeKeys);
  } else {
    await runUnofficial(enFlows, unique, TARGETS, mergeKeys, mtCache);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
