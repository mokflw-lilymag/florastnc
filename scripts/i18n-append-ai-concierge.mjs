import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../src/i18n/messages");
const files = ["ko.json", "en.json", "vi.json", "zh.json", "ja.json", "es.json", "pt.json", "fr.json", "de.json", "ru.json"];

const voiceKo = `000님 주문, 0만 원 꽃다발, 0월 0일 0시 픽업 또는 배송.

주소: 도로명주소, 수령인 이름, 연락처.

카드/리본 메시지 — 메시지 블라블라 등 원하시는 문구.`;

const voiceEn = `Order for [name], bouquet ₩00,000, pickup or delivery on YYYY-MM-DD at HH:mm.

Address: street address, recipient name, phone.

Card/ribbon message — the wording you want.`;

const voiceVi = `Đơn cho [tên], bó hoa x triệu VND, lấy tại cửa hoặc giao vào ngày DD/MM lúc HH:mm.

Địa chỉ: đường, tên người nhận, số điện thoại.

Thiệp/ruy băng — nội dung bạn muốn.`;

const ko = {
  f02545: "AI 주문 마스터 시작하기",
  f02546: "AI에게 주문 알려주기",
  f02547: "음성/텍스트 통합 입력",
  f02548: "주문서 이미지/사진",
  f02549: "AI 비서가 분석 중입니다...",
  f02550: "마이크로 말할 때 예시",
  f02551: voiceKo,
  f02552: voiceEn,
  f02553: voiceVi,
  f02554: "배송 예약",
  f02555: "픽업 예약",
  f02556: "매장 픽업",
  f02557: "사장님의 말씀을 듣고 있습니다. 말씀이 끝나면 마이크를 다시 눌러 주세요!",
  f02558: "위 예시처럼 말씀해 주시거나, 카톡·문자 내용을 여기에 붙여 넣어 주세요.",
  f02559: "마이크가 안 되시나요? 다른 마이크를 쓰시거나 카톡 내용을 복사해서 붙여넣어 보세요!",
  f02560: "마이크가 안 되시나요?",
  f02561: "주문서 캡처 사진 올리기",
  f02562: "웹·카톡 등에서 이미지를 복사한 뒤, 이 탭을 연 상태에서 Ctrl+V (Mac: ⌘V)로 붙여넣을 수 있어요.",
  f02563: "AI 비서에게 건네주기",
  f02564: "AI가 분석한 주문 내용",
  f02565: "아래에서 바로 수정한 뒤「이대로 입력하기」를 눌러 주세요.",
  f02566: "주문자 이름",
  f02567: "주문자 연락처",
  f02568: "주문자 회사(선택)",
  f02569: "수령인 이름",
  f02570: "수령인 연락처",
  f02571: "배송·픽업 유형",
  f02572: "날짜 (YYYY-MM-DD)",
  f02573: "시간 (HH:mm)",
  f02574: "상품 (첫 줄)",
  f02575: "가격 (원)",
  f02576: "수량",
  f02577: "주소",
  f02578: "상세 주소",
  f02579: "리본·카드 문구",
  f02580: "리본·카드에 넣을 문구",
  f02581: "특이사항·메모",
  f02582: "배송 요청 등",
  f02583: "다시 하기",
  f02584: "이대로 입력하기",
  f02585: "미입력",
  f02586: "주문 이미지 미리보기",
};

