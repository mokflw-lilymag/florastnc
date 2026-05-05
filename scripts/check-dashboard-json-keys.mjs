/**
 * Ensures each dashboard-*.json has the same leaf key paths as dashboard-en.json.
 * Run: node scripts/check-dashboard-json-keys.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "src/i18n/messages");

/** @param {unknown} obj @param {string} prefix @param {Set<string>} out */
function collectLeafPaths(obj, prefix, out) {
  if (obj == null) return;
  if (typeof obj !== "string" && typeof obj !== "number" && typeof obj !== "boolean") {
    if (typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      out.add(prefix ? `${prefix}[]` : "[]");
      return;
    }
    const keys = Object.keys(obj);
    if (keys.length === 0) out.add(prefix || ".");
    for (const k of keys) {
      const p = prefix ? `${prefix}.${k}` : k;
      const v = /** @type {Record<string, unknown>} */ (obj)[k];
      if (v != null && typeof v === "object" && !Array.isArray(v)) {
        collectLeafPaths(v, p, out);
      } else {
        out.add(p);
      }
    }
  } else {
    out.add(prefix || ".");
  }
}

const enPath = path.join(dir, "dashboard-en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const enPaths = new Set();
collectLeafPaths(en, "", enPaths);

const LOCALES = ["ko", "vi", "ja", "zh", "es", "pt", "fr", "de", "ru"];
let failed = false;

for (const loc of LOCALES) {
  const file = `dashboard-${loc}.json`;
  const p = path.join(dir, file);
  let j;
  try {
    j = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.error(file, String(e && e.message ? e.message : e));
    failed = true;
    continue;
  }
  const paths = new Set();
  collectLeafPaths(j, "", paths);
  const missing = [...enPaths].filter((k) => !paths.has(k));
  const extra = [...paths].filter((k) => !enPaths.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`\n${file}:`);
    if (missing.length) console.error(`  missing ${missing.length} paths (e.g. ${missing.slice(0, 10).join(", ")})`);
    if (extra.length) console.error(`  extra ${extra.length} paths (e.g. ${extra.slice(0, 10).join(", ")})`);
  }
}

if (failed) {
  console.error("\ndashboard JSON key parity FAILED");
  process.exit(1);
}
console.log(`dashboard: ${LOCALES.length} locale files match dashboard-en.json (${enPaths.size} leaf paths).`);
