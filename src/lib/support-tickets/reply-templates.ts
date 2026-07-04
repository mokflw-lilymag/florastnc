export type SupportReplyTemplate = {
  id: string;
  label: string;
  body: string;
};

export const SUPPORT_REPLY_TEMPLATES: SupportReplyTemplate[] = [
  {
    id: "bridge-install",
    label: "ppBridge 설치 안내",
    body: `안녕하세요, Floxync 고객센터입니다.

ppBridge(인쇄 브릿지) 연결 방법을 안내드립니다.

1. 설정 → 프린터·ppBridge 메뉴에서 설치 파일을 받습니다.
2. install.bat 을 **관리자 권한**으로 실행합니다.
3. 브라우저에서 http://127.0.0.1:8004/api/version 이 열리는지 확인합니다.
4. Floxync 설정에서 프린터를 선택 후 테스트 인쇄를 해 보세요.

추가로 도움이 필요하시면 스크린샷과 함께 다시 문의해 주세요.`,
  },
  {
    id: "password-reset-done",
    label: "비밀번호 초기화 완료",
    body: `안녕하세요, Floxync 고객센터입니다.

요청하신 대로 임시 비밀번호를 설정해 드렸습니다. 이메일로도 발송되었을 수 있습니다.

로그인 후 **설정 → 계정**에서 반드시 새 비밀번호로 변경해 주세요.

문제가 계속되면 알려주세요.`,
  },
  {
    id: "subscription-extended",
    label: "구독 연장 완료",
    body: `안녕하세요, Floxync 고객센터입니다.

말씀해 주신 내용을 확인하여 구독 기간을 연장해 드렸습니다. 브라우저를 새로고침한 뒤 이용해 보세요.

추가 문의 사항이 있으면 편하게 남겨 주세요.`,
  },
  {
    id: "settings-done",
    label: "환경설정 반영 완료",
    body: `안녕하세요, Floxync 고객센터입니다.

요청하신 환경설정을 반영했습니다. 브라우저를 **새로고침**한 뒤 동작을 확인해 주세요.

동일 증상이 남아 있으면 스크린샷과 함께 다시 알려주세요.`,
  },
  {
    id: "faq-pointer",
    label: "FAQ 안내",
    body: `안녕하세요, Floxync 고객센터입니다.

고객센터 하단 **자주 묻는 질문**에 비슷한 안내가 있습니다. 한번 확인해 보시고, 해결되지 않으면 다시 문의해 주세요.`,
  },
];
