export const SAMPLE_PRODUCTS = [
  {
    name: "축하화환 3단",
    code: "GIFT-001",
    main_category: "경조사화환",
    mid_category: "축하화환",
    price: 100000,
    stock: 10,
    supplier: "자체제작",
    status: "active" as const,
  },
  {
    name: "계절꽃다발 (M)",
    code: "BQT-002",
    main_category: "꽃다발",
    mid_category: "계절꽃",
    price: 35000,
    stock: 20,
    supplier: "자체제작",
    status: "active" as const,
  },
  {
    name: "공기정화식물 스투키",
    code: "PLT-003",
    main_category: "식물/화분",
    mid_category: "관엽식물",
    price: 45000,
    stock: 5,
    supplier: "농장직송",
    status: "active" as const,
  }
];

export const SAMPLE_MATERIALS = [
  {
    name: "대형 리본 (핑크)",
    main_category: "부자재",
    mid_category: "리본",
    unit: "롤",
    safety_stock: 5,
    current_stock: 12,
    price: 5000,
    description: "화환용 대형 리본",
  },
  {
    name: "장미 (헤라)",
    main_category: "생화",
    mid_category: "장미",
    unit: "송이",
    safety_stock: 50,
    current_stock: 100,
    price: 1200,
    description: "연분홍색 장미",
  },
  {
    name: "안개꽃",
    main_category: "생화",
    mid_category: "필러",
    unit: "단",
    safety_stock: 10,
    current_stock: 15,
    price: 15000,
    description: "화이트 안개꽃",
  }
];
