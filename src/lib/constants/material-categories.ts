export const MAIN_CAT_PREFIX: Record<string, string> = {
  '생화': 'MF', '식물': 'MP', '바구니 / 화기': 'MB',
  '소모품 및 부자재': 'MM', '조화': 'MA', '프리저브드': 'MR',
  '기타': 'MZ',
  // 베트남어 및 영어 매핑 (Seed 데이터용)
  'Hoa tươi': 'MF', 'Fresh cut': 'MF',
  'Cây': 'MP', 'Plants': 'MP',
  'Giỏ / Bình': 'MB', 'Baskets / Containers': 'MB',
  'Vật tư': 'MM', 'Supplies': 'MM',
  'Đóng gói': 'MM', 'Packaging': 'MM',
  'Ruy băng': 'MM', 'Ribbon': 'MM',
  'Bảo quản': 'MR', 'Preserved': 'MR'
};

export const MID_CAT_CODE: Record<string, Record<string, string>> = {
  'MF': { 
    '장미류': '1', 'Hồng': '1', 'Roses': '1',
    '거베라류': '2', 'Cúc gerbera': '2', 'Gerbera': '2',
    '폼플라워': '3', 
    '필러플라워': '4', 
    '라인플라워': '5', 
    '소재(그린)': '6', 'Phụ': '6', 'Lá': '6', 'Cành': '6', 'Filler': '6', 'Greens': '6', 'Branches': '6',
    '국화류': '7', 
    '카네이션류': '8', 'Cẩm chướng': '8', 'Carnations': '8',
    '리시안서스류': '9', 'Lisianthus': '9', 
    '기타': '0', '매스플라워': 'A',
    'Tulip': 'B', 'Tulips': 'B'
  },
  'MP': { 
    '관엽소형': '1', '관엽중형': '2', '관엽대형': '3', 
    '서양란': '6', '동양란': '7', 
    '기타식물': 'D', 
    '다육선인장소형': '8', '다육선인장중형': '9', '다육선인장대형': '0',
    'Sen đá': '8', 'Succulent': '8',
    'Lá nhỏ': '1', 'Small foliage': '1',
    'Lan': '6', 'Orchid': '6'
  },
  'MB': { 
    '바구니': '1', 'Giỏ': '1', 'Basket': '1',
    '도자기': '2', 
    '유리': '3', 
    '테라조': '4', 
    '테라코타(토분)': '5', 
    '플라스틱': '6', 
    '기타': '7' 
  },
  'MM': { 
    '원예자재': '1', 
    '데코자재': '2', 
    '포장재': '3', 
    '리본/텍': '4', 
    '기타': '5', 
    '제작도구': '6',
    // 베트남어, 영어 추가
    'Thủy tinh': '3', 'Glass': '3',
    'Gốm': '2', 'Ceramic': '2',
    'Giấy': '3', 'Màng': '3', 'Wrap': '3', 'Film': '3',
    'Hẹp': '4', 'Narrow ribbon': '4',
    'Phụ kiện': '5', 'Accessories': '5',
    'Lụa': '2', 'Silk': '2'
  },
  'MA': { '장미류': '1', '카네이션류': '2', '리시안서스류': '3', '국화류': '4', '거베라류': '5', '폼플라워': '6', '라인플라워': '7', '필러플라워': '8', '소재(그린)': '9', '트리류': '0', '매스플라워': 'A' },
  'MR': { '플라워': '1', '잎소재': '2', '열매': '3', '폼플라워': '4', '기타': '5', 'Form hoa': '4', 'Form flowers': '4' },
};

export const generateMaterialIdLocal = (
  existingIds: string[],
  mainCategory: string,
  midCategory?: string,
  branchCode: string = '1'
) => {
  const prefix = MAIN_CAT_PREFIX[mainCategory] || 'MM';
  const midCode = (midCategory && MID_CAT_CODE[prefix]?.[midCategory]) || '0';
  const pattern = `${prefix}${midCode}`;

  let maxSeq = 0;
  const regex = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d{4})\\w$`);
  
  for (const id of existingIds) {
    if (id.startsWith(pattern)) {
      const match = id.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }
  return `${pattern}${String(maxSeq + 1).padStart(4, '0')}${branchCode}`;
};
