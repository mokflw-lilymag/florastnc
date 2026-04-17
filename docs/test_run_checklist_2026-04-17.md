# Florasync 테스트 체크리스트 (경량)

작성일: 2026-04-17  
범위: 웹훅 설정/결제 confirm/스키마 적용 재현

## 1) 사전 준비

- [ ] `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL` 설정 확인
- [ ] `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 설정 확인
- [ ] `.env.local`에 `TOSS_SECRET_KEY` 설정 확인
- [ ] 개발 서버 재시작 (`npm run dev`)

## 2) 웹훅 설정 가드 확인

### POS Webhook
- [ ] `POST /api/pos/webhook/easycheck` 호출 시 정상 payload 응답 확인
- [ ] 설정값 누락 상황에서 `503` + `code: CONFIG_MISSING` 응답 확인
- [ ] 서버 로그에 `[POS Webhook][CONFIG_MISSING]` 출력 확인

### KakaoT Webhook
- [ ] `POST /api/delivery/webhook/kakao` 정상 payload 처리 확인
- [ ] 설정값 누락 상황에서 `503` + `code: CONFIG_MISSING` 응답 확인
- [ ] 서버 로그에 `[KakaoT Webhook][CONFIG_MISSING]` 출력 확인

## 3) 결제 confirm 중복 가드 확인

- [ ] `POST /api/payments/confirm` 정상 요청 1회 성공 확인
- [ ] 동일 `paymentKey`로 즉시 재호출 시 `202` 응답 확인
- [ ] `orderId` 형식 오류 요청 시 `400` 응답 확인
- [ ] `TOSS_SECRET_KEY` 누락 상황에서 `503` + `code: CONFIG_MISSING` 확인

## 4) 스키마 재현 확인

- [ ] `docs/supabase_schema_apply_order.md` 순서대로 SQL 적용
- [ ] 검증 쿼리 실행 후 주요 테이블 존재 확인
- [ ] 테스트 로그에 적용 일시/적용 파일명 기록

## 5) 테스트 결과 기록

- [ ] 실패 케이스별 원인 분류 (환경변수/입력값/외부 API)
- [ ] 재현 가능한 최소 조건 기록
- [ ] 다음 라운드 액션 아이템 3개 선정

## 비고

- 테스트 단계 문서이므로 빠른 반복을 우선한다.
- 운영 전환 시 보안/멱등성/마이그레이션 강화를 별도 정식 체크리스트로 승격한다. (`TODO: PROD-HARDEN`)
