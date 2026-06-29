import type {
  TenantMasterSeedMaterialRow,
  TenantMasterSeedProductRow,
  TenantMasterSeedSupplierRow,
} from "../types";

type IntlLocale = "en" | "vi";

const SUPPLIER_TYPES_EN = [
  "Fresh flowers",
  "Supplies",
  "Plants",
  "Packaging",
  "Wholesale",
  "Other",
] as const;

function sampleTag(locale: IntlLocale): string {
  return locale === "vi" ? "(mẫu)" : "(sample)";
}

function buildSuppliers(locale: IntlLocale): TenantMasterSeedSupplierRow[] {
  const tag = sampleTag(locale);
  const memo =
    locale === "vi"
      ? "Nhà cung cấp mẫu từ seed. Vui lòng cập nhật thông tin thật."
      : "Sample supplier from seed. Update with your real vendor details.";
  const names =
    locale === "vi"
      ? [
          "Nhà cung cấp hoa tươi A",
          "Nhà cung cấp vật tư B",
          "Vườn ươm C",
          "Đóng gói D",
          "Bình lọ E",
          "Ruy băng F",
          "Hoa lụa G",
          "Bảo quản H",
          "Giao hàng I",
          "Văn phòng J",
          "F&B K",
          "In ấn L",
          "Lạnh M",
          "Làm vườn N",
          "Nhập khẩu O",
          "Nội địa P",
          "Giỏ Q",
          "Gốm R",
          "Lụa S",
          "Phụ kiện T",
        ]
      : [
          "Fresh Flower Vendor A",
          "Supplies Vendor B",
          "Nursery C",
          "Packaging D",
          "Containers E",
          "Ribbon F",
          "Silk G",
          "Preserved H",
          "Delivery I",
          "Office J",
          "F&B K",
          "Print L",
          "Cooling M",
          "Garden N",
          "Import O",
          "Local P",
          "Baskets Q",
          "Ceramic R",
          "Silk S",
          "Accessories T",
        ];
  return names.map((name, i) => ({
    name: `${name} ${tag}`,
    memo,
    supplier_type: SUPPLIER_TYPES_EN[i % SUPPLIER_TYPES_EN.length],
  }));
}

