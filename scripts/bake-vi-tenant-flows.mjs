/**
 * Merges en.json tenantFlows + tenant-flows-vi-overrides.json into vi.json.
 * Run after: node scripts/seed-tenant-flows-vi-overrides.mjs
 *   node scripts/bake-vi-tenant-flows.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const enPath = path.join(root, "src/i18n/messages/en.json");
const viPath = path.join(root, "src/i18n/messages/vi.json");
const overridesPath = path.join(root, "src/i18n/messages/tenant-flows-vi-overrides.json");

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const vi = JSON.parse(fs.readFileSync(viPath, "utf8"));
const overrides = JSON.parse(fs.readFileSync(overridesPath, "utf8"));

const enFlows = en.tenantFlows;
if (!enFlows || typeof enFlows !== "object") throw new Error("en.json missing tenantFlows");

const merged = { ...enFlows, ...overrides };
const enKeys = Object.keys(enFlows);
const overrideKeys = Object.keys(overrides);
const missingInMerged = enKeys.filter((k) => !(k in merged));
if (missingInMerged.length) {
  throw new Error(`Merged tenantFlows missing ${missingInMerged.length} en keys (e.g. ${missingInMerged.slice(0, 5).join(", ")})`);
}

const extraInOverrides = overrideKeys.filter((k) => !(k in enFlows));
if (extraInOverrides.length) {
  console.warn(
    `Warning: ${extraInOverrides.length} override keys not in en.json (first: ${extraInOverrides.slice(0, 5).join(", ")})`,
  );
}

vi.tenantFlows = merged;
fs.writeFileSync(viPath, `${JSON.stringify(vi, null, 2)}\n`, "utf8");
console.log(`Baked tenantFlows: ${Object.keys(merged).length} keys (en: ${enKeys.length}, overrides: ${overrideKeys.length})`);
