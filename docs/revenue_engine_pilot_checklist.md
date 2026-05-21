# Floxync 매출 엔진 — Phase 1 파일럿 체크리스트

> 3~5 매장 · 4주 파일럿 (P1-PILOT)  
> 상세 사용법: [revenue_engine_user_manual.md](./revenue_engine_user_manual.md)

## Week 0 — 온보딩

- [ ] `revenue_engine_schema.sql` 프로덕션 Supabase 적용
- [ ] Trigger.dev PRODUCTION 배포 (`npm run trigger:deploy`)
- [ ] Vercel env: TRIGGER_* · GEMINI · (선택) SOLAPI
- [ ] 파일럿 매장 3~5곳 선정

## Week 1 — 데이터 쌓기

- [ ] 매장별 고객 10명+ · 기념일 1건+ (온보딩 체크리스트)
- [ ] 기념일 Auto-Pilot ON
- [ ] D-7 수동 발송 1회 이상 (mock OK)

## Week 2 — 구매 후 · SNS

- [ ] 구매 후 Auto-Pilot ON
- [ ] 완료 주문 3건+ → order-delivered run 확인
- [ ] SNS AI 초안 1회+ · 복사 게시

## Week 3 — 귀속

- [ ] utm 링크 경유 주문 1건+ → Floxync가 번 돈 > 0
- [ ] 매장 설문: 「매출에 도움됐다」 60%+ 목표

## Week 4 — 리포트

- [ ] `/dashboard/admin/revenue` 테넌트별 집계 스크린샷
- [ ] 이슈·개선사항 `docs/qa_test_report_YYYYMMDD.md` (선택)
- [ ] Phase 2(Postiz) 일정 확정

## KPI (North Star)

| 지표 | 목표 |
|------|------|
| Floxync 귀속 주문 | 파일럿 매장 50%+ · 4주 내 1건+ |
| 「매출 도움」 체감 | 60%+ |
| SNS 초안 사용 | 주 1회+ 복사 |
