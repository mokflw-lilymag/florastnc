/**
 * FloXync PP Bridge 설치 ZIP 생성 → public/downloads/Floxync-Bridge-Setup.zip
 * 사용: node scripts/build-bridge-zip.mjs  (ppbridge.exe 빌드 후)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bridgeDir = path.join(root, "bridge-app");
const outZip = path.join(root, "public", "downloads", "Floxync-Bridge-Setup.zip");
const publicExe = path.join(root, "public", "downloads", "ppbridge.exe");

function readBridgeVersion() {
  const content = fs.readFileSync(path.join(bridgeDir, "index.js"), "utf8");
  const match = content.match(/const BRIDGE_VERSION\s*=\s*['"]([^'"]+)['"]/);
  return match?.[1] ?? "unknown";
}

const version = readBridgeVersion();
const exePath = path.join(bridgeDir, "ppbridge.exe");
if (!fs.existsSync(exePath)) {
  console.error("[build-bridge-zip] bridge-app/ppbridge.exe missing — run: npm run build:ppbridge");
  process.exit(1);
}

function safeReplaceFile(src, dest) {
  const tmp = `${dest}.tmp-${Date.now()}`;
  fs.copyFileSync(src, tmp);
  try {
    fs.unlinkSync(dest);
  } catch (_) {}
  fs.renameSync(tmp, dest);
}

fs.mkdirSync(path.dirname(outZip), { recursive: true });
safeReplaceFile(exePath, publicExe);

const files = [
  "ppbridge.exe",
  "install.bat",
  "SumatraPDF-3.4.6-32.exe",
  "receipt-template.html",
  "receipt-pickup.html",
  "receipt-delivery-shop.html",
  "receipt-delivery-driver.html",
  "receipt-daily-settlement.html",
  "receipt-market-list.html",
  "receipt-labels.json",
  "receipt-i18n.js",
];

const zip = new AdmZip();
for (const name of files) {
  const full = path.join(bridgeDir, name);
  if (!fs.existsSync(full)) {
    console.warn(`[build-bridge-zip] skip missing: ${name}`);
    continue;
  }
  zip.addLocalFile(full);
}

zip.addFile(
  "README.txt",
  Buffer.from(
    `FloXync PP Bridge ${version}\n\n1. Extract this ZIP to a folder\n2. Right-click install.bat → Run as administrator\n3. Refresh Floxync web app — header should show PP ON\n\nLog: %APPDATA%\\FloxyncBridge\\daemon.log\n`,
    "utf8",
  ),
);

const tmpZip = `${outZip}.tmp-${Date.now()}`;
zip.writeZip(tmpZip);
try {
  fs.unlinkSync(outZip);
} catch (_) {}
fs.renameSync(tmpZip, outZip);
const mb = (fs.statSync(outZip).size / (1024 * 1024)).toFixed(1);
console.log(`[build-bridge-zip] wrote ${outZip} (${mb} MB, ${version})`);
