/**
 * 샘플리(Template Curator) 관리 영역
 * 디자인 템플릿 데이터를 page.tsx에서 분리하여 독립적으로 관리합니다.
 */

export const GALLERY_CATEGORIES = [
  { id: 'my_designs', label: '👉 내 디자인' },
  { id: 'birthday', label: '🎂 생일' },
  { id: 'thanks', label: '🙏 감사' },
  { id: 'respect', label: '💐 존경' },
  { id: 'lover', label: '💕 연인' },
  { id: 'christmas', label: '🎄 크리스마스' }
];

export const FREE_TEMPLATES: Record<string, string[]> = {
  birthday: [
    'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1530103862676-de889acbbac8?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1542840410-3092f99611a3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1572451452942-0f18bd84c8a5?auto=format&fit=crop&w=800&q=80'
  ],
  lover: [
    'https://images.unsplash.com/photo-1557672172282-c80d32f0853f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518640467708-62f1280d43f1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522262590532-a991489a0253?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1604076913837-52f514d6b566?auto=format&fit=crop&w=800&q=80',
    'https://plus.unsplash.com/premium_photo-1661767552224-ef72bf6b9a14?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1563241527-300ecebe5fa4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1567359781-5f4ed15d5e5b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1602631592596-f30db0f557cc?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80'
  ],
  thanks: [
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1494972308805-463bc619d34e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1505909182942-e2f09aee3e89?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518895949257-7621bf272d8a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1463123081488-789f998ac9c4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1558591710-4b4a3822878d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1444464666168-49b626d49cb4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1476842634003-7dcca8f822cd?auto=format&fit=crop&w=800&q=80'
  ],
  respect: [
    'https://images.unsplash.com/photo-1546410531-ea854aa7a80b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1574169208507-84376144848b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1505934333218-8fe21faf6eb9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1557672172282-c80d32f0853f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1515006456075-8bd02cdbb7b6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1520038419-5d2bc5061611?auto=format&fit=crop&w=800&q=80'
  ],
  christmas: [
    'https://images.unsplash.com/photo-1512686127411-cf2edbeae698?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1543884877-e6f77cc6ec3c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1543004543-34e8f3b236fa?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1608681282126-78c772cb3f0e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544067137-a25e6480b06b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1577038166708-5d3c87fdb0e3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1606830733555-d41c888ee2af?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1606757270258-00aee69766cd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1608678229447-97d81a9ad781?auto=format&fit=crop&w=800&q=80'
  ]
};

export const CALLIGRAPHY_PHRASES: Record<string, string[]> = {
  birthday: ["생일 축하해", "태어나줘서 고마워", "오늘 하루가 선물이야", "너의 특별한 날"],
  thanks: ["감사합니다", "고맙습니다", "너때문에 행복한 하루였어", "오늘도 수고했어"],
  respect: ["부모님 감사합니다", "엄마 사랑해요", "아빠 사랑해요", "소중한 마음을 담아"],
  lover: ["사랑해", "당신이 있어 행복해", "영원히 함께", "너는 나의 전부"],
  christmas: ["메리 크리스마스", "따뜻한 성탄절", "행복 가득 크리스마스", "선물같은 하루"]
};

/** 캘리그라피 손글씨 폰트 목록 */
export const CALLIGRAPHY_FONTS = [
  "'Dokdo', cursive",
  "'East Sea Dokdo', cursive",
  "'Gaegu', cursive",
  "'Gamja Flower', cursive",
  "'Hi Melody', cursive",
  "'Nanum Pen Script', cursive",
  "'Yeon Sung', cursive"
];

export const PAPER_PRESETS = [
  // 용지 규격
  { id: 'a5', label: 'A5 (210x148mm)', widthMm: 210, heightMm: 148, group: '용지 규격' },
  { id: 'a4', label: 'A4 (210x297mm)', widthMm: 297, heightMm: 210, group: '용지 규격' },
  { id: 'a3', label: 'A3 (297x420mm)', widthMm: 420, heightMm: 297, group: '용지 규격' },
  { id: 'a2', label: 'A2 (420x594mm)', widthMm: 594, heightMm: 420, group: '용지 규격' },
  { id: 'a6', label: 'A6 (105x148mm)', widthMm: 148, heightMm: 105, group: '용지 규격' },
  { id: 'postcard', label: '엽서 (105x148mm)', widthMm: 105, heightMm: 148, group: '용지 규격' },
  // 폼텍 라벨 (사용자 요청 5종: 1, 2, 6, 8, 12칸)
  { id: 'formtec-1', label: '3130 (1칸 - A4 전체)', widthMm: 210, heightMm: 297, group: '폼텍 라벨' },
  { id: 'formtec-2', label: '3102 (2칸 - A4 반절)', widthMm: 199.6, heightMm: 143.5, group: '폼텍 라벨' },
  { id: 'formtec-6', label: '3639 (6칸 - 105x99mm)', widthMm: 105, heightMm: 99, group: '폼텍 라벨' },
  { id: 'formtec-8', label: '3114 (8칸 - 물류용)', widthMm: 99.1, heightMm: 67.7, group: '폼텍 라벨' },
  { id: 'formtec-12', label: '3112 (12칸 - 주소용)', widthMm: 63.5, heightMm: 70, group: '폼텍 라벨' },
];

export const LABEL_CONFIGS: Record<string, {
  cells: number;
  cols: number;
  widthMm: number;
  heightMm: number;
  marginTopMm: number;
  marginLeftMm: number;
  hGapMm: number;
  vGapMm: number;
}> = {
  'formtec-1':  { cells: 1,  cols: 1, widthMm: 210.0, heightMm: 297.0, marginTopMm: 0, marginLeftMm: 0, hGapMm: 0, vGapMm: 0 },
  'formtec-2':  { cells: 2,  cols: 1, widthMm: 199.6, heightMm: 143.5, marginTopMm: 5.0, marginLeftMm: 5.2, hGapMm: 0, vGapMm: 0 },
  'formtec-6':  { cells: 6,  cols: 2, widthMm: 105.0, heightMm: 99.0,  marginTopMm: 0, marginLeftMm: 0, hGapMm: 0, vGapMm: 0 },
  'formtec-8':  { cells: 8,  cols: 2, widthMm: 99.1,  heightMm: 67.7,  marginTopMm: 14.0, marginLeftMm: 4.95, hGapMm: 2.0, vGapMm: 0 },
  'formtec-12': { cells: 12, cols: 3, widthMm: 63.5,  heightMm: 70.0,  marginTopMm: 8.5, marginLeftMm: 9.5, hGapMm: 0, vGapMm: 0 }
};
