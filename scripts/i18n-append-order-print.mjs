import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../src/i18n/messages");
const files = ["ko.json", "en.json", "vi.json", "zh.json", "ja.json", "es.json", "pt.json", "fr.json", "de.json", "ru.json"];

const ko = {
  f02587: "새로운 화원",
  f02588: "결제정보",
  f02589: "금액:",
  f02590: "배송비:",
  f02591: "결제수단:",
  f02592: "인수자성명",
  f02593: "연락처 미등록",
  f02594: "주소 미등록",
  f02595: "입금계좌:",
  f02596: "웹사이트",
  f02597: "축발전 / 祝發展",
  f02598: "축개업 / 祝開業",
  f02599: "축승진 / 祝昇進",
  f02600: "축영전 / 祝榮轉",
  f02601: "근조 / 謹弔",
  f02602: "축결혼 / 祝結婚",
  f02603: "010-0000-0000",
  f02604: "이페이",
};

const en = {
  f02587: "New flower shop",
  f02588: "Payment",
  f02589: "Amount:",
  f02590: "Delivery fee:",
  f02591: "Payment method:",
  f02592: "Recipient signature",
  f02593: "Contact not set",
  f02594: "Address not set",
  f02595: "Bank account:",
  f02596: "Website",
  f02597: "Best wishes for growth / 祝發展",
  f02598: "Congrats on opening / 祝開業",
  f02599: "Congrats on promotion / 祝昇進",
  f02600: "Congrats on your move / 祝榮轉",
  f02601: "Condolences / 謹弔",
  f02602: "Congrats on wedding / 祝結婚",
  f02603: "010-0000-0000",
  f02604: "E-Pay",
};

const vi = {
  f02587: "Tiệm hoa mới",
  f02588: "Thanh toán",
  f02589: "Số tiền:",
  f02590: "Phí giao:",
  f02591: "Phương thức:",
  f02592: "Người nhận ký",
  f02593: "Chưa có liên hệ",
  f02594: "Chưa có địa chỉ",
  f02595: "Tài khoản:",
  f02596: "Website",
  f02597: "Chúc phát triển / 祝發展",
  f02598: "Chúc khai trương / 祝開業",
  f02599: "Chúc thăng chức / 祝昇進",
  f02600: "Chúc nhận chức / 祝榮轉",
  f02601: "Phân ưu / 謹弔",
  f02602: "Chúc cưới / 祝結婚",
  f02603: "010-0000-0000",
  f02604: "E-Pay",
};

for (const file of files) {
  const fp = path.join(dir, file);
  const j = JSON.parse(fs.readFileSync(fp, "utf8"));
  const src = file === "ko.json" ? ko : file === "vi.json" ? vi : en;
  Object.assign(j.tenantFlows, src);
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n", "utf8");
}
console.log("OK: f02587–f02604 merged into tenantFlows for all locales.");
