# 메타(인스타그램) 자동화 연동 진행 상황 보고서 (2026-04-22)

## 📋 요약
본사 홍보 마스터 기능 구현을 위한 메타(Instagram Graph API) 연동 작업을 진행했으나, 페이스북의 일시적인 접근 차단으로 인해 인스타그램 계정 ID 확보 단계에서 중단되었습니다.

## 🔑 확보된 키값 (보안 주의)
현재까지 추출에 성공한 데이터입니다. (내일 작업 시 바로 사용 가능)

- **앱 이름**: florasync
- **App ID**: `1834771173855867`
- **App Secret**: `e2eff05a281538cf6b36cc65521f87f4`
- **User Access Token**: `EAAaEtvQP0nsBRUe9cbGqjCBprBnqCZCuQCTU8yA0oqkBa8HJKv3uZBnXhwnaZBRzhFOXNctmYEzKPkg0SndKjJkxmXo2CFZAefN5WP9TDsm98KRZBlBYIxIRZCiCJ3aIQVer491WfGpLtZAZBiu4SZBQS5PpM9duKRHsYnpEcZCowwdxCBWthqr91sVvvu62jXZBvwWNRAEEWmjJklapmg1iHjOiaZCk6hWLK6PpC8JaB6jVlyB2jmZCtDL72Vbf7tiMYaxEBJ7doM3vMPEgXY7oalKeu`
- **Facebook Page ID**: `122107416542814480` (이름: Flora Sync)

## 🚫 중단 사유 및 해결 방법
- **사유**: 그래프 API 탐색기에서 짧은 시간 내에 반복적인 권한 요청 및 쿼리 실행으로 인해 페이스북 보안 시스템이 **"일시적으로 차단됨(동작 속도가 너무 빠름)"** 메시지를 띄우며 접근을 제한함.
- **해결**: 보통 24시간 정도 경과 후 자동으로 해제됩니다. 내일 다시 시도하면 정상적으로 조회가 가능합니다.

## 📝 내일 이어서 해야 할 작업 (Step-by-Step)
1. **인스타그램 비즈니스 ID 확인**: 
   - [그래프 API 탐색기](https://developers.facebook.com/tools/explorer/) 접속
   - `122107416542814480?fields=instagram_business_account` 쿼리 실행
   - 결과에서 `instagram_business_account.id` 확보 (이게 마지막 키입니다!)
2. **장기 토큰 교환**:
   - 현재 토큰은 단기용일 수 있으므로, [액세스 토큰 도구](https://developers.facebook.com/tools/accesstoken/)에서 60일짜리 장기 토큰으로 교환 작업 필요.
3. **환경 변수 등록**:
   - 확보된 모든 키값을 `.env.local` 또는 서버 설정에 반영.

---
**작성자**: Antigravity (AI Coding Assistant)
