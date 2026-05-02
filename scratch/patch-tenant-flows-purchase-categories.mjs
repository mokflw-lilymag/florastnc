import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.resolve(__dirname, "../src/i18n/messages");
const LOCALES = ["ko", "en", "vi", "zh", "ja", "es", "pt", "fr", "de", "ru"];

const pairs = [
  ["f02421", "식물", "Plants"],
  ["f02422", "부자재", "Floral supplies"],
  ["f02423", "바구니 / 화기", "Baskets & vases"],
  ["f02424", "소모품 및 부자재", "Consumables & accessories"],
  ["f02425", "조화", "Artificial flowers"],
  ["f02426", "프리저브드", "Preserved"],
  ["f02427", "포장재", "Packaging"],
  ["f02428", "리본", "Ribbon"],
  ["f02429", "{count}개 품목", "{count} items"],
];

for (const locale of LOCALES) {
  const file = path.join(MESSAGES, `${locale}.json`);
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const tf = { ...j.tenantFlows };
  for (const [key, ko, en] of pairs) {
    tf[key] = locale === "ko" ? ko : en;
  }
  j.tenantFlows = tf;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
}
console.log("patched purchase category keys", pairs.length);
