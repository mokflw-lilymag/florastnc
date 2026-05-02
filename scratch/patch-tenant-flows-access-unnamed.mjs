import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.resolve(__dirname, "../src/i18n/messages");
const LOCALES = ["ko", "en", "vi", "zh", "ja", "es", "pt", "fr", "de", "ru"];

const pairs = [
  ["f02468", "이름 없음 ({id}…)", "Unnamed ({id}…)"],
  ["f02469", "접근 권한 제한", "Access restricted"],
  [
    "f02470",
    "요청하신 페이지에 접근할 수 있는 권한이 없습니다.",
    "You don't have permission to open this page.",
  ],
  [
    "f02471",
    "현재 이용 중인 플랜에는 {tier} 기능이 포함되어 있지 않습니다.",
    "Your current plan does not include {tier} access.",
  ],
  ["f02472", "해결 방법:", "What you can do"],
  [
    "f02473",
    "상단 메뉴의 [플랜 및 환경 설정]에서 플랜을 업그레이드하세요.",
    "Upgrade your plan under Plans & Settings in the top menu.",
  ],
  [
    "f02474",
    "관리자에게 문의하여 계정 권한을 확인하세요.",
    "Contact your administrator to confirm your account permissions.",
  ],
  ["f02475", "플랜 및 설정으로 이동", "Open Plans & Settings"],
  ["f02476", "이전 페이지로 돌아가기", "Go back"],
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
console.log("patched access + unnamed keys", pairs.length);
