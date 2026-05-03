import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../src/i18n/messages");
const files = ["ko.json", "en.json", "vi.json", "zh.json", "ja.json", "es.json", "pt.json", "fr.json", "de.json", "ru.json"];

const ko = {
  f02517: "현재 입력값으로 적용",
  f02518: "검색 결과 (최대 50개)",
  f02519: "예: 생화 사입(장미 10단), 월세 등",
  f02520: "앨범·여러 장 선택 · 최대 {max}장",
  f02521: "외부 링크로만 첨부 (구글 드라이브 등)",
  f02522:
    "* 앨범 다중 선택·연속 촬영·파일 여러 장은 병렬 분석 후 합산합니다. 증빙 미리보기는 첫 번째 영수증만 표시됩니다.",
  f02523: "영수증이 첨부되었습니다. 위쪽 미리보기에서 확인하세요.",
  f02524: "수정 완료",
  f02525: "품목 {n}개 일괄 등록",
  f02526: "지출 등록하기",
  f02527: "지출 상세",
  f02528: "조회 전용입니다. 수정·삭제는 목록 맨 오른쪽 버튼을 사용하세요.",
  f02529: "새 탭에서 크게 보기",
  f02530: "닫기",
  f02531:
    "같은 거래일·같은 거래처·같은 금액이거나, 같은 증빙 링크인 기존 지출이 있습니다. 목록을 확인한 뒤 등록 여부를 선택하세요.",
  f02532:
    "같은 거래일·같은 거래처에 비슷한 품목으로 이미 등록된 지출이 있으나 금액이 다릅니다. 정정 영수증이면 기존 건을 수정할 수 있습니다.",
  f02533: "같은 날·같은 거래처에, 이번에 입력한 품목·내용과 ",
  f02534: "이번 입력 합계:",
  f02535:
    "여러 건이면 목록에서 맞는 건을 고른 뒤 표에서 직접 수정할 수도 있습니다. 여기서는 가장 최근 등록 건부터 엽니다.",
  f02536: "행을 누르면 상세(조회 전용)가 열립니다. 수정·삭제는 오른쪽 아이콘을 사용하세요.",
  f02537: "값입니다. 위쪽(또는 왼쪽) 원본과 다르면 이 화면에서 고친 뒤 저장하세요.",
  f02538: "영수증 원본",
  f02539: "영수증",
  f02540: "화면 90° 회전 (글자 방향에 맞출 때)",
  f02541: "좌우 반전",
  f02542: "연속 촬영 {current}/{max} · 셔터마다 추가 · 완료 시 일괄 분석",
  f02543: "마지막 촬영 취소",
  f02544: "완료 ({n})",
};

const en = {
  f02517: "Apply current entry",
  f02518: "Search results (max 50)",
  f02519: "e.g. Fresh flower purchase (10 bunches of roses), rent, etc.",
  f02520: "Album / multi-select · up to {max} sheets",
  f02521: "Attach via external link only (Google Drive, etc.)",
  f02522:
    "* Album multi-select, burst capture, and multiple files are merged after parallel analysis. Proof preview shows the first receipt only.",
  f02523: "Receipt attached. Check the preview above.",
  f02524: "Save changes",
  f02525: "Register {n} line items at once",
  f02526: "Register expense",
  f02527: "Expense detail",
  f02528: "View only. Use the buttons at the far right of the list to edit or delete.",
  f02529: "Open large in new tab",
  f02530: "Close",
  f02531:
    "A similar expense exists (same date, supplier, amount, or same proof link). Review the list before you register.",
  f02532:
    "On the same date and supplier, similar items exist but amounts differ. If this is a corrected receipt, you can edit the existing entry.",
  f02533: "On the same day and supplier, the line items and notes you entered, and ",
  f02534: "This entry total:",
  f02535:
    "If several rows match, pick one in the list or edit in the table. Here we open the most recently registered first.",
  f02536: "Click a row to open read-only detail. Use the icons on the right to edit or delete.",
  f02537:
    " values. If they differ from the original on the left or above, correct them here before saving.",
  f02538: "Receipt original",
  f02539: "Receipt",
  f02540: "Rotate 90° (to match text orientation)",
  f02541: "Flip horizontally",
  f02542: "Burst {current}/{max} · add each shot · batch analysis on finish",
  f02543: "Undo last capture",
  f02544: "Done ({n})",
};

const vi = {
  f02517: "Áp dụng giá trị đang nhập",
  f02518: "Kết quả tìm kiếm (tối đa 50)",
  f02519: "VD: nhập hoa tươi (10 bó hồng), tiền thuê, v.v.",
  f02520: "Album / chọn nhiều · tối đa {max} tấm",
  f02521: "Chỉ đính kèm bằng liên kết bên ngoài (Google Drive, v.v.)",
  f02522:
    "* Chọn nhiều từ album, chụp liên tục hoặc nhiều tệp sẽ được gộp sau phân tích song song. Xem trước chứng từ chỉ hiện hóa đơn đầu tiên.",
  f02523: "Đã đính kèm hóa đơn. Xem bản xem trước phía trên.",
  f02524: "Lưu thay đổi",
  f02525: "Ghi nhận {n} dòng cùng lúc",
  f02526: "Ghi nhận chi phí",
  f02527: "Chi tiết chi phí",
  f02528: "Chỉ xem. Sửa/xóa bằng nút ở cuối bên phải danh sách.",
  f02529: "Mở lớn trong tab mới",
  f02530: "Đóng",
  f02531:
    "Đã có khoản chi tương tự (cùng ngày, nhà cung cấp, số tiền hoặc cùng liên kết chứng từ). Xem danh sách rồi chọn có ghi hay không.",
  f02532:
    "Cùng ngày và nhà cung cấp, đã có khoản tương tự nhưng số tiền khác. Nếu đây là hóa đơn sửa, bạn có thể sửa bản ghi cũ.",
  f02533: "Cùng ngày và nhà cung cấp, các dòng và ghi chú bạn nhập, và ",
  f02534: "Tổng lần nhập này:",
  f02535:
    "Nếu có nhiều dòng khớp, chọn một trong danh sách hoặc sửa trực tiếp trên bảng. Ở đây mở bản ghi mới nhất trước.",
  f02536: "Nhấn một dòng để xem chi tiết (chỉ đọc). Sửa/xóa bằng biểu tượng bên phải.",
  f02537:
    " giá trị. Nếu khác bản gốc bên trái hoặc phía trên, sửa ở đây trước khi lưu.",
  f02538: "Hóa đơn gốc",
  f02539: "Hóa đơn",
  f02540: "Xoay 90° (khớp hướng chữ)",
  f02541: "Lật ngang",
  f02542: "Chụp liên tục {current}/{max} · mỗi lần bấm thêm một · phân tích hàng loạt khi xong",
  f02543: "Hoàn tác lần chụp cuối",
  f02544: "Xong ({n})",
};

for (const file of files) {
  const fp = path.join(dir, file);
  const j = JSON.parse(fs.readFileSync(fp, "utf8"));
  const src = file === "ko.json" ? ko : file === "vi.json" ? vi : en;
  Object.assign(j.tenantFlows, src);
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n", "utf8");
}
console.log("OK: f02517–f02544 merged into tenantFlows for all locales.");
