# Florasync Android 클라이언트 추가 (구현 요약)

PC/랩탑은 기존 웹 브라우저 그대로 사용하고, **Android는 Capacitor WebView**로 동일 배포 URL을 로드합니다. 비즈니스 로직·API는 변경하지 않으며, **리본 프린터(로컬 브릿지)** 는 Android에서 메뉴·라우트 가드로 비노출합니다.

## 저장소에 포함된 것

| 항목 | 설명 |
|------|------|
| `capacitor.config.ts` | `CAP_SERVER_URL`이 있으면 원격 Next 앱을 로드 |
| `capacitor-assets/` | `webDir`용 최소 정적 파일 (동기화 시 Android 에셋으로 복사) |
| `android/` | Capacitor Android 프로젝트 (`prod` / `staging` productFlavor) |
| `src/lib/client-platform.ts` | `isCapacitorAndroid()` 등 |
| `src/hooks/use-capacitor-android.ts` | 클라이언트 전용 훅 |
| `src/components/capacitor/redirect-if-android-app.tsx` | 리본 전용 라우트 진입 차단 |
| `src/components/layout/android-app-chrome.tsx` | Android 앱 전용 하단 탭·FAB·더보기 시트 |
| 웹 UI 가드 | `sidebar`, `header`, `global-quick-nav`, `orders`, `printer`, `print-ribbon` |

## 동기화 및 빌드

1. **프로덕션(또는 스테이징) URL**을 환경 변수로 지정한 뒤 동기화합니다.

   **PowerShell 예시**

   ```powershell
   $env:CAP_SERVER_URL = "https://your-production-domain.com"
   npm run cap:sync
   ```

2. Android Studio에서 열기:

   ```powershell
   npm run cap:open
   ```

3. 빌드 변형  
   - **prod:** `com.florasync.partner`  
   - **staging:** `com.florasync.partner.staging` (`applicationIdSuffix`)

   스테이징·프로덕션 **WebView URL**은 Capacitor가 `npx cap sync` 시점의 `capacitor.config.ts`를 반영합니다. 환경별로 **다른 URL을 쓰려면** 스테이징 빌드 전에 `CAP_SERVER_URL`을 바꾼 뒤 `npm run cap:sync`를 다시 실행하세요.

## Google Play 배포 시 체크리스트

- [ ] 데이터 안전(Data safety) 설문: 인증·주문·고객 데이터 처리 방침과 일치시키기  
- [ ] 개인정보처리방침 URL(웹) 링크  
- [ ] 내부 테스트 → 비공개 프로덕션 순 롤아웃  
- [ ] WebView에서 **Toss 결제** 등 외부 페이지 실결제 테스트  
- [ ] 로그인·세션 만료 후 재로그인(E2E)

## 알려진 제한 (의도적)

- Android 앱에서는 **리본 프린터·리본 프린터 전송·인쇄용 리본 레이아웃 페이지**에 진입할 수 없습니다. PC에서 Ribbonist Bridge를 사용하세요.
- `ribbon_only` 플랜 사용자는 Android에서 리본 메뉴가 숨겨지며, 카드 디자인 등 다른 허용 기능은 동일하게 이용할 수 있습니다.

## npm 스크립트

- `npm run cap:sync` — `npx cap sync android`
- `npm run cap:open` — Android Studio 실행
