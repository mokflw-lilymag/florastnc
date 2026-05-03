import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../src/i18n/messages");
const files = ["ko.json", "en.json", "vi.json", "zh.json", "ja.json", "es.json", "pt.json", "fr.json", "de.json", "ru.json"];

const ko = {
  f02483: "지출 내역과 금액을 정확히 입력해 주세요.",
  f02484: "영수증 이미지 파일(JPG, PNG)을 선택해 주세요.",
  f02485: "나머지는 제외되었습니다. 필요하면 나누어 등록해 주세요.",
  f02486: "AI가 영수증을 분석하고 최적화 중입니다...",
  f02487: "응답 없음",
  f02488: "영수증에서 유효한 정보를 찾지 못했습니다.",
  f02489: "AI 분석에 실패했습니다.",
  f02490: "현재 브라우저에서 카메라 기능을 지원하지 않습니다. 파일 불러오기를 이용해 주세요.",
  f02491: "기기에 연결된 카메라를 찾을 수 없습니다.",
  f02492: "카메라 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요.",
  f02493: "촬영된 영수증이 없습니다.",
  f02494: "지출 내역을 삭제하시겠습니까?",
  f02495: "{name} 사입",
  f02496: "매입 연동",
  f02497: "있음",
  f02498: "정보 없음",
  f02499: "한 번에 최대 {max}장까지 처리합니다.",
  f02500: "완료를 눌러 분석하세요.",
  f02501: "연속 촬영은 최대 {max}장까지입니다.",
  f02502: "카카오·메신저 말풍선, '다른 앱 위에 표시' 앱이 켜져 있으면 권한 창이 막힐 수 있어요. 접은 뒤 다시 시도해 주세요.",
  f02503: "카메라를 시작할 수 없습니다: {msg}",
  f02504: "알 수 없는 오류",
  f02505: "AI 분석 중 오류가 발생했습니다.",
  f02506: "클라우드에 저장 중…",
  f02507: "외 {n}건",
  f02508: "{ok}/{total}장만 분석되었습니다.",
  f02509: "{n}장 분석·저장 완료",
  f02510: "품목·금액은 모두 합산되었습니다. 미리보기·증빙 링크는 첫 번째 영수증 기준입니다.",
  f02511: "AI가 총 {n}개의 영수증을 감지하여 합산했습니다!",
  f02512: "AI 분석 및 클라우드 저장 완료 (이미지 최적화 적용됨)",
};

const en = {
  f02483: "Please enter the expense description and amount correctly.",
  f02484: "Please select receipt image files (JPG or PNG).",
  f02485: "The rest were skipped. Register in smaller batches if needed.",
  f02486: "AI is analyzing and optimizing the receipt...",
  f02487: "No response",
  f02488: "Could not find valid information on the receipt.",
  f02489: "AI analysis failed.",
  f02490: "This browser does not support the camera. Please use file upload.",
  f02491: "No camera found on this device.",
  f02492: "Camera permission denied. Allow camera access in browser settings.",
  f02493: "No captured receipt.",
  f02494: "Delete this expense record?",
  f02495: "{name} purchase",
  f02496: "Purchase link",
  f02497: "Attached",
  f02498: "No info",
  f02499: "Processing up to {max} images at a time.",
  f02500: "Tap Done to analyze.",
  f02501: "Burst capture is limited to {max} images.",
  f02502: "If Kakao/Messenger bubbles or “draw over other apps” is on, the permission prompt may be blocked. Close them and try again.",
  f02503: "Could not start camera: {msg}",
  f02504: "Unknown error",
  f02505: "An error occurred during AI analysis.",
  f02506: "Saving to cloud…",
  f02507: "+ {n} more",
  f02508: "Only {ok}/{total} images were analyzed.",
  f02509: "{n} images analyzed and saved",
  f02510: "Items and amounts are merged. Preview and proof link use the first receipt only.",
  f02511: "AI detected {n} receipts and merged them!",
  f02512: "AI analysis and cloud save complete (image optimized).",
};

const vi = {
  f02483: "Vui lòng nhập mô tả và số tiền chi chính xác.",
  f02484: "Chọn ảnh hóa đơn (JPG hoặc PNG).",
  f02485: "Phần còn lại đã bỏ qua. Chia nhỏ lô nếu cần.",
  f02486: "AI đang phân tích và tối ưu hóa đơn...",
  f02487: "Không có phản hồi",
  f02488: "Không tìm thấy thông tin hợp lệ trên hóa đơn.",
  f02489: "Phân tích AI thất bại.",
  f02490: "Trình duyệt không hỗ trợ camera. Vui lòng tải tệp.",
  f02491: "Không tìm thấy camera trên thiết bị.",
  f02492: "Quyền camera bị từ chối. Cho phép trong cài đặt trình duyệt.",
  f02493: "Chưa có ảnh hóa đơn chụp.",
  f02494: "Xóa bản ghi chi phí này?",
  f02495: "Nhập {name}",
  f02496: "Liên kết mua hàng",
  f02497: "Đính kèm",
  f02498: "Không có thông tin",
  f02499: "Xử lý tối đa {max} ảnh mỗi lần.",
  f02500: "Nhấn Hoàn tất để phân tích.",
  f02501: "Chụp liên tục tối đa {max} ảnh.",
  f02502: "Nếu bong bóng Kakao/Messenger hoặc “vẽ trên app khác” đang bật, hộp quyền có thể bị chặn. Đóng và thử lại.",
  f02503: "Không khởi động được camera: {msg}",
  f02504: "Lỗi không xác định",
  f02505: "Lỗi khi phân tích AI.",
  f02506: "Đang lưu lên đám mây…",
  f02507: "và {n} nữa",
  f02508: "Chỉ phân tích được {ok}/{total} ảnh.",
  f02509: "Đã phân tích và lưu {n} ảnh",
  f02510: "Đã gộp mặt hàng và số tiền. Xem trước và liên kết chứng từ theo hóa đơn đầu tiên.",
  f02511: "AI phát hiện {n} hóa đơn và đã gộp!",
  f02512: "Phân tích AI và lưu đám mây xong (đã tối ưu ảnh).",
};

for (const file of files) {
  const fp = path.join(dir, file);
  const j = JSON.parse(fs.readFileSync(fp, "utf8"));
  const src = file === "ko.json" ? ko : file === "vi.json" ? vi : en;
  Object.assign(j.tenantFlows, src);
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n", "utf8");
}
console.log("OK: f02483–f02512 merged into tenantFlows for all locales.");
