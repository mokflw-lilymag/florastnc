export const LANDING_FEATURE_SLUGS = [
  'ai-order-concierge',
  'shop-sync',
  'cloud-smart-ribbon',
  'intelligent-inventory',
  'settlement-engine',
  'mobile-premium',
] as const;

export type LandingFeatureSlug = (typeof LANDING_FEATURE_SLUGS)[number];

export type LandingFeatureDetailSection = {
  heading?: string;
  body: string;
};

export type LandingFeatureDefinition = {
  slug: LandingFeatureSlug;
  title: string;
  description: string;
  /** Optional hero image under /public; when set, detail page shows it above the fold */
  imageSrc?: string;
  accent: 'amber' | 'blue' | 'emerald' | 'indigo' | 'rose' | 'teal';
  detailSections: LandingFeatureDetailSection[];
};

export const LANDING_FEATURES: LandingFeatureDefinition[] = [
  {
    slug: 'ai-order-concierge',
    title: 'AI 오더 컨시어지',
    description:
      '카톡, 문자, 음성 주문을 AI가 1초 만에 분석하여 빈칸을 채웁니다. 이제 복사하고 붙여넣는 수고조차 필요 없습니다.',
    accent: 'amber',
    detailSections: [
      {
        body: '고객이 보내는 문장은 매번 제각각입니다. FloraSync는 수신 채널에서 들어온 텍스트·음성을 구조화된 주문서로 바꿔, 받는 사람·배송지·메시지 카드·금액 후보까지 한 화면에서 검토할 수 있게 합니다.',
      },
      {
        heading: '왜 빠른가',
        body: '반복 입력과 오타 수정에 쓰던 시간을 줄이면, 디자인·제작·고객 응대에 더 쓸 수 있습니다. AI는 초안을 만들고, 최종 확인은 언제나 사람의 몫입니다.',
      },
      {
        heading: '이런 매장에 맞습니다',
        body: '카카오톡·SMS로 주문이 몰리는 화원, 전화·음성 메모를 자주 남기는 팀, 채널이 늘어날수록 장부가 흩어지는 경우에 특히 효과적입니다.',
      },
    ],
  },
  {
    slug: 'shop-sync',
    title: '쇼핑몰 올인원 동기화',
    description:
      '네이버 스마트스토어, 카페24 주문이 들어오는 즉시 대시보드에 꽂힙니다. 재고 차감부터 배송 처리까지 자동으로 끝내세요.',
    accent: 'blue',
    detailSections: [
      {
        body: '온라인 몰과 오프라인 매장이 따로 노는 순간, 이중 입력과 재고 불일치가 생깁니다. 주문·결제·배송 상태를 한곳에서 따라가면 실수와 누락이 줄어듭니다.',
      },
      {
        heading: '운영 흐름',
        body: '신규 주문 알림 → 픽·제작·배차까지 워크플로에 태우고, 발주·배송 단계가 바뀔 때마다 기록이 이어지도록 설계했습니다.',
      },
      {
        heading: '기대 효과',
        body: '채널이 늘어도 ‘어디서 팔았는지’가 한 눈에 보이고, 마감 직전에만 하던 정리 작업을 평소에 나눠 할 수 있습니다.',
      },
    ],
  },
  {
    slug: 'cloud-smart-ribbon',
    title: '클라우드 스마트 리본',
    description:
      '전국 어디서든 폰 하나로 매장 프린터를 제어합니다. 전문가용 서체와 정밀 레이아웃이 포함된 리본을 0.5초 만에 방출합니다.',
    accent: 'emerald',
    detailSections: [
      {
        body: '리본 출력은 현장 감각과 속도가 동시에 필요합니다. 클라우드에서 레이아웃과 문구를 맞춘 뒤, 매장 프린터로 바로 보내 분주한 피크 타임에도 줄을 서지 않게 합니다.',
      },
      {
        heading: '디테일',
        body: '서체·여백·정렬을 보존한 채 출력 품질을 맞추고, 매장마다 다른 프린터 환경에서도 동일한 결과를 목표로 합니다.',
      },
      {
        heading: '활용 시나리오',
        body: '외근 중에도 주문 확정과 동시에 리본을 뽑아두거나, 여러 지점에서 동일한 브랜드 포맷을 유지할 때 유리합니다.',
      },
    ],
  },
  {
    slug: 'intelligent-inventory',
    title: '인텔리전트 재고 관리',
    description:
      '사진 촬영 한 번으로 남은 꽃의 송이 수를 파악하고, 판매 시 자동으로 단 단위로 환산하여 재고에서 차감합니다.',
    accent: 'indigo',
    detailSections: [
      {
        body: '꽃·소재는 단위가 제각각이라 재고 장부가 금방 틀어집니다. 입고·촬영·판매를 같은 흐름에 묶어, 숫자가 현장과 말이 통하도록 만드는 데 초점을 둡니다.',
      },
      {
        heading: '판매와 연결',
        body: '주문에 들어간 구성품이 재고에서 어떻게 빠지는지 일관되게 맞추면, ‘없는 줄 알았는데 남아 있었다’ 같은 상황을 줄일 수 있습니다.',
      },
      {
        heading: '도입 팁',
        body: '촬영·메모 습관을 팀 규칙으로 정해 두면, 바쁜 날에도 입력이 누락되지 않습니다.',
      },
    ],
  },
  {
    slug: 'settlement-engine',
    title: '금융권 수준의 정산 엔진',
    description:
      '부가세, 입점 마진율, 기사님 배송 수수료까지. 복잡한 꽃집의 수익 구조를 소수점 단위까지 정확하게 계산해 드립니다.',
    accent: 'rose',
    detailSections: [
      {
        body: '매출만 보이고 이익이 안 보이는 경우, 대개은 비용·수수료·세금이 여러 층으로 쌓여 있기 때문입니다. 규칙을 코드로 고정해 두면 같은 조건으로 반복 계산할 수 있습니다.',
      },
      {
        heading: '투명성',
        body: '배송·입점·할인 규칙을 나누어 보면, 어디서 마진이 줄었는지 설명 가능한 형태로 남습니다.',
      },
      {
        heading: '보고',
        body: '일·주·월 단위로 숫자를 끌어올려, 대표와 실무자가 같은 표를 보고 대화할 수 있습니다.',
      },
    ],
  },
  {
    slug: 'mobile-premium',
    title: '모바일 센터 프리미엄',
    description:
      'PC 앞이 아니어도 상관없습니다. 배달 기사 호출부터 정산 보고서 확인까지, 모든 기능을 스마트폰 앱에서 동일하게 지원합니다.',
    accent: 'teal',
    detailSections: [
      {
        body: '화원은 자리에 앉아만 일하지 않습니다. 현장·시장·배차 라인을 오가며 처리해야 하므로, 모바일이 ‘축소판’이 아니라 동등한 작업 화면이어야 합니다.',
      },
      {
        heading: '동일한 권한',
        body: '자주 쓰는 기능을 손이 닿는 곳에 두고, 긴급한 확인·승인을 지연 없이 처리할 수 있도록 구성합니다.',
      },
      {
        heading: '운영 습관',
        body: '알림과 할 일 목록을 모바일에서 바로 소비하면, ‘나중에 PC에서’라는 백로그가 줄어듭니다.',
      },
    ],
  },
];

export function getLandingFeatureBySlug(slug: string): LandingFeatureDefinition | undefined {
  return LANDING_FEATURES.find((f) => f.slug === slug);
}
