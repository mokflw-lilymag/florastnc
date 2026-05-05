import type { LandingFeatureDetailPagesMap } from "./types";

export const VI_DETAIL_PAGES: LandingFeatureDetailPagesMap = {
  "ai-order-concierge": {
    sections: [
      {
        body: "Tin đặt hàng của khách lệch giọng, thứ tự và thiếu trường — mỗi lần tiếp nhận đều tốn thời gian. AI đọc KakaoTalk, SMS, ghi chú cuộc gọi rồi nháp người nhận, khung giờ giao, lời thiệp và gợi ý số tiền dạng phiếu để nhân viên chủ yếu kiểm tra.",
      },
      {
        heading: "Thay đổi tại tiệm",
        body: "Giờ cao điểm, nút thắt là xác minh chứ không phải gõ phím. Chuẩn hóa trường trước giúp bớt vòng lặp cú máy rồi mở lại chat để copy, bắt lỗi nhanh hơn — đặc biệt với đơn gấp kiểu “giao trong hôm nay”.",
      },
      {
        heading: "Phù hợp nhất",
        body: "Tiệm nhiều đơn chat, nhiều bước chuyển tiếp điện thoại, hay nhập lặp lại hằng ngày; khi khối lượng tăng vẫn giữ chất lượng tiếp nhận ổn định hơn.",
      },
    ],
  },
  "shop-sync": {
    sections: [
      {
        body: "Khi Naver, Cafe24 và đơn tại tiệm tách rời, nhân viên nhảy màn hình và nhập trùng. Đồng bộ all-in-one nối tạo đơn, thanh toán và trạng thái giao trên một dòng thời gian, giảm nhập kép và sót.",
      },
      {
        heading: "Luồng vận hành",
        body: "Đơn mới → chờ/chạy sản xuất → điều phối/nhận → giao xong liên kết tự động. Mỗi bước có log để cả team thấy ai đang giữ việc gì với cùng định nghĩa.",
      },
      {
        heading: "Tác động kỳ vọng",
        body: "Kênh nhiều hơn vẫn nhìn thấy nguồn, trạng thái và tồn đọng, bớt dồn việc cuối ngày; cuối tuần và mùa lễ vận hành đỡ chao đảo hơn.",
      },
    ],
  },
  "smart-print-bridge": {
    sections: [
      {
        heading: "Vượt A4: banner dài",
        body: "Máy phun mực phổ thông không cho tờ siêu dài. Luồng Floxync đẩy giới hạn phần cứng để in banner nhiều mét liền mạch — chất lượng gần chuyên nghiệp mà không cần máy khổ lớn.",
      },
      {
        heading: "Điều khiển ribbon nhiệt chính xác",
        body: "Nhiệt vi chỉnh và căng ribbon khó làm trên trình duyệt. Floxync chạy nhiều thiết bị nhiệt tức thì, giữ độ tinh ribbon.",
      },
      {
        heading: "XPrint: trình duyệt là bộ điều khiển",
        body: "Mệt driver và cấu hình trôi? XPrint gom thiết bị trên web, đồng bộ máy in trong tiệm một cú nhấp, hướng tới kết quả khớp xem trước.",
      },
    ],
    ctaLinks: [
      {
        label: "Liên hệ mua hàng",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Hỏi mua Smart Print Bridge")}`,
      },
      {
        label: "Đăng ký test user",
        href: "/#test-user-apply",
      },
    ],
  },
  "ai-expense-magic": {
    sections: [
      {
        heading: "Chụp một phát là xong",
        body: "Gom hóa đơn là việc tẻ nhạt. OCR AI đọc cả tờ nhăn/mờ, tách cửa hàng, ngày, tổng và VAT rồi ghi dòng có cấu trúc vào sổ chi.",
      },
      {
        heading: "Phân loại theo ngữ cảnh",
        body: "Không chỉ nhận chữ: mô hình gắn nhà cung cấp và dòng hàng vào nhóm bạn đặt — nguyên liệu hoa, ship, vật tư; chủ tiệm chụp ảnh, AI lo phân loại.",
      },
      {
        heading: "Liên kết engine quyết toán",
        body: "Chi phí nhập vào đồng bộ ngay engine cấp tài chính để thấy lãi thật sau chi phí; bớt cơn ác mộng hóa đơn mùa khai thuế.",
      },
    ],
    ctaLinks: [
      {
        label: "Đăng ký test user",
        href: "/#test-user-apply",
      },
      {
        label: "Liên hệ",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Hỏi về trợ lý chi phí AI")}`,
      },
    ],
  },
  "settlement-engine": {
    sections: [
      {
        body: "Doanh thu tăng mà lãi mỏng vì phí, giá vốn, ship và thuế tính rời rạc. Engine khóa quy tắc để cùng một đơn luôn ra cùng kết quả, giảm lệch cuối tháng.",
      },
      {
        heading: "Minh bạch",
        body: "Mỗi đơn bóc “doanh-thuốc-phí-ship-thuế” để giải thích chỗ trôi margin; giảm cãi nhau về cách hiểu số giữa chủ và ops.",
      },
      {
        heading: "Báo cáo",
        body: "Tổng ngày/tuần/tháng và so sánh kênh để biết kiểu đơn nào thực sự lời; chỉnh giá, khuyến mãi và vận hành theo dữ liệu.",
      },
    ],
  },
  "mobile-premium": {
    sections: [
      {
        body: "Mobile Center Premium (Android) đang phát triển. Ưu tiên tính năng dùng ngoài tiệm: xem đơn, trạng thái, phê duyệt nhẹ nhanh hơn.",
      },
      {
        heading: "Kế hoạch phát hành",
        body: "Đăng ký test hoặc gửi câu hỏi để nhận mời beta sớm; sẽ thông báo thêm phạm vi thiết bị tương thích.",
      },
      {
        heading: "Tiến độ",
        body: "Sau khi lõi ổn định, sẽ mở dần thông báo, phê duyệt, checklist hiện trường và hướng dẫn triển khai.",
      },
    ],
    ctaLinks: [
      {
        label: "Đăng ký test user",
        href: "/#test-user-apply",
      },
      {
        label: "Liên hệ",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Hỏi về phát hành app Android")}`,
      },
    ],
  },
};
