/**
 * Same as run-tenant-flows-eu-chunks.mjs, but each chunk invokes generate-tenant-flows-eu-slow.mjs
 * (extra-conservative unofficial Google MT pacing).
 *
 * Run: node scripts/run-tenant-flows-eu-chunks-slow.mjs
 *   or: npm run i18n:gen-tenant-flows-eu-chunks-slow
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const chunks = path.join(root, "scripts/run-tenant-flows-eu-chunks.mjs");
const env = {
  ...process.env,
  I18N_TENANT_FLOW_GEN_SCRIPT: "scripts/generate-tenant-flows-eu-slow.mjs",
};

console.log("Chunked tenant-flows MT using child: scripts/generate-tenant-flows-eu-slow.mjs\n");

const r = spawnSync(process.execPath, [chunks], { cwd: root, stdio: "inherit", env });
process.exit(r.status === null ? 1 : r.status);
