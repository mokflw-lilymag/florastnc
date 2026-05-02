import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.resolve(__dirname, "../src/i18n/messages");
const LOCALES = ["ko", "en", "vi", "zh", "ja", "es", "pt", "fr", "de", "ru"];
const flatRest = JSON.parse(fs.readFileSync(path.join(__dirname, "tenant-flows-flat-rest.json"), "utf8"));
let koToKey = JSON.parse(fs.readFileSync(path.join(__dirname, "tenant-flow-ko-to-key.json"), "utf8"));

function maxKeyNum(map) {
  let n = 0;
  for (const v of Object.values(map)) {
    const m = /^f(\d{5})$/.exec(v);
    if (m) n = Math.max(n, parseInt(m[1], 10));
  }
  return n;
}

let next = maxKeyNum(koToKey) + 1;
const sortedKo = Object.keys(flatRest).sort((a, b) => a.localeCompare(b, "ko"));
let added = 0;
for (const ko of sortedKo) {
  if (koToKey[ko]) continue;
  const key = `f${String(next++).padStart(5, "0")}`;
  koToKey[ko] = key;
  added++;
}

const koJson = JSON.parse(fs.readFileSync(path.join(MESSAGES, "ko.json"), "utf8"));
const enJson = JSON.parse(fs.readFileSync(path.join(MESSAGES, "en.json"), "utf8"));
const flowsKo = { ...koJson.tenantFlows };
const flowsEn = { ...enJson.tenantFlows };

for (const ko of sortedKo) {
  const key = koToKey[ko];
  const en = flatRest[ko];
  if (!(key in flowsKo)) {
    flowsKo[key] = ko;
    flowsEn[key] = en;
  }
}

for (const locale of LOCALES) {
  const file = path.join(MESSAGES, `${locale}.json`);
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const prev = j.tenantFlows || {};
  const merged = { ...prev };
  for (const ko of sortedKo) {
    const key = koToKey[ko];
    const en = flatRest[ko];
    if (!(key in merged)) {
      if (locale === "ko") merged[key] = ko;
      else merged[key] = en;
    }
  }
  j.tenantFlows = merged;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
}

fs.writeFileSync(path.join(__dirname, "tenant-flow-ko-to-key.json"), JSON.stringify(koToKey, null, 2) + "\n");
console.log("new keys assigned:", added, "total koToKey:", Object.keys(koToKey).length);
console.log("tenantFlows keys in ko:", Object.keys(JSON.parse(fs.readFileSync(path.join(MESSAGES, "ko.json"), "utf8")).tenantFlows).length);
