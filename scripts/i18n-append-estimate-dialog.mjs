import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../src/i18n/messages");
const files = ["ko.json", "en.json", "vi.json", "zh.json", "ja.json", "es.json", "pt.json", "fr.json", "de.json", "ru.json"];

const ko = {
  f02605: "귀하 (수신)",
  f02606: "수신 회사명",
  f02607: "담당자:",
  f02608: "담당자 이름",
  f02609: "님 귀하",
  f02610: "(인)",
  f02611: "공급자 (발행)",
  f02612: "등록번호",
  f02613: "대 표",
  f02614: "사업장",
  f02615: "공급가액",
  f02616: "부가세(10%)",
  f02617: "최종 견적합계",
  f02618: "품명 및 규격",
  f02619: "합 계 금 액",
  f02620: "(부가세 면세)",
  f02621: "발행일자",
  f02622: "연락처:",
  f02623: "이메일:",
  f02624: "예: 계절꽃다발 (L사이즈)",
  f02625: "김미화",
  f02626: "서울특별시 서초구 꽃시장길 12",
  f02627: "name@example.com",
};

const en = {
  f02605: "To (recipient)",
  f02606: "Recipient company",
  f02607: "Contact:",
  f02608: "Contact name",
  f02609: "Dear",
  f02610: "(Seal)",
  f02611: "Supplier (issuer)",
  f02612: "Reg. no.",
  f02613: "CEO",
  f02614: "Address",
  f02615: "Supply value",
  f02616: "VAT (10%)",
  f02617: "Total estimate",
  f02618: "Description",
  f02619: "Grand total",
  f02620: "(VAT exempt)",
  f02621: "Issue date",
  f02622: "Phone:",
  f02623: "Email:",
  f02624: "e.g. Seasonal bouquet (L)",
  f02625: "Jane Kim",
  f02626: "12 Flower Market St., Seocho-gu, Seoul",
  f02627: "name@example.com",
};

const vi = {
  f02605: "Kính gửi (người nhận)",
  f02606: "Công ty nhận",
  f02607: "Người liên hệ:",
  f02608: "Tên người liên hệ",
  f02609: "Kính gửi",
  f02610: "(Dấu)",
  f02611: "Nhà cung cấp (phát hành)",
  f02612: "Mã số ĐKKD",
  f02613: "Đại diện",
  f02614: "Địa chỉ",
  f02615: "Giá trị hàng",
  f02616: "VAT (10%)",
  f02617: "Tổng báo giá",
  f02618: "Tên & quy cách",
  f02619: "Tổng cộng",
  f02620: "(Miễn VAT)",
  f02621: "Ngày phát hành",
  f02622: "Điện thoại:",
  f02623: "Email:",
  f02624: "VD: Bó hoa theo mùa (cỡ L)",
  f02625: "Kim Mi-hwa",
  f02626: "12 Đường chợ hoa, Seocho-gu, Seoul",
  f02627: "ten@example.com",
};

for (const file of files) {
  const fp = path.join(dir, file);
  const j = JSON.parse(fs.readFileSync(fp, "utf8"));
  const src = file === "ko.json" ? ko : file === "vi.json" ? vi : en;
  Object.assign(j.tenantFlows, src);
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n", "utf8");
}
console.log("OK: f02605–f02627 merged into tenantFlows for all locales.");
