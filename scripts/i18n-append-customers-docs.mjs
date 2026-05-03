import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../src/i18n/messages");
const files = ["ko.json", "en.json", "vi.json", "zh.json", "ja.json", "es.json", "pt.json", "fr.json", "de.json", "ru.json"];

const ko = {
  f02628: "종류",
  f02629: "수신인",
  f02630: "내용 요약",
  f02631: "총 금액",
  f02632: "생성 일자",
  f02633: "폐기 예정",
  f02634: "관리",
  f02635: "다시 보고 인쇄하기",
  f02636: "로그 삭제",
  f02637: "아래와 같이 거래 내역을 증명하오니 확인하여 주시기 바랍니다.",
  f02638: "{title} 발행 항목 선택",
  f02639: "{title} 최종 확인 및 발행",
  f02640: "{name} 고객님의 거래 내역을 조회하여 명세서/영수증에 포함할 항목을 선택하세요.",
  f02641: "인쇄 전 문서의 최종 상태를 확인하세요. 수정이 필요하면 이전 단계로 돌아갈 수 있습니다.",
  f02642: "조회 시작일",
  f02643: "조회 종료일",
  f02644: "날짜 선택",
  f02645: "거래 내역 일자 및 품목",
  f02646: "※ 발행 문서는 관리 목적으로 30일간 보관됩니다.",
  f02647: "보관 기간이 지나면 자동 폐기되오니, 반드시 PDF로 다운로드 받으시기 바랍니다.",
  f02648: "내용 미리보기",
  f02649: "조회 기간 수정",
};

const en = {
  f02628: "Type",
  f02629: "Recipient",
  f02630: "Summary",
  f02631: "Total",
  f02632: "Created",
  f02633: "Expires",
  f02634: "Actions",
  f02635: "Open and print again",
  f02636: "Delete log",
  f02637: "Please verify the transaction details certified below.",
  f02638: "Choose lines for {title}",
  f02639: "Review and issue {title}",
  f02640: "Look up orders for {name} and select lines to include on the statement or receipt.",
  f02641: "Check the document before printing. You can go back to the previous step to edit.",
  f02642: "Start date",
  f02643: "End date",
  f02644: "Pick a date",
  f02645: "Date & line items",
  f02646: "※ Issued documents are kept for 30 days for management purposes.",
  f02647: "After retention they are discarded automatically—download a PDF to keep a copy.",
  f02648: "Preview",
  f02649: "Change date range",
};

const vi = {
  f02628: "Loại",
  f02629: "Người nhận",
  f02630: "Tóm tắt",
  f02631: "Tổng tiền",
  f02632: "Tạo lúc",
  f02633: "Hết hạn",
  f02634: "Thao tác",
  f02635: "Mở và in lại",
  f02636: "Xóa nhật ký",
  f02637: "Vui lòng xác nhận các giao dịch được chứng nhận bên dưới.",
  f02638: "Chọn dòng cho {title}",
  f02639: "Xem lại và phát hành {title}",
  f02640: "Tra cứu đơn của {name} và chọn dòng đưa vào bảng kê hoặc biên lai.",
  f02641: "Kiểm tra tài liệu trước khi in. Có thể quay lại bước trước để sửa.",
  f02642: "Từ ngày",
  f02643: "Đến ngày",
  f02644: "Chọn ngày",
  f02645: "Ngày & dòng hàng",
  f02646: "※ Tài liệu phát hành được lưu 30 ngày để quản lý.",
  f02647: "Hết hạn sẽ tự xóa—hãy tải PDF để giữ bản copy.",
  f02648: "Xem trước",
  f02649: "Sửa khoảng ngày",
};

for (const file of files) {
  const fp = path.join(dir, file);
  const j = JSON.parse(fs.readFileSync(fp, "utf8"));
  const src = file === "ko.json" ? ko : file === "vi.json" ? vi : en;
  Object.assign(j.tenantFlows, src);
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n", "utf8");
}
console.log("OK: f02628–f02649 merged into tenantFlows for all locales.");
