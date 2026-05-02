import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.resolve(__dirname, "../src/i18n/messages");
const LOCALES = ["ko", "en", "vi", "zh", "ja", "es", "pt", "fr", "de", "ru"];

const pairs = [
  ["f02401", "월간", "Monthly"],
  ["f02402", "3개월", "3 months"],
  ["f02403", "6개월", "6 months"],
  ["f02404", "연간 패키지", "Yearly"],
  ["f02405", "주문", "Orders"],
  ["f02406", "고객", "CRM"],
  ["f02407", "AI 스캔", "AI scans"],
  ["f02408", "추천", "Recommended"],
  ["f02409", "현재 플랜", "Current plan"],
  ["f02410", "처리 중…", "Processing…"],
  ["f02411", "구독하기", "Subscribe"],
  ["f02412", "적용", "Applied"],
  ["f02413", "엔터프라이즈 보안", "Enterprise security"],
  ["f02414", "AI OCR", "AI OCR"],
  ["f02415", "클라우드", "Cloud scale"],
  ["f02416", "VIP 컨시어지", "VIP concierge"],
  ["f02417", "기능 전체 비교", "Full feature comparison"],
  ["f02418", "플랫폼 코어", "Platform core"],
  ["f02419", "성장 대시보드", "Growth dashboard"],
  ["f02420", "게스트", "Guest"],
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
console.log("patched subscription keys", pairs.length);
