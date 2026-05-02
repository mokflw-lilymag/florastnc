import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.resolve(__dirname, "../src/i18n/messages");
const LOCALES = ["ko", "en", "vi", "zh", "ja", "es", "pt", "fr", "de", "ru"];

const pairs = [
  ["f02374", "규격", "Spec"],
  ["f02375", "색상", "Color"],
  ["f02376", "업체명", "Company name"],
  ["f02377", "주요품목", "Specialty"],
  ["f02378", "사업자번호", "Business registration no."],
  ["f02379", "현재 재고", "Current stock"],
  ["f02380", "자재 정보 수정", "Edit material"],
  ["f02381", "새 자재 등록", "New material"],
  [
    "f02382",
    "재고 관리를 위해 자재의 상세 정보를 입력해 주세요.",
    "Enter material details to track inventory.",
  ],
  ["f02383", "중분류 선택", "Select subcategory"],
  ["f02384", "중분류 직접 입력", "Enter subcategory"],
  ["f02385", "ea, 롤 등", "e.g. ea, roll"],
  ["f02386", "빨강, #FF0000", "e.g. Red, #FF0000"],
  ["f02387", "공급업체 선택", "Select supplier"],
  ["f02388", "거래처 검색...", "Search suppliers..."],
  ["f02389", "직접 입력 또는 선택안함", "Enter manually or skip"],
  [
    "f02390",
    "직접 입력 (위에서 선택하지 않은 경우)",
    "Manual entry if you did not pick one above",
  ],
  [
    "f02391",
    "이 페이지에 표시할 자재가 없습니다. 위의 이전 페이지 버튼으로 돌아가 보거나 새로고침 해 보세요.",
    "No materials on this page. Try the previous page or refresh.",
  ],
  ["f02392", "주요품목(유형) 선택", "Select specialty (type)"],
  ["f02393", "선택 없음", "None"],
  ["f02394", "생화", "Fresh cut flowers"],
  ["f02395", "분화", "Potted plants"],
  ["f02396", "서양란", "Cymbidium"],
  ["f02397", "동양란", "Oriental orchid"],
  ["f02398", "화환", "Standing arrangement"],
  ["f02399", "자재(포장/화기등)", "Supplies (wrap, vases, etc.)"],
  ["f02400", "유형: ", "Type: "],
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