function buildProducts(locale: IntlLocale): TenantMasterSeedProductRow[] {
  const tag = locale === "vi" ? "(mẫu)" : "(sample)";
  if (locale === "vi") {
    return [
      { name: `Bó hồng cơ bản ${tag}`, main_category: "Bó hoa", mid_category: "Cơ bản", code: "SAMPLE-BOUQUET-ROSE-BASIC", price: 0, stock: 0, status: "active" },
      { name: `Giỏ cẩm chướng M ${tag}`, main_category: "Giỏ hoa", mid_category: "M", code: "SAMPLE-BASKET-CARN-M", price: 0, stock: 0, status: "active" },
      { name: `Kệ chúc 3 tầng ${tag}`, main_category: "Tang lễ & Sự kiện", mid_category: "Kệ 3 tầng chúc", code: "SAMPLE-WREATH-CONGRATS-3", price: 0, stock: 0, status: "active" },
      { name: `Lan hồ điệp ${tag}`, main_category: "Lan hồ điệp", mid_category: "Lan hồ điệp", code: "SAMPLE-ORCHID-PHAL", price: 0, stock: 0, status: "active" },
      { name: `Bó cô dâu ${tag}`, main_category: "Cưới hỏi", mid_category: "Bó cô dâu", code: "SAMPLE-WEDDING-BOUQUET", price: 0, stock: 0, status: "active" },
      { name: `Cây lọc không khí ${tag}`, main_category: "Cây / Chậu", mid_category: "Lọc không khí", code: "SAMPLE-PLANT-AIR", price: 0, stock: 0, status: "active" },
      { name: `Hộp hoa Valentine ${tag}`, main_category: "Quà tặng", mid_category: "Hộp hoa", code: "SAMPLE-BOX-VAL", price: 0, stock: 0, status: "active" },
      { name: `Vòng hoa chia buồn ${tag}`, main_category: "Tang lễ & Sự kiện", mid_category: "Kệ chia buồn", code: "SAMPLE-WREATH-SYMP", price: 0, stock: 0, status: "active" },
      { name: `Sen đá mini ${tag}`, main_category: "Cây / Chậu", mid_category: "Sen đá", code: "SAMPLE-SUCC-MINI", price: 0, stock: 0, status: "active" },
      { name: `Bó tulip ${tag}`, main_category: "Bó hoa", mid_category: "Cao cấp", code: "SAMPLE-BOUQUET-TULIP", price: 0, stock: 0, status: "active" },
      { name: `Giỏ mix S ${tag}`, main_category: "Giỏ hoa", mid_category: "S", code: "SAMPLE-BASKET-MIX-S", price: 0, stock: 0, status: "active" },
      { name: `Hộp quà ${tag}`, main_category: "Quà tặng", mid_category: "Hộp quà", code: "SAMPLE-GIFT-BOX", price: 0, stock: 0, status: "active" },
      { name: `Cây lá lớn ${tag}`, main_category: "Cây cảnh", mid_category: "Lớn", code: "SAMPLE-FOLIAGE-L", price: 0, stock: 0, status: "active" },
      { name: `Lọ thủy tinh ${tag}`, main_category: "Bình / Lọ", mid_category: "Thủy tinh", code: "SAMPLE-VASE-GLASS", price: 0, stock: 0, status: "active" },
      { name: `Bó hoa sự kiện ${tag}`, main_category: "Hoa tươi", mid_category: "Sự kiện", code: "SAMPLE-EVENT-FLOWER", price: 0, stock: 0, status: "active" },
      { name: `Kệ khai trương ${tag}`, main_category: "Tang lễ & Sự kiện", mid_category: "Kệ chúc mừng", code: "SAMPLE-OPENING-WREATH", price: 0, stock: 0, status: "active" },
      { name: `Bó một bông ${tag}`, main_category: "Bó hoa", mid_category: "Một bông", code: "SAMPLE-SINGLE-STEM", price: 0, stock: 0, status: "active" },
      { name: `Giỏ Ngày của Mẹ ${tag}`, main_category: "Theo mùa", mid_category: "Ngày của Mẹ", code: "SAMPLE-MOTHERS-DAY", price: 0, stock: 0, status: "active" },
      { name: `Lan mini ${tag}`, main_category: "Lan hồ điệp", mid_category: "Lan mini", code: "SAMPLE-ORCHID-MINI", price: 0, stock: 0, status: "active" },
      { name: `Combo phụ kiện ${tag}`, main_category: "Vật tư", mid_category: "Ruy băng", code: "SAMPLE-SUPPLY-KIT", price: 0, stock: 0, status: "active" },
    ];
  }
  return [
    { name: `Rose Bouquet Standard ${tag}`, main_category: "Bouquet", mid_category: "Standard", code: "SAMPLE-BOUQUET-ROSE-BASIC", price: 0, stock: 0, status: "active" },
    { name: `Carnation Basket M ${tag}`, main_category: "Basket", mid_category: "M", code: "SAMPLE-BASKET-CARN-M", price: 0, stock: 0, status: "active" },
    { name: `Congrats Wreath 3-tier ${tag}`, main_category: "Funeral & Events", mid_category: "3-tier congrats", code: "SAMPLE-WREATH-CONGRATS-3", price: 0, stock: 0, status: "active" },
    { name: `Phalaenopsis Orchid ${tag}`, main_category: "Orchids", mid_category: "Phalaenopsis", code: "SAMPLE-ORCHID-PHAL", price: 0, stock: 0, status: "active" },
    { name: `Bridal Bouquet ${tag}`, main_category: "Wedding", mid_category: "Bridal bouquet", code: "SAMPLE-WEDDING-BOUQUET", price: 0, stock: 0, status: "active" },
    { name: `Air-purifying Plant ${tag}`, main_category: "Plants / Pots", mid_category: "Air-purifying", code: "SAMPLE-PLANT-AIR", price: 0, stock: 0, status: "active" },
    { name: `Valentine Flower Box ${tag}`, main_category: "Gift Sets", mid_category: "Flower box", code: "SAMPLE-BOX-VAL", price: 0, stock: 0, status: "active" },
    { name: `Sympathy Wreath ${tag}`, main_category: "Funeral & Events", mid_category: "Sympathy wreath", code: "SAMPLE-WREATH-SYMP", price: 0, stock: 0, status: "active" },
    { name: `Mini Succulent ${tag}`, main_category: "Plants / Pots", mid_category: "Succulent", code: "SAMPLE-SUCC-MINI", price: 0, stock: 0, status: "active" },
    { name: `Tulip Bouquet ${tag}`, main_category: "Bouquet", mid_category: "Premium", code: "SAMPLE-BOUQUET-TULIP", price: 0, stock: 0, status: "active" },
    { name: `Mixed Basket S ${tag}`, main_category: "Basket", mid_category: "S", code: "SAMPLE-BASKET-MIX-S", price: 0, stock: 0, status: "active" },
    { name: `Gift Box ${tag}`, main_category: "Gift Sets", mid_category: "Gift box", code: "SAMPLE-GIFT-BOX", price: 0, stock: 0, status: "active" },
    { name: `Large Foliage ${tag}`, main_category: "Plants", mid_category: "Large", code: "SAMPLE-FOLIAGE-L", price: 0, stock: 0, status: "active" },
    { name: `Glass Vase ${tag}`, main_category: "Vases & Containers", mid_category: "Glass", code: "SAMPLE-VASE-GLASS", price: 0, stock: 0, status: "active" },
    { name: `Event Flowers ${tag}`, main_category: "Floral", mid_category: "Event flowers", code: "SAMPLE-EVENT-FLOWER", price: 0, stock: 0, status: "active" },
    { name: `Opening Wreath ${tag}`, main_category: "Funeral & Events", mid_category: "Congrats wreath", code: "SAMPLE-OPENING-WREATH", price: 0, stock: 0, status: "active" },
    { name: `Single Stem ${tag}`, main_category: "Bouquet", mid_category: "Single stem", code: "SAMPLE-SINGLE-STEM", price: 0, stock: 0, status: "active" },
    { name: `Mother's Day Basket ${tag}`, main_category: "Seasonal", mid_category: "Mother's Day", code: "SAMPLE-MOTHERS-DAY", price: 0, stock: 0, status: "active" },
    { name: `Mini Orchid ${tag}`, main_category: "Orchids", mid_category: "Mini orchid", code: "SAMPLE-ORCHID-MINI", price: 0, stock: 0, status: "active" },
    { name: `Supply Kit ${tag}`, main_category: "Supplies", mid_category: "Ribbon", code: "SAMPLE-SUPPLY-KIT", price: 0, stock: 0, status: "active" },
  ];
}

