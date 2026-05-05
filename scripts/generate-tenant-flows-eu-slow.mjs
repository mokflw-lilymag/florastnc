/**
 * Runs generate-tenant-flows-eu-google.mjs with extra-conservative defaults for the
 * unofficial google-translate-api-x path (fewer 429s, slower).
 *
 * Only sets env vars that are not already defined.
 *
 * Run: node scripts/generate-tenant-flows-eu-slow.mjs
 *   or: npm run i18n:gen-tenant-flows-eu-slow
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const gen = path.join(root, "scripts/generate-tenant-flows-eu-google.mjs");

const env = { ...process.env };
if (!env.I18N_TENANT_FLOW_BATCH_SIZE) env.I18N_TENANT_FLOW_BATCH_SIZE = "2";
if (!env.I18N_TENANT_FLOW_BATCH_DELAY_MS) env.I18N_TENANT_FLOW_BATCH_DELAY_MS = "3500";
if (!env.I18N_TENANT_FLOW_CHUNK_DELAY_MS) env.I18N_TENANT_FLOW_CHUNK_DELAY_MS = "600";

console.log(
  "Slow tenant-flows MT: BATCH_SIZE=%s BATCH_DELAY_MS=%s CHUNK_DELAY_MS=%s (set env to override)\n",
  env.I18N_TENANT_FLOW_BATCH_SIZE,
  env.I18N_TENANT_FLOW_BATCH_DELAY_MS,
  env.I18N_TENANT_FLOW_CHUNK_DELAY_MS,
);

const r = spawnSync(process.execPath, [gen], { cwd: root, stdio: "inherit", env });
process.exit(r.status === null ? 1 : r.status);
