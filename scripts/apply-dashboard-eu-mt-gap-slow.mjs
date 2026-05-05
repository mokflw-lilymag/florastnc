/**
 * Runs apply-dashboard-eu-mt-gap.mjs with extra-conservative unofficial-API pacing.
 * Only sets env vars that are not already defined.
 *
 * Run: node scripts/apply-dashboard-eu-mt-gap-slow.mjs
 *   or: npm run i18n:apply-dashboard-eu-mt-gap-slow
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const script = path.join(root, "scripts/apply-dashboard-eu-mt-gap.mjs");

const env = { ...process.env };
if (!env.I18N_DASHBOARD_BATCH_SIZE) env.I18N_DASHBOARD_BATCH_SIZE = "1";
if (!env.I18N_DASHBOARD_BATCH_DELAY_MS) env.I18N_DASHBOARD_BATCH_DELAY_MS = "3500";
if (!env.I18N_DASHBOARD_CHUNK_DELAY_MS) env.I18N_DASHBOARD_CHUNK_DELAY_MS = "600";

console.log(
  "Slow dashboard EU gap MT: BATCH_SIZE=%s BATCH_DELAY_MS=%s CHUNK_DELAY_MS=%s (set env to override)\n",
  env.I18N_DASHBOARD_BATCH_SIZE,
  env.I18N_DASHBOARD_BATCH_DELAY_MS,
  env.I18N_DASHBOARD_CHUNK_DELAY_MS,
);

const r = spawnSync(process.execPath, [script], { cwd: root, stdio: "inherit", env });
process.exit(r.status === null ? 1 : r.status);
