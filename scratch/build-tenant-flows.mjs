import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const flat = JSON.parse(fs.readFileSync(path.join(__dirname, "tenant-flows-flat.json"), "utf8"));
const MESSAGES = path.resolve(__dirname, "../src/i18n/messages");
const LOCALES = ["ko", "en", "vi", "zh", "ja", "es", "pt", "fr", "de", "ru"];

function insertBeforeLanding(obj, key, val) {
  const entries = Object.entries(obj).filter(([k]) => k !== key);
  const idx = entries.findIndex(([k]) => k === "landing");
  if (idx === -1) throw new Error("landing key missing");
  return Object.fromEntries([...entries.slice(0, idx), [key, val], ...entries.slice(idx)]);
}

const sortedKo = Object.keys(flat).sort((a, b) => a.localeCompare(b, "ko"));
const koToKey = {};
const baseFlows = { ko: {}, en: {} };
let idx = 1;
for (const ko of sortedKo) {
  const key = `f${String(idx++).padStart(5, "0")}`;
  koToKey[ko] = key;
  baseFlows.ko[key] = ko;
  baseFlows.en[key] = flat[ko];
}

const extras = [
  ["f00787", { ko: "카페24 {count}건", en: "Cafe24 {count}" }],
  ["f00788", { ko: "네이버 {count}건", en: "Naver {count}" }],
  ["f00789", { ko: "🛒 새 주문 {count}건 동기화!", en: "🛒 Synced {count} new orders!" }],
  ["f00790", { ko: "{count}건의 주문 상태가 변경되었습니다.", en: "{count} orders updated." }],
  ["f00791", { ko: "{count}건의 주문이 삭제되었습니다.", en: "{count} orders deleted." }],
  ["f00792", { ko: "주문 상태가 '{label}'로 변경되었습니다.", en: "Order status changed to '{label}'." }],
  ["f00793", { ko: "결제 상태가 '{state}'로 변경되었습니다.", en: "Payment status changed to '{state}'." }],
  ["f00794", { ko: "전송 실패: {message}", en: "Export failed: {message}" }],
  ["f00795", { ko: "{n}건", en: "{n} orders" }],
  ["f00796", { ko: "{n}건", en: "{n} order" }],
  ["f00797", { ko: "전체 주문의 {pct}% 처리됨", en: "{pct}% of all orders completed" }],
  ["f00798", { ko: "선택된 {count}건을 삭제하시겠습니까?", en: "Delete {count} selected orders?" }],
  ["f00799", { ko: "{name}님에게 보낼 상품을 선택하고 정보를 입력하세요.", en: "Select items and fill details for {name}." }],
  ["f00800", { ko: "{shop}의 새로운 주문을 접수합니다.", en: "Create a new order for {shop}." }],
  ["f00801", { ko: "음성 인식 오류{suffix}", en: "Speech recognition error{suffix}" }],
  ["f00802", { ko: "{date} 기준 지점 정산 및 금고 관리", en: "Branch settlement & vault management for {date}" }],
  [
    "f00803",
    {
      ko: "예치금이 부족합니다. (충전 필요 금액: {amount})",
      en: "Insufficient wallet balance. Need: {amount}",
    },
  ],
  ["f00804", { ko: "주문 상태가 완료되었습니다.", en: "Order status completed." }],
  ["f00805", { ko: "주문 상태가 변경되었습니다.", en: "Order status updated." }],
  ["f00806", { ko: "{count}명의 고객 정보가 엑셀로 저장되었습니다.", en: "Saved {count} customers to Excel." }],
  ["f00807", { ko: "{count}명의 고객 정보가 최신 데이터로 동기화되었습니다.", en: "Synced {count} customers." }],
  [
    "f00808",
    {
      ko: "정말로 '{name}' 고객 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      en: "Delete '{name}'? This action cannot be undone.",
    },
  ],
];

for (const [key, { ko, en }] of extras) {
  baseFlows.ko[key] = ko;
  baseFlows.en[key] = en;
}

for (const locale of LOCALES) {
  const file = path.join(MESSAGES, `${locale}.json`);
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  if (j.tenantFlows) delete j.tenantFlows;
  const bundle = locale === "ko" ? baseFlows.ko : baseFlows.en;
  const out = insertBeforeLanding(j, "tenantFlows", bundle);
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log("patched", locale, Object.keys(bundle).length);
}

fs.writeFileSync(
  path.join(__dirname, "tenant-flow-ko-to-key.json"),
  JSON.stringify(koToKey, null, 2),
  "utf8"
);
console.log("wrote tenant-flow-ko-to-key.json keys:", Object.keys(koToKey).length);