const en = {
  f02545: "Start AI order assistant",
  f02546: "Tell the AI your order",
  f02547: "Voice & text",
  f02548: "Order photo / image",
  f02549: "The AI assistant is analyzing…",
  f02550: "Example for voice input",
  f02551: voiceEn,
  f02552: voiceEn,
  f02553: voiceEn,
  f02554: "Scheduled delivery",
  f02555: "Scheduled pickup",
  f02556: "In-store pickup",
  f02557: "Listening… Tap the mic again when you’re done speaking.",
  f02558: "Speak like the example, or paste a Kakao/SMS message here.",
  f02559: "Mic not working? Try another mic or paste the chat text here.",
  f02560: "Mic not working?",
  f02561: "Upload a photo of the order",
  f02562: "Copy an image from the web or chat, keep this tab open, then press Ctrl+V (Mac: ⌘V) to paste.",
  f02563: "Send to AI assistant",
  f02564: "AI-parsed order",
  f02565: "Edit below, then tap “Apply to form”.",
  f02566: "Orderer name",
  f02567: "Orderer phone",
  f02568: "Orderer company (optional)",
  f02569: "Recipient name",
  f02570: "Recipient phone",
  f02571: "Delivery / pickup type",
  f02572: "Date (YYYY-MM-DD)",
  f02573: "Time (HH:mm)",
  f02574: "Item (first line)",
  f02575: "Price (KRW)",
  f02576: "Quantity",
  f02577: "Address",
  f02578: "Address line 2",
  f02579: "Ribbon / card message",
  f02580: "Message for ribbon or card",
  f02581: "Notes",
  f02582: "Delivery notes, etc.",
  f02583: "Start over",
  f02584: "Apply to form",
  f02585: "Not set",
  f02586: "Order image preview",
};

const vi = {
  f02545: "Bắt đầu trợ lý đặt hàng AI",
  f02546: "Cho AI biết đơn hàng",
  f02547: "Giọng nói & văn bản",
  f02548: "Ảnh đơn / hình chụp",
  f02549: "Trợ lý AI đang phân tích…",
  f02550: "Ví dụ khi dùng mic",
  f02551: voiceVi,
  f02552: voiceVi,
  f02553: voiceVi,
  f02554: "Giao hàng hẹn giờ",
  f02555: "Nhận hàng hẹn giờ",
  f02556: "Lấy tại cửa",
  f02557: "Đang nghe… Nhấn mic lại khi nói xong.",
  f02558: "Nói theo ví dụ hoặc dán nội dung chat/SMS vào đây.",
  f02559: "Mic không hoạt động? Thử mic khác hoặc dán nội dung chat.",
  f02560: "Mic không hoạt động?",
  f02561: "Tải ảnh chụp đơn hàng",
  f02562: "Sao chép ảnh từ web hoặc chat, giữ tab này mở rồi nhấn Ctrl+V (Mac: ⌘V) để dán.",
  f02563: "Gửi cho trợ lý AI",
  f02564: "Đơn đã phân tích",
  f02565: "Sửa bên dưới, rồi nhấn “Áp dụng vào biểu mẫu”.",
  f02566: "Tên người đặt",
  f02567: "SĐT người đặt",
  f02568: "Công ty (tuỳ chọn)",
  f02569: "Tên người nhận",
  f02570: "SĐT người nhận",
  f02571: "Loại giao / nhận",
  f02572: "Ngày (YYYY-MM-DD)",
  f02573: "Giờ (HH:mm)",
  f02574: "Sản phẩm (dòng đầu)",
  f02575: "Giá (KRW)",
  f02576: "Số lượng",
  f02577: "Địa chỉ",
  f02578: "Địa chỉ chi tiết",
  f02579: "Thông điệp ruy băng / thiệp",
  f02580: "Nội dung ruy băng hoặc thiệp",
  f02581: "Ghi chú",
  f02582: "Yêu cầu giao hàng, v.v.",
  f02583: "Làm lại",
  f02584: "Áp dụng vào biểu mẫu",
  f02585: "Chưa nhập",
  f02586: "Xem trước ảnh đơn",
};

for (const file of files) {
  const fp = path.join(dir, file);
  const j = JSON.parse(fs.readFileSync(fp, "utf8"));
  const src = file === "ko.json" ? ko : file === "vi.json" ? vi : en;
  Object.assign(j.tenantFlows, src);
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n", "utf8");
}
console.log("OK: f02545–f02586 merged into tenantFlows for all locales.");
