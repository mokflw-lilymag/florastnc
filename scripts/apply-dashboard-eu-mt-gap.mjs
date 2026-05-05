/**
 * Merges machine translations into dashboard-es.json … dashboard-ru.json
 * only where a leaf string still equals dashboard-en.json (gap fill).
 * Preserves keys and any strings that already differ from English.
 *
 * Skips: fontItem / studioFont_* paths, ribbon.adminDeleteConfirmWord (typed confirm).
 *
 * 1) GOOGLE_TRANSLATE_API_KEY — Cloud Translation v2 (batched).
 * 2) I18N_DASHBOARD_TRANSLATE_ENGINE=mymemory — api.mymemory.translated.net (slow; daily caps; good cache).
 * 3) Otherwise — google-translate-api-x (often 429).
 *
 * Env:
 *   I18N_DASHBOARD_TRANSLATE_ENGINE — unset | mymemory
 *   I18N_MYMEMORY_EMAIL — optional contact email for higher MyMemory fair-use quota
 *   I18N_DASHBOARD_MYMEMORY_DELAY_MS — pause between MyMemory requests (default 450)
 *   I18N_DASHBOARD_MYMEMORY_CHUNK — max source chars per request (default 420)
 *   I18N_DASHBOARD_TARGETS=es,pt | all (default: es,pt,fr,de,ru)
 *   I18N_DASHBOARD_MT_MIN_LEN — min string length (default 5)
 *   I18N_DASHBOARD_BATCH_SIZE — unofficial batch size (default 1; batches often 429)
 *   I18N_DASHBOARD_BATCH_DELAY_MS — pause between batches (default 2200)
 *   I18N_DASHBOARD_SINGLES_ONLY=1 — skip batchTranslate; one string at a time (slowest, most reliable)
 *   I18N_DASHBOARD_CHUNK_DELAY_MS — unofficial single-chunk delay (default 450)
 *   I18N_DASHBOARD_CLOUD_BATCH_DELAY_MS — Cloud pause between batches (default 120)
 *   I18N_DASHBOARD_MAX_STRINGS=N — translate only first N gap strings (sorted), for smoke tests
 *
 * Cache: scripts/data/dashboard-eu-mt-cache.json (gitignored)
 *
 * Run: node scripts/apply-dashboard-eu-mt-gap.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import translate, { batchTranslate } from "google-translate-api-x";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const enPath = path.join(root, "src/i18n/messages/dashboard-en.json");
const MT_CACHE_PATH = path.join(root, "scripts/data/dashboard-eu-mt-cache.json");

/** @type {{ code: string; file: string; translateTo?: string }[]} */
const ALL_TARGETS = [
  { code: "es", file: "dashboard-es.json" },
  { code: "pt", file: "dashboard-pt.json" },
  { code: "fr", file: "dashboard-fr.json" },
  { code: "de", file: "dashboard-de.json" },
  { code: "ru", file: "dashboard-ru.json" },
];

const TLDS = ["com", "co.uk", "ca", "com.au", "ie", "co.nz"];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** @param {{ translateTo?: string; code: string }} t */
function apiTranslateTarget(t) {
  return t.translateTo ?? t.code;
}

/** @param {string} code */
function myMemoryLangPair(code) {
  const m = { es: "en|es", pt: "en|pt", fr: "en|fr", de: "en|de", ru: "en|ru" };
  return m[code] ?? `en|${code}`;
}

/**
 * @param {string} text
 * @param {string} langpair e.g. en|es
 */
