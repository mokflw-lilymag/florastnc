import type { PlatformEmailTemplate } from "./types";

const wrap = (title: string, body: string) => `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"/><title>${title}</title></head>
<body style="font-family:'Malgun Gothic',Apple SD Gothic Neo,sans-serif;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <p style="font-size:14px;color:#666;">FloXync · 꽃집 운영을 돕는 AI 비서</p>
  ${body}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
  <p style="font-size:12px;color:#888;">본 메일은 FloXync 운영팀에서 발송했습니다. 문의: admin@floxync.com</p>
</body>
</html>`;

export const DEFAULT_PLATFORM_EMAIL_TEMPLATES: Omit<
  PlatformEmailTemplate,
  "created_at" | "updated_at" | "updated_by"
>[] = [
  {
    slug: "beta-printer-lease-contract",
    category: "contract",
    name_ko: "베타 테스터 — 포스프린터 무상 임대 계약 안내",
    name_en: "Beta POS printer lease agreement",
    description: "베타 10곳 선정 후 계약서·출고 안내",
    subject: "[FloXync] 베타 테스터 선정 및 포스프린터 무상 임대 안내 — {상호}",
    variables: ["이름", "상호", "연락처", "이메일"],
    sort_order: 10,
    is_active: true,
    body_html: wrap(
      "베타 임대 안내",
      `<h2 style="color:#047857;">축하합니다, {이름} 사장님! 🌸</h2>
<p><strong>{상호}</strong> 매장이 FloXync 베타 테스터(포스프린터 무상 임대)에 <strong>선정</strong>되었습니다.</p>
<p>아래 내용을 확인하신 뒤, <strong>회신 주시면</strong> 포스프린터 출고(새 영수증 용지 장착) 및 자동 인쇄 연동 안내를 드리겠습니다.</p>
<ul>
  <li>임대 장비: USB 포스 영수증 프린터 1대</li>
  <li>용도: 주문서·픽업증·인수증 자동 출력</li>
  <li>연락처: {연락처} / {이메일}</li>
</ul>
<p><strong>프린터 수령을 위해 배송받으실 주소를 본 메일의 답장으로 회신해 주시면</strong>, 신속히 출고를 진행하고 전자 계약서 서명 링크를 보내드리겠습니다.</p>
<p>감사합니다.<br/>FloXync 운영팀</p>`,
    ),
  },
  {
    slug: "beta-tier-only-upgrade",
    category: "contract",
    name_ko: "베타 테스터 — 프로플러스 요금제 혜택 안내",
    name_en: "Beta tier only upgrade",
    description: "장비 임대 없이 티어 승급 혜택만 제공하는 경우",
    subject: "[FloXync] 베타 테스터 선정 및 프로플러스 요금제 혜택 안내 — {상호}",
    variables: ["이름", "상호", "연락처", "이메일"],
    sort_order: 15,
    is_active: true,
    body_html: wrap(
      "베타 테스터 혜택 안내",
      `<h2 style="color:#047857;">축하합니다, {이름} 사장님! 🌸</h2>
<p><strong>{상호}</strong> 매장이 FloXync 베타 테스터에 <strong>선정</strong>되었습니다.</p>
<p>대표님께서는 장비 임대 없이 <strong>[프로플러스 요금제] 무료 이용 혜택</strong>을 적용받게 되셨습니다.</p>
<p>플로싱크에 로그인하시면 곧바로 최고 등급의 모든 기능(고객 관리, 판매 분석, 단골 타겟 마케팅 등)을 무제한으로 이용하실 수 있습니다.</p>
<ul>
  <li>적용 혜택: 프로플러스 요금제 (월 66,000원 상당)</li>
  <li>이용 방법: 플로싱크 로그인 후 모든 기능 즉시 사용 가능</li>
  <li>연락처: {연락처} / {이메일}</li>
</ul>
<p>이용하시면서 필요한 기능이나 개선 의견이 있으시면 언제든지 편하게 고객센터로 말씀해 주세요.</p>
<p>감사합니다.<br/>FloXync 운영팀</p>`,
    ),
  },
  {
    slug: "subscription-renewal-reminder",
    category: "extension",
    name_ko: "구독 갱신·연장 안내",
    name_en: "Subscription renewal",
    description: "만료 전 연장 안내",
    subject: "[FloXync] 구독 갱신 안내 — {상호}",
    variables: ["이름", "상호", "만료일", "플랜명"],
    sort_order: 20,
    is_active: true,
    body_html: wrap(
      "구독 갱신",
      `<p>{이름} 사장님, 안녕하세요.</p>
<p><strong>{상호}</strong> FloXync <strong>{플랜명}</strong> 구독 만료 예정일은 <strong>{만료일}</strong>입니다.</p>
<p>서비스 중단 없이 이용하시려면 대시보드 <strong>구독 · 플랜</strong> 메뉴에서 연장해 주세요.</p>`,
    ),
  },
  {
    slug: "pos-printer-shipment",
    category: "hardware",
    name_ko: "포스프린터 출고·연동 안내",
    name_en: "POS printer shipment",
    description: "계약 완료 후 출고",
    subject: "[FloXync] 포스프린터 출고 및 자동 인쇄 연동 안내 — {상호}",
    variables: ["이름", "상호", "기종명", "운송장번호"],
    sort_order: 30,
    is_active: true,
    body_html: wrap(
      "출고 안내",
      `<p>{이름} 사장님,</p>
<p>요청하신 포스프린터(<strong>{기종명}</strong>)가 출고되었습니다.</p>
<p>운송장: {운송장번호}</p>
<p>수령 후 FloXync 윈도우 앱 또는 환경 설정 → 프린터/브릿지에서 연결 테스트를 진행해 주세요.</p>`,
    ),
  },
  {
    slug: "pos-printer-return",
    category: "hardware",
    name_ko: "포스프린터 반납 안내",
    name_en: "POS printer return",
    description: "해지·베타 종료 시 반납",
    subject: "[FloXync] 임대 포스프린터 반납 안내 — {상호}",
    variables: ["이름", "상호", "반납기한", "반납주소"],
    sort_order: 40,
    is_active: true,
    body_html: wrap(
      "반납 안내",
      `<p>{이름} 사장님,</p>
<p>임대 중인 포스프린터 반납 안내드립니다.</p>
<ul>
  <li>반납 기한: <strong>{반납기한}</strong></li>
  <li>반납 주소: {반납주소}</li>
</ul>
<p>포장 상태로 발송해 주시면 확인 후 안내드리겠습니다.</p>`,
    ),
  },
  {
    slug: "marketing-feature-update",
    category: "marketing",
    name_ko: "기능 업데이트·소식",
    name_en: "Feature update",
    description: "신기능·업데이트 홍보",
    subject: "[FloXync] 새로운 기능을 소개합니다 — {제목}",
    variables: ["이름", "상호", "제목", "본문요약"],
    sort_order: 50,
    is_active: true,
    body_html: wrap(
      "기능 소식",
      `<p>{이름} 사장님,</p>
<h3 style="color:#047857;">{제목}</h3>
<p>{본문요약}</p>
<p><a href="https://floxync.com/ko" style="color:#047857;">자세히 보기 →</a></p>`,
    ),
  },
  {
    slug: "welcome-onboarding",
    category: "onboarding",
    name_ko: "가입 환영·시작 가이드",
    name_en: "Welcome onboarding",
    description: "신규 가입 직후",
    subject: "[FloXync] 환영합니다, {상호} 사장님! 🌸",
    variables: ["이름", "상호", "매뉴얼링크"],
    sort_order: 60,
    is_active: true,
    body_html: wrap(
      "환영",
      `<p>{이름} 사장님, FloXync에 오신 것을 환영합니다!</p>
<p><strong>{상호}</strong> 매장 운영을 돕기 위해 준비했습니다.</p>
<ol>
  <li>환경 설정에서 매장 정보·배송비를 먼저 저장하세요.</li>
  <li>프린터가 있으면 브릿지 연결 후 주문 저장 → 자동 인쇄를 확인하세요.</li>
</ol>
<p>매뉴얼: <a href="{매뉴얼링크}">{매뉴얼링크}</a></p>`,
    ),
  },
  {
    slug: "billing-invoice-notice",
    category: "billing",
    name_ko: "결제·청구 안내",
    name_en: "Billing notice",
    description: "결제 완료·청구서",
    subject: "[FloXync] 결제 안내 — {상호}",
    variables: ["이름", "상호", "금액", "결제일", "플랜명"],
    sort_order: 70,
    is_active: true,
    body_html: wrap(
      "결제 안내",
      `<p>{이름} 사장님,</p>
<p><strong>{플랜명}</strong> 결제({금액})가 {결제일}에 처리되었습니다.</p>
<p>영수증·세금계산서가 필요하시면 회신해 주세요.</p>`,
    ),
  },
  {
    slug: "support-reply-generic",
    category: "support",
    name_ko: "고객 문의 회신 (일반)",
    name_en: "Support reply",
    description: "문의 티켓 회신용",
    subject: "Re: [FloXync] 문의 회신 — {상호}",
    variables: ["이름", "상호", "회신내용"],
    sort_order: 80,
    is_active: true,
    body_html: wrap(
      "문의 회신",
      `<p>{이름} 사장님, 안녕하세요.</p>
<p>FloXync 고객센터입니다.</p>
<div style="background:#f8fafc;border-left:4px solid #10b981;padding:12px 16px;margin:16px 0;">
{회신내용}
</div>
<p>추가 문의는 이 메일에 회신해 주세요.</p>`,
    ),
  },
  {
    slug: "maintenance-notice",
    category: "operations",
    name_ko: "점검·장애 안내",
    name_en: "Maintenance notice",
    description: "예정 점검·복구 안내",
    subject: "[FloXync] 서비스 점검 안내 ({점검일시})",
    variables: ["점검일시", "예상소요", "영향범위", "상세내용"],
    sort_order: 90,
    is_active: true,
    body_html: wrap(
      "점검 안내",
      `<p>안녕하세요, FloXync 운영팀입니다.</p>
<p>아래 일정으로 점검이 예정되어 있습니다.</p>
<ul>
  <li>일시: <strong>{점검일시}</strong></li>
  <li>예상 소요: {예상소요}</li>
  <li>영향: {영향범위}</li>
</ul>
<p>{상세내용}</p>
<p>이용에 불편을 드려 죄송합니다.</p>`,
    ),
  },
  {
    slug: "beta-invite-waitlist",
    category: "marketing",
    name_ko: "베타 신청 접수 확인",
    name_en: "Beta application received",
    description: "신청 직후 자동 회신용(수동 발송)",
    subject: "[FloXync] 베타 신청이 접수되었습니다 — {상호}",
    variables: ["이름", "상호"],
    sort_order: 5,
    is_active: true,
    body_html: wrap(
      "베타 접수",
      `<p>{이름} 사장님,</p>
<p>FloXync 베타 신청이 정상 접수되었습니다. 검토 후 순차적으로 연락드리겠습니다.</p>
<p>포스프린터 무상 임대(한정 10곳) 선정 시 <strong>이메일로 계약서</strong>를 보내 드립니다.</p>`,
    ),
  },
];

export function categoryLabelKo(category: string): string {
  const found = [
    { id: "contract", labelKo: "계약·동의" },
    { id: "extension", labelKo: "구독·연장" },
    { id: "hardware", labelKo: "포스·임대 장비" },
    { id: "marketing", labelKo: "마케팅·안내" },
    { id: "onboarding", labelKo: "온보딩·가입" },
    { id: "billing", labelKo: "결제·청구" },
    { id: "support", labelKo: "고객 지원" },
    { id: "operations", labelKo: "운영·점검" },
  ].find((c) => c.id === category);
  return found?.labelKo ?? category;
}
