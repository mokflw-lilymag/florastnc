import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.resolve(__dirname, "../src/i18n/messages");
const LOCALES = ["ko", "en", "vi", "zh", "ja", "es", "pt", "fr", "de", "ru"];

const pairs = [
  ["f02300", "{count}개의 거래처가 등록되었습니다.", "{count} suppliers imported."],
  ["f02301", "이미지 업로드 중 오류: {message}", "Image upload failed: {message}"],
  [
    "f02302",
    "상점 정보가 저장되었습니다. 운영 통화는 {currency}로 적용되었습니다.",
    "Store info saved. Operating currency set to {currency}.",
  ],
  ["f02303", "... 외 {n}개 항목", "... and {n} more"],
  [
    "f02304",
    "배치 [{batch}] 내의 모든 품목({count}개)을 삭제하시겠습니까?",
    "Delete all items in batch [{batch}]?",
  ],
  ["f02305", "{count}개의 상품이 등록되었습니다.", "{count} products imported."],
  ["f02306", "{count}개의 샘플 상품이 등록되었습니다.", "{count} sample products imported."],
  [
    "f02307",
    "정말로 '{name}' 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
    'Delete "{name}"? This cannot be undone.',
  ],
  ["f02308", "{provider} 토큰이 수동으로 등록되었습니다.", "{provider} token saved manually."],
  ["f02309", "{provider} 계정이 성공적으로 연동되었습니다!", "{provider} connected."],
  ["f02310", "감동을 전하는 오늘의 꽃 선물", "Today's blooms that touch hearts"],
  [
    "f02311",
    "최신 유행하는 '꽃집' 브랜딩 트렌드를 반영하여 신뢰도 있는 문장을 사용합니다.",
    "Follow current florist-brand trends with trustworthy wording.",
  ],
  [
    "f02312",
    "최고 관리자는 각 SNS 공급자(Meta, Google 등)의 공식 개발자 앱을 등록합니다. 이는 플랫폼 전체의 '통로'를 여는 작업입니다.",
    'Operators register official developer apps with each provider (Meta, Google, etc.) to open the platform "pipe."',
  ],
  [
    "f02313",
    "사용자는 본인의 계정으로 일회성 로그인을 수행하여 '접근 토큰(Access Token)'을 발급받습니다. 이 토큰이 있어야만 AI가 사장님 대신 글을 올릴 수 있습니다.",
    "You sign in once to issue an access token. The AI can only post on your behalf with that token.",
  ],
  [
    "f02314",
    "인스타그램의 경우 반드시 '비즈니스 계정'으로 전환되어 있어야 자동 업로드가 지원됩니다.",
    "Instagram auto-upload requires a Business (or Creator) account.",
  ],
  ["f02315", "{name} 공식 연동 시작", "Connect {name}"],
  ["f02316", "{name} 로그인 인증 완료", "Save {name} credentials"],
  [
    "f02317",
    "{count}건의 주문이 주문 목록에 추가되었습니다. 새로고침해 주세요.",
    "{count} orders added. Please refresh.",
  ],
  [
    "f02318",
    "'{name}' 업무를 마스터 리스트에서 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.",
    "Delete '{name}' from master list?\nThis cannot be undone.",
  ],
  ["f02319", "{count}개의 자재가 등록되었습니다.", "{count} materials imported."],
  ["f02320", "{count}개의 샘플 자재가 등록되었습니다.", "{count} sample materials imported."],
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
console.log("patched", pairs.length, "keys");
