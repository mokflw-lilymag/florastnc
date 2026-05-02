import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.resolve(__dirname, "../src/i18n/messages");
const LOCALES = ["ko", "en", "vi", "zh", "ja", "es", "pt", "fr", "de", "ru"];

const pairs = [
  [
    "f02321",
    "이 배치의 모든 매입 확정을 취소하시겠습니까? 지출 내역도 함께 삭제됩니다.",
    "Cancel all purchase confirmations in this batch? Related expenses will also be removed.",
  ],
  ["f02322", "정말 삭제하시겠습니까?", "Are you sure you want to delete this?"],
  ["f02323", "기간", "Period"],
  ["f02324", "필터 초기화", "Reset filters"],
  ["f02325", "매입: {date}", "Purchased: {date}"],
  ["f02326", "상세수정", "Edit details"],
  ["f02327", "매입확정", "Confirm purchase"],
  ["f02328", "기본 단가 ₩{price}", "Ref. unit price ₩{price}"],
  ["f02329", "{date} 매입 내역", "Purchases ({date})"],
  ["f02330", "시장", "market"],
  ["f02331", "매입내역", "purchases"],
  [
    "f02332",
    "표는 높이가 제한되어 있어 일부 행만 보일 수 있으니, 안쪽을 스크롤하면 나머지 매장도 모두 확인할 수 있습니다.",
    "The table height is limited—scroll inside to see all stores.",
  ],
  ["f02333", "수입금액", "Revenue"],
  ["f02334", "필요경비", "Total expenses"],
  ["f02335", "매입비용", "Materials cost"],
  ["f02336", "매입비용 (꽃/자재)", "Materials (flowers/supplies)"],
  ["f02337", "인건비/급여", "Payroll"],
  ["f02338", "임차료", "Rent"],
  ["f02339", "수도광열비", "Utilities"],
  ["f02340", "운송비/차량유지비", "Transport & vehicle"],
  ["f02341", "광고선전비", "Advertising"],
  ["f02342", "기타경비", "Other expenses"],
  ["f02343", "{year}년 귀속 사업장 현황신고 요약", "Business status report summary ({year})"],
  ["f02344", "면세사업자 (화훼류)", "Tax-exempt business (floriculture)"],
  ["f02345", "수입금액 (총매출)", "Income (gross sales)"],
  ["f02346", "과세기간 총 매출액", "Total sales in period"],
  ["f02347", "재화의 매입액", "Cost of goods purchased"],
  ["f02348", "필요경비 합계", "Total deductible expenses"],
  ["f02349", "매입 + 임차 + 인건 + 광열 + 운송 + 기타", "Purchases + rent + payroll + utilities + transport + other"],
  ["f02350", "소득금액", "Net income"],
  ["f02351", "수입금액 - 필요경비", "Revenue − total expenses"],
  [
    "f02352",
    "본 자료는 앱에 등록된 데이터를 기반으로 자동 생성된 참고용 요약입니다.",
    "This summary is for reference only, generated from data recorded in the app.",
  ],
  [
    "f02353",
    "실제 세무 신고 시에는 반드시 세무사와 상담하시기 바랍니다.",
    "Consult a qualified tax advisor when filing official returns.",
  ],
  [
    "f02354",
    "누락된 매입/매출이 있을 수 있으며, 감가상각비 등 일부 항목은 별도 계산이 필요합니다.",
    "Some purchases or sales may be missing; depreciation and other items may require separate calculation.",
  ],
  [
    "f02355",
    "[{year}] {kind} 기초자료",
    "[{year}] {kind} reference data",
  ],
  ["f02356", "사업장 현황신고", "business status report"],
  ["f02357", "부가가치세 신고", "VAT return"],
  ["f02358", "생성일:", "Generated:"],
  ["f02359", "=== 수입금액 (매출) ===", "=== Revenue ==="],
  ["f02360", "총 수입금액", "Total revenue"],
  ["f02361", "총 주문건수", "Order count"],
  ["f02362", "=== 필요경비 내역 ===", "=== Expense breakdown ==="],
  ["f02363", "비용항목,금액", "Category,Amount"],
  ["f02365", "=== 소득금액 ===", "=== Net income ==="],
  ["f02366", "소득금액 (수입 - 경비)", "Net income (revenue − expenses)"],
  ["f02367", "=== 월별 수입/매입 현황 ===", "=== Monthly revenue & expenses ==="],
  ["f02368", "월,수입금액,필요경비,매입비용", "Month,Revenue,Total expenses,Materials cost"],
  ["f02369", "=== 거래처별 매입 내역 ===", "=== Purchases by supplier ==="],
  ["f02370", "거래처,매입금액,거래건수", "Supplier,Amount,Transactions"],
  ["f02371", "사업장현황신고", "business-status"],
  ["f02372", "부가가치세신고", "vat-return"],
  ["f02373", "기초자료", "reference"],
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