async function translateWithMyMemory(text, langpair) {
  const email = process.env.I18N_MYMEMORY_EMAIL?.trim();
  const maxChunk = Math.max(80, Math.min(500, Number(process.env.I18N_DASHBOARD_MYMEMORY_CHUNK || 420)));
  const pause = Number(process.env.I18N_DASHBOARD_MYMEMORY_DELAY_MS || 450);
  const parts = textParts(text);
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
    for (let i = 0; i < t.length; i += maxChunk) {
      const ch = t.slice(i, i + maxChunk);
      const url = new URL("https://api.mymemory.translated.net/get");
      url.searchParams.set("q", ch);
      url.searchParams.set("langpair", langpair);
      if (email) url.searchParams.set("de", email);
      const res = await fetch(url);
      const j = /** @type {Record<string, unknown>} */ (await res.json());
      const st = j.responseStatus;
      if (st !== 200) {
        const det = typeof j.responseDetails === "string" ? j.responseDetails : JSON.stringify(j).slice(0, 240);
        throw new Error(`MyMemory HTTP ${res.status} status=${st}: ${det}`);
      }
      const rd = /** @type {{ translatedText?: string }} */ (j.responseData);
      const tr = rd?.translatedText;
      chunks.push(typeof tr === "string" && tr !== "" ? tr : ch);
      await delay(pause);
    }
    out += chunks.join("");
  }
  return out;
}

/**
 * @param {string[]} unique
 * @param {string} code
 * @param {Map<string, string>} map
 * @param {Record<string, Record<string, string>>} mtCache
 */
async function fillMapMyMemory(unique, code, map, mtCache) {
  const langpair = myMemoryLangPair(code);
  for (const s of unique) {
    const hit = mtCache[code]?.[s];
    if (hit != null && hit !== "") map.set(s, hit);
  }
  const pending = unique.filter((s) => !map.has(s));
  console.log(
    `  [${code}] MyMemory ${langpair} | cache ${unique.length - pending.length}/${unique.length}, pending ${pending.length}`,
  );
  let i = 0;
  for (const src of pending) {
    i++;
    if (i % 25 === 1 || i === pending.length) console.log(`  [${code}] MyMemory ${i}/${pending.length}`);
    try {
      const tr = await translateWithMyMemory(src, langpair);
      map.set(src, tr);
      rememberMt(mtCache, code, src, tr);
    } catch (e) {
      const msg = String((e && e.message) || e);
      if (/429|ALL AVAILABLE FREE|USAGE LIMIT|MYMEMORY WARNING/i.test(msg)) {
        console.warn(`  [${code}] MyMemory daily quota — stopping this locale (${msg.slice(0, 140)}…)`);
        break;
      }
      console.warn(`  [${code}] MyMemory skip: ${msg.slice(0, 120)}`);
    }
    if (i % 15 === 0) writeMtCache(mtCache);
  }
  writeMtCache(mtCache);
}

function parseTargets() {
  const raw = process.env.I18N_DASHBOARD_TARGETS;
  if (!raw || !raw.trim()) return ALL_TARGETS;
  const norm = raw.trim().toLowerCase();
  if (norm === "all") return ALL_TARGETS;
  const want = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const picked = ALL_TARGETS.filter((t) => want.has(t.code));
  if (!picked.length) throw new Error(`I18N_DASHBOARD_TARGETS matched no codes: ${raw}`);
  return picked;
}

const minGapLen = Math.max(1, Number(process.env.I18N_DASHBOARD_MT_MIN_LEN || 5));

/**
 * @param {string} p dot path
 */
function skipPath(p) {
  if (p.includes("fontItem") || p.includes("studioFont_")) return true;
  if (/\.adminDeleteConfirmWord$/.test(p)) return true;
  return false;
}

/**
 * @param {string} s
 */
function gapNeedsTranslate(s) {
  return typeof s === "string" && s.trim().length >= minGapLen && /[a-zA-Z]{3}/.test(s);
}

/**
 * @param {unknown} en
 * @param {unknown} loc
 * @param {string} p
 * @param {Set<string>} out
 */
function collectGapStrings(en, loc, p, out) {
  if (typeof en === "string" && typeof loc === "string") {
    if (skipPath(p)) return;
    if (en === loc && gapNeedsTranslate(en)) out.add(en);
    return;
  }
  if (en && loc && typeof en === "object" && !Array.isArray(en)) {
    for (const k of Object.keys(en)) {
      if (!(k in loc)) continue;
      const next = p ? `${p}.${k}` : k;
      collectGapStrings(en[k], loc[k], next, out);
    }
  }
}

