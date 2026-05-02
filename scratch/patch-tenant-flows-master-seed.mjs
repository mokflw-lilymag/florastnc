import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.resolve(__dirname, "../src/i18n/messages");
const LOCALES = ["ko", "en", "vi", "zh", "ja", "es", "pt", "fr", "de", "ru"];

const pairs = [
  ["f02434", "시드 정의 합계", "Seed total"],
  ["f02435", "건 · 신규", " · new"],
  ["f02436", "스킵", "Skip"],
  ["f02437", "이 시드 섹션에 해당 항목이 없습니다.", "No rows in this seed section."],
  ["f02438", "신규 적용", "New"],
  ["f02439", "건", ""],
  ["f02440", "건너뜀", "Skipped"],
  ["f02441", "이 미리보기가 보여 주는 것:", "What this preview shows:"],
  ["f02442", "선택한", "selected"],
  ["f02443", "매장 DB", "store DB"],
  ["f02444", "에 대해,", " —"],
  ["f02445", "서버가 시드를", "the server runs the seed with"],
  ["f02446", "으로 돌려", " mode, calculating"],
  ["f02447", "실제로 INSERT될 행 수", "rows to INSERT"],
  ["f02448", "와", "and"],
  ["f02449", "이미 존재해 건너뛸 행 수", "rows skipped as existing"],
  ["f02450", "를 계산한 결과입니다.", "."],
  ["f02451", "아래 초록·회색 막대는", "The green and gray bars below are"],
  ["f02452", "업로드·적용 진행률이 아닙니다.", "not real-time upload or apply progress."],
  [
    "f02453",
    "응답 완료 후 집계된 신규/스킵 비율의",
    "They are a static summary of the new vs. skipped split after the response.",
  ],
  ["f02454", "정적 요약", "Static summary"],
  ["f02455", "신규 vs 스킵 비율", "New vs. skipped"],
  ["f02456", "배송비", "Delivery"],
  ["f02457", "자치구·기타 구역", "Regional rows:"],
  ["f02458", "건을", "rows to"],
  [
    "f02459",
    "에 UPSERT하고, 일반 설정의 배송 필드 병합",
    " upsert on delivery_fees_by_region, merging general delivery fields:",
  ],
  ["f02460", "예", "Yes"],
  ["f02461", "아니오", "No"],
  [
    "f02462",
    " (기본 배송료·무료배송 기준만)",
    " (base delivery fee and free-delivery threshold only).",
  ],
  ["f02463", "는 건수 비율이 아니라,", " are not ratio-based;"],
  ["f02464", "상품·자재·지출", "product, material, and expense"],
  [
    "f02465",
    "세트를 시드 버전 내용으로",
    "values are merged from the seed version and",
  ],
  ["f02466", "통째로 덮어씁니다", "are fully overwritten"],
  ["f02467", "(적용 실행 시 1회 반영).", "(applied once per run)."],
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
console.log("patched master-seed keys", pairs.length);
