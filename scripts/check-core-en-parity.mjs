/**
 * Fails if any non-en locale still has the same string as en.json (excluding tenantFlows),
 * for strings with length ≥ 4 and at least 3 Latin letters (catches English bleed).
 * Run: node scripts/check-core-en-parity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "src/i18n/messages");

const LOCALES = ["ko", "vi", "zh", "ja", "es", "pt", "fr", "de", "ru"];

/**
 * @param {unknown} en
 * @param {unknown} loc
 * @param {string} p
 * @param {string[]} out
 * @param {number} minLen
 */
function walk(en, loc, p, out, minLen) {
  if (typeof en === "string" && typeof loc === "string" && en === loc && en.trim().length >= minLen && /[a-zA-Z]{3}/.test(en)) {
    if (!p.startsWith("tenantFlows")) out.push(p);
    return;
  }
  if (en && loc && typeof en === "object" && !Array.isArray(en) && typeof loc === "object" && !Array.isArray(loc)) {
    for (const k of Object.keys(en)) {
      if (!(k in loc)) continue;
      walk(
        /** @type {Record<string, unknown>} */ (en)[k],
        /** @type {Record<string, unknown>} */ (loc)[k],
        p ? `${p}.${k}` : k,
        out,
        minLen,
      );
    }
  }
}

const en = JSON.parse(fs.readFileSync(path.join(dir, "en.json"), "utf8"));
let failed = false;

for (const loc of LOCALES) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, `${loc}.json`), "utf8"));
  const hits = [];
  walk(en, j, "", hits, 4);
  if (hits.length) {
    failed = true;
    console.error(`\n${loc}.json matches en on ${hits.length} path(s), e.g.: ${hits.slice(0, 15).join(", ")}`);
  }
}

if (failed) {
  console.error("\ncore en-parity check FAILED");
  process.exit(1);
}
console.log(`core: no English bleed vs en.json (${LOCALES.length} locales, tenantFlows excluded).`);
