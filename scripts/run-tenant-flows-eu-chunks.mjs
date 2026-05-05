/**
 * Runs generate-tenant-flows-eu-google.mjs repeatedly over f-key numeric ranges
 * so each subprocess stays smaller (fewer unique strings) and can be resumed.
 *
 * Env (optional):
 *   I18N_TENANT_FLOW_CHUNK_STEP — width of each range (default 350)
 *   I18N_TENANT_FLOW_INTER_CHUNK_MS — pause between successful chunks (default 12000)
 *   I18N_TENANT_FLOW_GEN_SCRIPT — child script path (default: generate-tenant-flows-eu-google.mjs).
 *     Set to scripts/generate-tenant-flows-eu-slow.mjs for extra-conservative unofficial pacing.
 *   I18N_TENANT_FLOW_TARGETS, GOOGLE_TRANSLATE_API_KEY, etc. are forwarded to the child.
 *
 * Run: node scripts/run-tenant-flows-eu-chunks.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const enPath = path.join(root, "src/i18n/messages/en.json");
const genScript = path.isAbsolute(process.env.I18N_TENANT_FLOW_GEN_SCRIPT || "")
  ? process.env.I18N_TENANT_FLOW_GEN_SCRIPT
  : path.join(root, process.env.I18N_TENANT_FLOW_GEN_SCRIPT || "scripts/generate-tenant-flows-eu-google.mjs");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function maxFNumFromEn() {
  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const tf = en.tenantFlows;
  if (!tf || typeof tf !== "object") throw new Error("en.json missing tenantFlows");
  let m = 0;
  for (const k of Object.keys(tf)) {
    const mm = /^f(\d+)$/.exec(k);
    if (mm) m = Math.max(m, parseInt(mm[1], 10));
  }
  if (m < 1) throw new Error("No fNNNNN keys in en.tenantFlows");
  return m;
}

async function main() {
  const step = Math.max(50, parseInt(process.env.I18N_TENANT_FLOW_CHUNK_STEP || "350", 10) || 350);
  const pauseMs = Math.max(0, parseInt(process.env.I18N_TENANT_FLOW_INTER_CHUNK_MS || "12000", 10) || 12000);
  const maxF = maxFNumFromEn();

  console.log(`tenantFlows f-keys up to ${maxF}; chunk step ${step}; pause ${pauseMs}ms between chunks`);
  console.log("Child:", genScript, "\n");

  let chunk = 0;
  for (let lo = 1; lo <= maxF; lo += step) {
    chunk++;
    const hi = Math.min(lo + step - 1, maxF);
    const label = `f${String(lo).padStart(5, "0")}–f${String(hi).padStart(5, "0")}`;
    console.log(`\n========== Chunk ${chunk}: ${label} ==========\n`);

    const env = {
      ...process.env,
      I18N_TENANT_FLOW_F_MIN: String(lo),
      I18N_TENANT_FLOW_F_MAX: String(hi),
    };

    const r = spawnSync(process.execPath, [genScript], {
      cwd: root,
      stdio: "inherit",
      env,
    });

    if (r.status !== 0 && r.status != null) {
      console.error(`\nChunk ${label} failed with exit ${r.status}. Fix and re-run; cache merges partial progress.`);
      process.exit(r.status);
    }

    if (hi >= maxF) break;
    if (pauseMs > 0) {
      console.log(`\n…sleep ${pauseMs}ms before next chunk…`);
      await delay(pauseMs);
    }
  }

  console.log("\nAll chunks finished.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