/**
 * @param {unknown} en
 * @param {unknown} loc
 * @param {string} p
 * @param {Map<string, string>} dict
 */
function mergeApply(en, loc, p, dict) {
  if (typeof en === "string" && typeof loc === "string") {
    if (skipPath(p)) return loc;
    if (en !== loc) return loc;
    if (!gapNeedsTranslate(en)) return loc;
    return dict.get(en) ?? loc;
  }
  if (en && loc && typeof en === "object" && !Array.isArray(en)) {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const k of Object.keys(en)) {
      if (!(k in loc)) continue;
      const next = p ? `${p}.${k}` : k;
      out[k] = mergeApply(en[k], loc[k], next, dict);
    }
    return out;
  }
  return loc;
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

function isRateLimitError(e) {
  const msg = String((e && e.message) || e);
  return /429|too many|rate|quota/i.test(msg);
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
 * @param {string} localeCode
 * @param {string} apiTo
 * @param {Map<string, string>} map
 */
async function translateTextUnofficialSingle(s, localeCode, apiTo, map) {
  if (!s) return s;
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
      await delay(Number(process.env.I18N_DASHBOARD_CHUNK_DELAY_MS || 450));
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
 * @param {Map<string, string>} map
 */
async function translateStringsBatchUnofficial(batch, apiTo, localeCode, map) {
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
        for (const str of batch) {
          one.push(await translateTextUnofficialSingle(str, localeCode, apiTo, map));
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

/**
 * @param {string[]} unique
 * @param {string} code
 * @param {Map<string, string>} map
 * @param {Record<string, Record<string, string>>} mtCache
 */
async function fillMapUnofficial(unique, code, apiTo, map, mtCache) {
  const singlesOnly = String(process.env.I18N_DASHBOARD_SINGLES_ONLY || "").trim() === "1";
  const batchSize = singlesOnly
    ? 1
    : Math.max(1, Math.min(25, Number(process.env.I18N_DASHBOARD_BATCH_SIZE || 1)));
  const batchDelay = Number(process.env.I18N_DASHBOARD_BATCH_DELAY_MS || 2200);
  for (const s of unique) {
    const hit = mtCache[code]?.[s];
    if (hit != null && hit !== "") map.set(s, hit);
  }
  const pending = unique.filter((s) => !map.has(s));
  console.log(
    `  [${code}] cached ${unique.length - pending.length} / ${unique.length}, translating ${pending.length} (batch=${batchSize}${singlesOnly ? ", singles-only" : ""})`,
  );

  let bi = 0;
  for (let i = 0; i < pending.length; i += batchSize) {
    bi++;
    const batch = pending.slice(i, i + batchSize);
    if (bi % 25 === 1 || i + batchSize >= pending.length) {
      console.log(`  [${code}] batch ${bi} (~${Math.ceil(pending.length / batchSize)} total), size ${batch.length}`);
    }
    /** @type {string[]} */
    let translated;
    if (singlesOnly) {
      translated = [];
      for (const str of batch) {
        translated.push(await translateTextUnofficialSingle(str, code, apiTo, map));
        await delay(batchDelay);
      }
    } else {
      translated = await translateStringsBatchUnofficial(batch, apiTo, code, map);
      await delay(batchDelay);
    }
    batch.forEach((src, j) => {
      const tr = translated[j];
      map.set(src, tr);
      rememberMt(mtCache, code, src, tr);
    });
    if (bi % 12 === 0 || i + batchSize >= pending.length) writeMtCache(mtCache);
  }
  writeMtCache(mtCache);
}

/**
 * @param {string[]} unique
 * @param {string} code
 * @param {string} apiTo
 * @param {Map<string, string>} map
 * @param {Record<string, Record<string, string>>} mtCache
 */
async function fillMapOfficial(unique, code, apiTo, map, mtCache) {
  for (const s of unique) {
    const hit = mtCache[code]?.[s];
    if (hit != null && hit !== "") map.set(s, hit);
  }
  const pending = unique.filter((s) => !map.has(s));
  console.log(`  [${code}] cache hits ${unique.length - pending.length} / ${unique.length}, Cloud: ${pending.length}`);

  const batches = batchStrings(pending, 80, 12_000);
  let bi = 0;
  for (const batch of batches) {
    bi++;
    if (bi % 8 === 1 || bi === batches.length) console.log(`  [${apiTo}] batch ${bi}/${batches.length} (${batch.length} strings)`);
    const out = await googleCloudTranslateBatch(batch, apiTo);
    if (!out) throw new Error("internal: null batch");
    batch.forEach((orig, i) => {
      const tr = out[i];
      map.set(orig, tr);
      rememberMt(mtCache, code, orig, tr);
    });
    writeMtCache(mtCache);
    await delay(Number(process.env.I18N_DASHBOARD_CLOUD_BATCH_DELAY_MS || 120));
  }
}

async function main() {
  const TARGETS = parseTargets();
  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const mtCache = readMtCache();
  const useCloud = Boolean(process.env.GOOGLE_TRANSLATE_API_KEY);
  const engineRaw = (process.env.I18N_DASHBOARD_TRANSLATE_ENGINE || "").trim().toLowerCase();
  const useMyMemory = engineRaw === "mymemory";

  const engineLabel = useCloud ? "Google Cloud API" : useMyMemory ? "MyMemory (public API)" : "google-translate-api-x (unofficial)";
  console.log(`Dashboard EU gap MT | targets: ${TARGETS.map((t) => t.code).join(", ")} | minLen: ${minGapLen} | ${engineLabel}`);

  for (const tgt of TARGETS) {
    const { code, file } = tgt;
    const apiTo = apiTranslateTarget(tgt);
    const locPath = path.join(root, "src/i18n/messages", file);
    const loc = JSON.parse(fs.readFileSync(locPath, "utf8"));
    const gap = new Set();
    collectGapStrings(en, loc, "", gap);
    let unique = [...gap].sort();
    const maxRaw = process.env.I18N_DASHBOARD_MAX_STRINGS;
    const maxN = maxRaw != null && String(maxRaw).trim() !== "" ? Math.max(1, Number(maxRaw)) : 0;
    if (Number.isFinite(maxN) && maxN > 0 && unique.length > maxN) {
      console.log(`  (I18N_DASHBOARD_MAX_STRINGS=${maxN} → translating ${maxN} of ${unique.length} gap strings)`);
      unique = unique.slice(0, maxN);
    }
    console.log(`\n--- ${code} (${file}): ${unique.length} unique gap strings (this run) ---`);
    if (!unique.length) {
      console.log("  nothing to translate");
      continue;
    }

    /** @type {Map<string, string>} */
    const map = new Map();

    if (useCloud) {
      await fillMapOfficial(unique, code, apiTo, map, mtCache);
    } else if (useMyMemory) {
      await fillMapMyMemory(unique, code, map, mtCache);
    } else {
      await fillMapUnofficial(unique, code, apiTo, map, mtCache);
    }

    const merged = /** @type {Record<string, unknown>} */ (mergeApply(en, loc, "", map));
    fs.writeFileSync(locPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    console.log("  wrote", locPath);
  }

  for (const tgt of TARGETS) {
    const locPath = path.join(root, "src/i18n/messages", tgt.file);
    const loc = JSON.parse(fs.readFileSync(locPath, "utf8"));
    const g = new Set();
    collectGapStrings(en, loc, "", g);
    console.log(`  remaining gaps [${tgt.code}]: ${g.size}`);
  }

  console.log("\nDone. Run: npm run i18n:check-dashboard-keys");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
