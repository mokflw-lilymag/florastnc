/**
 * Ensures every locale tenantFlows has the same keys as en.json.
 * Exit 1 on mismatch (for CI / pre-commit).
 *
 * Run: node scripts/check-tenant-flow-keys.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "src/i18n/messages");

const LOCALES = ["ko", "en", "vi", "zh", "ja", "es", "pt", "fr", "de", "ru"];

function loadTenantFlowKeys(file) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const tf = j.tenantFlows;
  if (!tf || typeof tf !== "object") throw new Error(`${file}: missing tenantFlows`);
  return new Set(Object.keys(tf));
}

const enKeys = loadTenantFlowKeys("en.json");
let failed = false;

for (const loc of LOCALES) {
  if (loc === "en") continue;
  const file = `${loc}.json`;
  let keys;
  try {
    keys = loadTenantFlowKeys(file);
  } catch (e) {
    console.error(String(e && e.message ? e.message : e));
    failed = true;
    continue;
  }
  const missing = [...enKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !enKeys.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`\n${file}:`);
    if (missing.length) console.error(`  missing ${missing.length} keys (e.g. ${missing.slice(0, 8).join(", ")})`);
    if (extra.length) console.error(`  extra ${extra.length} keys (e.g. ${extra.slice(0, 8).join(", ")})`);
  }
}

if (failed) {
  console.error("\ntenantFlows key parity check FAILED");
  process.exit(1);
}
console.log(`tenantFlows: all ${LOCALES.length - 1} locales match en.json (${enKeys.size} keys).`);
