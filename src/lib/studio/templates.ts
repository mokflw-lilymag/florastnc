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
    'https://images.unsplash.com/photo-1563241527-300ecebe5fa4?auto=format&fit=crop&w=800&q=80'
  ],
  thanks: [
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1494972308805-463bc619d34e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1505909182942-e2f09aee3e89?auto=format&fit=crop&w=800&q=80'
  ],
  respect: [
    'https://images.unsplash.com/photo-1546410531-ea854aa7a80b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=800&q=80'
  ],
  christmas: [
    'https://images.unsplash.com/photo-1512686127411-cf2edbeae698?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1543884877-e6f77cc6ec3c?auto=format&fit=crop&w=800&q=80'
  ]
};

export const CALLIGRAPHY_PHRASES: Record<string, string[]> = {
  birthday: ["생일 축하해", "태어나줘서 고마워", "오늘 하루가 선물이야", "너의 특별한 날"],
  thanks: ["감사합니다", "고맙습니다", "너때문에 행복한 하루였어", "오늘도 수고했어"],
  respect: ["부모님 감사합니다", "엄마 사랑해요", "아빠 사랑해요", "소중한 마음을 담아"],
  lover: ["사랑해", "당신이 있어 행복해", "영원히 함께", "너는 나의 전부"],
  christmas: ["메리 크리스마스", "따뜻한 성탄절", "행복 가득 크리스마스", "선물같은 하루"]
};

export const CALLIGRAPHY_FONTS = [
  "'Dokdo', cursive",
  "'East Sea Dokdo', cursive",
  "'Gaegu', cursive",
  "'Gamja Flower', cursive",
  "'Hi Melody', cursive",
  "'Nanum Pen Script', cursive",
  "'Yeon Sung', cursive"
];
