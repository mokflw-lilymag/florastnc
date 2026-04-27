export const LANDING_FEATURE_SLUGS = [
  'ai-order-concierge',
  'shop-sync',
  'smart-print-bridge',
  'ai-expense-magic',
  'settlement-engine',
  'mobile-premium',
] as const;

export type LandingFeatureSlug = (typeof LANDING_FEATURE_SLUGS)[number];

export type LandingFeatureDetailSection = {
  heading?: string;
  body: string;
};

export type LandingFeatureCtaLink = {
  label: string;
  href: string;
};

export type LandingFeatureDefinition = {
  slug: LandingFeatureSlug;
  title: string;
  description: string;
  /** Optional hero image under /public; when set, detail page shows it above the fold */
  imageSrc?: string;
  accent: 'amber' | 'blue' | 'emerald' | 'indigo' | 'rose' | 'teal';
  detailSections: LandingFeatureDetailSection[];
  /** Extra CTAs on the feature detail page (e.g. mailto 구매 문의) */
  ctaLinks?: LandingFeatureCtaLink[];
  /** Marks features not yet released */
  comingSoon?: boolean;
};

export const LANDING_FEATURES: LandingFeatureDefinition[] = [
  {
    slug: 'ai-order-concierge',
    title: 'AI 오더 컨시어지',
    description:
      '카톡, 문자, 음성 주문을 AI가 1초 만에 분석하여 빈칸을 채웁니다. 이제 복사하고 붙여넣는 수고조차 필요 없습니다.',
    imageSrc: '/images/ai-order-concierge-ui.png',
    accent: 'amber',
    detailSections: [
      {
        body: '고객 주문 메시지는 말투·순서·정보 누락이 제각각이라 접수할 때마다 시간이 새어 나갑니다. AI 오더 컨시어지는 카카오톡·문자·전화 메모 내용을 읽어 받는 분, 배송일시, 카드 문구, 금액 후보를 주문서 형태로 먼저 정리해 줍니다. 직원은 처음부터 타이핑하지 않고 확인·수정만 하면 되도록 설계했습니다.',
      },
      {
        heading: '현장에서 달라지는 점',
        body: '피크 타임에 가장 많이 걸리는 작업은 입력보다 확인입니다. 주문 정보를 표준 항목으로 먼저 맞춰두면, 전화 끊고 다시 카톡 열어 복사하는 반복이 줄고 오타·누락도 빠르게 잡을 수 있습니다. 특히 “오늘 안에 보내주세요” 같은 급한 주문에서 체감이 큽니다.',
      },
      {
        heading: '도입 권장 매장',
        body: '카톡 주문 비중이 높은 매장, 전화 주문을 직원 간 전달하는 과정이 많은 매장, 매일 비슷한 항목을 여러 번 재입력하는 팀에 특히 적합합니다. 주문 건수가 늘어도 접수 품질을 일정하게 유지하는 데 도움이 됩니다.',
      },
    ],
  },
  {
    slug: 'shop-sync',
    title: '쇼핑몰 올인원 동기화',
    description:
      '네이버 스마트스토어, 카페24 주문이 들어오는 즉시 대시보드에 꽂힙니다. 재고 차감부터 배송 처리까지 자동으로 끝내세요.',
    imageSrc: '/images/shop-sync-api-ui-v2.png',
    accent: 'blue',
    detailSections: [
      {
        body: '네이버·카페24·매장 주문이 서로 끊겨 있으면, 결국 직원이 화면을 왔다 갔다 하며 같은 정보를 두 번 입력하게 됩니다. 쇼핑몰 올인원 동기화는 주문 생성부터 결제, 배송 상태 변경까지 한 화면에서 이어 보게 해 이중 입력과 누락을 줄입니다.',
      },
      {
        heading: '운영 흐름',
        body: '신규 주문 유입 → 제작 대기/진행 → 배차/수령 → 배송 완료까지 단계가 자동으로 연결됩니다. 단계가 바뀔 때마다 기록이 남아 “지금 누가 어떤 건을 잡고 있는지”를 팀 전체가 같은 기준으로 확인할 수 있습니다.',
      },
      {
        heading: '기대 효과',
        body: '채널이 늘어나도 주문 출처·처리 상태·미완료 건이 한눈에 보이기 때문에, 마감 시간에 몰아서 정리하던 부담이 줄어듭니다. 특히 주말·기념일 시즌처럼 주문이 한 번에 몰릴 때 운영 안정성이 크게 올라갑니다.',
      },
    ],
  },
  {
    slug: 'smart-print-bridge',
    title: '스마트 프린트브릿지 (XPrint Engine)',
    description:
      '일반 A4 프린터를 수 미터의 초장축 배너 프린터로 변신시키는 혁신. 감열식 리본 프린터부터 XPrint 통합 제어까지, 하드웨어의 한계를 넘는 압도적 기술력을 경험하세요.',
    imageSrc: '/images/smart-print-bridge-engine.png',
    accent: 'emerald',
    detailSections: [
      {
        heading: 'A4의 한계를 넘는 ‘무한 배너 출력’',
        body: '일반 잉크젯 프린터(Epson M/L 시리즈 등)는 원래 A4 규격 이상의 출력이 불가능합니다. 하지만 Floxync의 독보적인 데이터 스트리밍 기술은 하드웨어의 한계를 강제로 돌파하여, 수 미터에 달하는 대형 배너를 끊김 없이 완벽하게 출력해냅니다. 고가의 대형 장비 없이도 매장의 기존 프린터만으로 전문 배너 출력이 가능해지는 마법 같은 기술입니다.',
      },
      {
        heading: '감열식 리본 프린터의 정밀 제어',
        body: '까다로운 미세 열량 제어와 리본 텐션 조절이 필요한 감열식 프린터를 웹에서 직접 제어하는 것은 어마어마한 기술력이 요구되는 영역입니다. Floxync는 xprint를 포함한 다양한 감열식 하드웨어를 브라우저 환경에서 즉시 구동하며, 리본 인쇄 특유의 정교함을 한 치의 오차 없이 구현해냅니다.',
      },
      {
        heading: '브라우저가 하드웨어를 직접 지배하는 XPrint 엔진',
        body: '복잡한 드라이버 설치와 매번 어긋나는 설정값에 지치셨나요? Floxync의 XPrint 엔진은 웹 기반으로 모든 하드웨어를 통합 관리합니다. 클릭 한 번으로 매장 내 모든 프린터가 즉시 동기화되며, 미리보기와 100% 일치하는 결과물을 뽑아내는 이 강력한 엔진은 오직 Floxync에서만 만날 수 있는 기술적 독보성입니다.',
      },
    ],
    ctaLinks: [
      {
        label: '구매 문의',
        href:
          'mailto:admin@floxync.com?subject=' +
          encodeURIComponent('[Floxync] 스마트 프린트브릿지 구매 문의'),
      },
      {
        label: '테스트 유저 신청',
        href: '/#test-user-apply',
      },
    ],
  },
  {
    slug: 'ai-expense-magic',
    title: 'AI 매직 지출 비서',
    description:
      '영수증, 이제 찍기만 하세요. AI가 상호·금액·품목을 1초 만에 분석하여 지출 장부에 마법처럼 기록합니다.',
    imageSrc: '/images/ai-expense-magic-visual-v2.png',
    accent: 'indigo',
    detailSections: [
      {
        heading: '“찍으면 끝” - 세상에서 가장 쉬운 지출 기록',
        body: '꽃집 운영의 가장 귀찮은 일인 영수증 정리, 이제 사진 한 장으로 끝내세요. Floxync의 AI OCR 엔진은 구겨진 영수증이나 흐릿한 글자도 정확하게 읽어냅니다. 상호명, 날짜, 결제 금액은 물론 부가세까지 알아서 분리하여 장부에 담아드립니다.',
      },
      {
        heading: '문맥을 읽는 지능형 항목 분류',
        body: '단순히 글자만 읽는 것이 아닙니다. AI가 거래처와 품목을 분석하여 꽃 자재비, 배송비, 소모품비 등 사장님이 정한 카테고리로 자동 분류합니다. 사장님은 그저 사진만 찍으세요. 분류와 기록은 AI 비서의 몫입니다.',
      },
      {
        heading: '정산 엔진과 실시간 데이터 연동',
        body: '입력된 지출 데이터는 즉시 ‘금융권 수준의 정산 엔진’과 동기화됩니다. 매출에서 지출을 뺀 진짜 순이익을 실시간으로 확인하세요. 세무 신고 기간에 뭉친 영수증 더미와 씨름하던 고통에서 해방시켜 드립니다.',
      },
    ],
    ctaLinks: [
      {
        label: '테스트 유저 신청',
        href: '/#test-user-apply',
      },
      {
        label: '문의하기',
        href: 'mailto:admin@floxync.com?subject=' + encodeURIComponent('[Floxync] AI 매직 지출 비서 문의'),
      },
    ],
  },
  {
    slug: 'settlement-engine',
    title: '금융권 수준의 정산 엔진',
    description:
      '부가세, 입점 마진율, 기사님 배송 수수료까지. 복잡한 꽃집의 수익 구조를 소수점 단위까지 정확하게 계산해 드립니다.',
    imageSrc: '/images/settlement-engine-dashboard.png',
    accent: 'rose',
    detailSections: [
      {
        body: '매출은 늘었는데 순이익이 안 남는 가장 큰 이유는 수수료·원가·배송비·세금이 각각 따로 계산되기 때문입니다. 정산 엔진은 계산 규칙을 고정해 같은 주문이라면 항상 같은 결과가 나오도록 만들어, 월말 정산의 흔들림을 줄여줍니다.',
      },
      {
        heading: '투명성',
        body: '주문 단위로 “매출-원가-수수료-배송비-세금”을 분해해 보여주기 때문에, 어느 구간에서 마진이 빠졌는지 설명 가능한 형태로 남습니다. 대표와 실무자가 숫자 해석을 두고 다투는 시간을 줄일 수 있습니다.',
      },
      {
        heading: '보고',
        body: '일/주/월 단위 요약과 채널별 비교를 같이 제공해, “어떤 주문 유형이 남는지”를 빠르게 확인할 수 있습니다. 감이 아닌 데이터로 가격·프로모션·운영 기준을 조정하기 쉬워집니다.',
      },
    ],
  },
  {
    slug: 'mobile-premium',
    title: '모바일 센터 프리미엄',
    description:
      '안드로이드 앱 준비중입니다. 베타 공개 시 가장 먼저 안내해 드리겠습니다.',
    accent: 'teal',
    comingSoon: true,
    detailSections: [
      {
        body: '모바일 센터 프리미엄(안드로이드 앱)은 현재 준비중입니다. 매장 밖에서도 주문 확인, 진행 상태 체크, 기본 승인 처리를 빠르게 할 수 있도록 현장 우선 기능부터 순차 공개할 예정입니다.',
      },
      {
        heading: '출시 안내',
        body: '테스트 유저 신청 또는 문의를 남겨주시면 안드로이드 앱 베타 오픈 소식을 우선 안내해 드립니다. 기기 환경별 호환 범위도 함께 안내할 예정입니다.',
      },
      {
        heading: '진행 상태',
        body: '핵심 플로우 안정화 후 상세 기능(알림/승인/현장 체크리스트)과 도입 가이드를 순차적으로 업데이트할 예정입니다.',
      },
    ],
    ctaLinks: [
      {
        label: '테스트 유저 신청',
        href: '/#test-user-apply',
      },
      {
        label: '문의하기',
        href: 'mailto:admin@floxync.com?subject=' + encodeURIComponent('[Floxync] 안드로이드 앱 출시 문의'),
      },
    ],
  },
];

export function getLandingFeatureBySlug(slug: string): LandingFeatureDefinition | undefined {
  return LANDING_FEATURES.find((f) => f.slug === slug);
}