function buildMaterials(locale: IntlLocale): TenantMasterSeedMaterialRow[] {
  const tag = locale === "vi" ? "(mẫu)" : "(sample)";
  if (locale === "vi") {
    return [
      { name: `Hồng đỏ ${tag}`, main_category: "Hoa tươi", mid_category: "Hồng", unit: "bông", spec: "" },
      { name: `Gerbera ${tag}`, main_category: "Hoa tươi", mid_category: "Cúc gerbera", unit: "bông", spec: "" },
      { name: `Lisianthus ${tag}`, main_category: "Hoa tươi", mid_category: "Lisianthus", unit: "bông", spec: "" },
      { name: `Tulip ${tag}`, main_category: "Hoa tươi", mid_category: "Tulip", unit: "bông", spec: "" },
      { name: `Cẩm chướng spray ${tag}`, main_category: "Hoa tươi", mid_category: "Cẩm chướng", unit: "bông", spec: "" },
      { name: `Baby's breath ${tag}`, main_category: "Hoa tươi", mid_category: "Phụ", unit: "bó", spec: "" },
      { name: `Sen đá nhỏ ${tag}`, main_category: "Cây", mid_category: "Sen đá", unit: "cái", spec: "" },
      { name: `Lá xanh nhỏ ${tag}`, main_category: "Cây", mid_category: "Lá nhỏ", unit: "cái", spec: "" },
      { name: `Chậu lan ${tag}`, main_category: "Cây", mid_category: "Lan", unit: "cái", spec: "" },
      { name: `Bình thủy tinh 12cm ${tag}`, main_category: "Vật tư", mid_category: "Thủy tinh", unit: "cái", spec: "12cm" },
      { name: `Chậu gốm ${tag}`, main_category: "Vật tư", mid_category: "Gốm", unit: "cái", spec: "" },
      { name: `Giấy voan ${tag}`, main_category: "Đóng gói", mid_category: "Giấy", unit: "tờ", spec: "" },
      { name: `Ruy băng 2.5cm ${tag}`, main_category: "Ruy băng", mid_category: "Hẹp", unit: "cuộn", spec: "2.5cm" },
      { name: `Dây + băng keo ${tag}`, main_category: "Vật tư", mid_category: "Phụ kiện", unit: "bộ", spec: "" },
      { name: `Màng bọc ${tag}`, main_category: "Đóng gói", mid_category: "Màng", unit: "tờ", spec: "" },
      { name: `Lá lụa ${tag}`, main_category: "Vật tư", mid_category: "Lụa", unit: "cành", spec: "" },
      { name: `Lá eucalyptus ${tag}`, main_category: "Hoa tươi", mid_category: "Lá", unit: "bó", spec: "" },
      { name: `Cành trang trí ${tag}`, main_category: "Hoa tươi", mid_category: "Cành", unit: "bó", spec: "" },
      { name: `Form hoa ${tag}`, main_category: "Bảo quản", mid_category: "Form hoa", unit: "cái", spec: "" },
      { name: `Giỏ cói ${tag}`, main_category: "Giỏ / Bình", mid_category: "Giỏ", unit: "cái", spec: "" },
    ];
  }
  return [
    { name: `Red Rose ${tag}`, main_category: "Fresh cut", mid_category: "Roses", unit: "stem", spec: "" },
    { name: `Gerbera ${tag}`, main_category: "Fresh cut", mid_category: "Gerbera", unit: "stem", spec: "" },
    { name: `Lisianthus ${tag}`, main_category: "Fresh cut", mid_category: "Lisianthus", unit: "stem", spec: "" },
    { name: `Tulip ${tag}`, main_category: "Fresh cut", mid_category: "Tulips", unit: "stem", spec: "" },
    { name: `Spray Carnation ${tag}`, main_category: "Fresh cut", mid_category: "Carnations", unit: "stem", spec: "" },
    { name: `Baby's Breath ${tag}`, main_category: "Fresh cut", mid_category: "Filler", unit: "bunch", spec: "" },
    { name: `Small Succulent ${tag}`, main_category: "Plants", mid_category: "Succulent", unit: "ea", spec: "" },
    { name: `Small Foliage ${tag}`, main_category: "Plants", mid_category: "Small foliage", unit: "ea", spec: "" },
    { name: `Orchid Pot ${tag}`, main_category: "Plants", mid_category: "Orchid", unit: "ea", spec: "" },
    { name: `Glass Vase 12cm ${tag}`, main_category: "Supplies", mid_category: "Glass", unit: "ea", spec: "12cm" },
    { name: `Ceramic Pot ${tag}`, main_category: "Supplies", mid_category: "Ceramic", unit: "ea", spec: "" },
    { name: `Chiffon Wrap ${tag}`, main_category: "Packaging", mid_category: "Wrap", unit: "sheet", spec: "" },
    { name: `Grosgrain Ribbon 2.5cm ${tag}`, main_category: "Ribbon", mid_category: "Narrow ribbon", unit: "roll", spec: "2.5cm" },
    { name: `Wire & Tape Set ${tag}`, main_category: "Supplies", mid_category: "Accessories", unit: "set", spec: "" },
    { name: `Film Wrap ${tag}`, main_category: "Packaging", mid_category: "Film", unit: "sheet", spec: "" },
    { name: `Silk Foliage ${tag}`, main_category: "Supplies", mid_category: "Silk", unit: "stem", spec: "" },
    { name: `Eucalyptus ${tag}`, main_category: "Fresh cut", mid_category: "Greens", unit: "bunch", spec: "" },
    { name: `Decor Branch ${tag}`, main_category: "Fresh cut", mid_category: "Branches", unit: "bunch", spec: "" },
    { name: `Form Flower ${tag}`, main_category: "Preserved", mid_category: "Form flowers", unit: "ea", spec: "" },
    { name: `Wicker Basket ${tag}`, main_category: "Baskets / Containers", mid_category: "Basket", unit: "ea", spec: "" },
  ];
}

export function buildIntlStandardSeedBody(locale: IntlLocale) {
  return {
    suppliers: buildSuppliers(locale),
    products: buildProducts(locale),
    materials: buildMaterials(locale),
  };
}
