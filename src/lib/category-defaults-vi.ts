/** Vietnamese category trees — VN master seed & settings defaults */

import type { CategoryData } from "@/lib/category-defaults";

export const DEFAULT_PRODUCT_CATEGORIES_VI: CategoryData = {
  main: [
    "Bó hoa",
    "Giỏ hoa",
    "Cây / Chậu",
    "Tang lễ & Sự kiện",
    "Theo mùa",
    "Quà tặng",
    "Lan hồ điệp",
    "Cưới hỏi",
    "Hoa tươi",
    "Cây cảnh",
    "Bình / Lọ",
    "Vật tư",
    "Nguyên liệu",
    "Khác",
  ],
  mid: {
    "Bó hoa": ["Cơ bản", "Lớn", "Một bông", "Cao cấp", "Tiêu chuẩn"],
    "Giỏ hoa": ["S", "M", "L", "Mix", "Có quai", "Giỏ quà"],
    "Cây / Chậu": ["Lọc không khí", "Lá xanh", "Sen đá", "Lan", "Khai trương", "Treo"],
    "Tang lễ & Sự kiện": ["Kệ chúc mừng", "Kệ chia buồn", "Vòng hoa đứng", "Kệ 3 tầng chúc", "Kệ 3 tầng buồn"],
    "Theo mùa": ["Ngày của Mẹ", "Valentine", "Giáng sinh", "Lễ hội"],
    "Quà tặng": ["Hộp quà", "Hộp hoa", "Bó tiền"],
    "Lan hồ điệp": ["Lan hồ điệp", "Địa lan", "Lan mini"],
    "Cưới hỏi": ["Bó cô dâu", "Boutonniere", "Lễ cưới"],
    "Hoa tươi": ["Vòng hoa", "Bó hoa", "Giỏ hoa", "Trung tâm bàn", "Sự kiện"],
    "Cây cảnh": ["Lớn", "Vừa", "Nhỏ", "Lan"],
    "Bình / Lọ": ["Thủy tinh", "Gốm", "Giỏ", "Lọ"],
    "Vật tư": ["Giấy gói", "Ruy băng", "Hộp", "Khác"],
    "Nguyên liệu": ["Khô", "Bình lọ", "Đóng gói", "Giỏ"],
    Khác: ["Vòng hoa", "Khác"],
  },
};

export const DEFAULT_MATERIAL_CATEGORIES_VI: CategoryData = {
  main: [
    "Hoa tươi",
    "Hoa lụa",
    "Bảo quản",
    "Cây",
    "Giỏ / Bình",
    "Tiêu hao",
    "Vật tư",
    "Đóng gói",
    "Ruy băng",
    "Khác",
  ],
  mid: {
    "Hoa tươi": ["Hồng", "Cúc gerbera", "Lisianthus", "Tulip", "Cẩm chướng", "Cúc", "Phụ", "Line", "Form", "Lá", "Cành", "Khác"],
    Cây: ["Sen đá", "Lá nhỏ", "Lá vừa", "Lá lớn", "Lan", "Khác"],
    "Vật tư": ["Bình", "Gốm", "Thủy tinh", "Lụa", "Phụ kiện"],
    "Giỏ / Bình": ["Gốm", "Terrazzo", "Giỏ", "Thủy tinh", "Xi măng"],
    "Tiêu hao": ["Ruy băng / Tex", "Làm vườn", "Đóng gói", "Trang trí", "Khác"],
    "Hoa lụa": ["Lá", "Cây"],
    "Bảo quản": ["Form hoa"],
    "Đóng gói": ["Giấy", "Ruy băng", "Tex", "Vải", "Màng"],
    "Ruy băng": ["Rộng", "Hẹp", "Tex"],
    Khác: ["Làm vườn", "Giao hàng", "Khác"],
  },
};

export const DEFAULT_EXPENSE_CATEGORIES_VI: CategoryData = {
  main: [
    "Nguyên liệu",
    "Chi phí cố định",
    "Tiện ích",
    "Vận chuyển",
    "Văn phòng",
    "Marketing",
    "Ăn uống",
    "Bảo trì",
    "Bảo hiểm",
    "Khác",
  ],
  mid: {
    "Nguyên liệu": ["Hoa tươi", "Lụa", "Bảo quản", "Cây", "Bình", "Tiêu hao", "Thuê ngoài", "Yêu cầu"],
    "Chi phí cố định": ["Thuê mặt bằng", "Phí quản lý", "Gửi xe", "An ninh", "Lương", "Giấy phép"],
    "Tiện ích": ["Điện", "Gas", "Nước", "Internet", "Điện thoại", "Rác"],
    "Vận chuyển": ["Phí giao", "Taxi", "Xăng", "Gửi xe", "Phí đường"],
    "Văn phòng": ["Văn phòng phẩm", "Vệ sinh", "Thiết bị", "Tiêu hao"],
    Marketing: ["Quảng cáo", "PR", "Sự kiện", "Mạng xã hội", "In ấn"],
    "Ăn uống": ["Bữa ăn", "Tiệc team", "Đặc biệt", "Cà phê"],
    "Bảo trì": ["Thiết bị", "Điều hòa", "Tủ lạnh", "Ống nước", "Điện"],
    "Bảo hiểm": ["Kinh doanh", "Giao hàng", "Trách nhiệm", "Tài sản", "BHXH"],
    Khác: ["Chung", "Lặt vặt"],
  },
};
