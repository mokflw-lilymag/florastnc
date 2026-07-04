export type SelfCheckItem = {
  id: string;
  ok: boolean;
  label: string;
  hint: string;
  severity: "ok" | "warn" | "error";
};

export const SELF_CHECK_GUIDE_MARKDOWN = `## 🔍 먼저 해보세요 (30초 셀프 점검)

문의 전에 아래를 확인하면 **바로 해결**되는 경우가 많습니다.

### 1. 로그인·비밀번호
- 이메일·비밀번호 철자 확인
- 비밀번호 분실 → **「로그인·비밀번호」** 카테고리

### 2. 구독·만료
- **구독** 메뉴에서 만료일 확인
- 결제 후에도 만료 → **「구독·결제」** + 영수증 캡처 첨부

### 3. ppBridge·인쇄
- install.bat **관리자 권한** 실행
- http://127.0.0.1:8004/api/version 접속 확인
- 설정 → 프린터에서 연결 확인

### 4. 환경설정이 어려울 때
- **「환경설정 대리」** → 동의 + 확인용 비밀번호(4~6자리)

### 5. 그래도 안 될 때
- **문의하기** + 스크린샷 첨부`;
