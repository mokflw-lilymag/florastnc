# FloXync 구독 — 해외 카드 (Stripe) 설정

한국 매장(`system_settings.data.country = KR`)은 **토스페이먼츠**, 그 외 국가는 **Stripe Checkout (USD)** 로 구독 결제합니다.

## 1. Stripe 대시보드

1. [Stripe Dashboard](https://dashboard.stripe.com/) 에서 계정 생성
2. **Developers → API keys** 에서 키 복사
3. (권장) **Settings → Customer emails** 등 브랜딩 설정

## 2. 환경 변수 (Vercel / `.env.local`)

```env
# 해외 구독 결제 (필수 — 해외 매장용)
STRIPE_SECRET_KEY=sk_test_...   # 또는 sk_live_...

# 한국 구독 (기존)
TOSS_SECRET_KEY=test_sk_...
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...
```

`STRIPE_SECRET_KEY` 가 없으면 해외 국가 매장은 결제 시 503 + 안내 메시지가 표시됩니다.

## 3. 매장 국가 설정

**설정 → 매장 정보 → 운영 국가** 에서 `KR` 이 아니면 자동으로 Stripe 분기됩니다.

## 4. 결제 흐름

1. `/dashboard/subscription` 에서 플랜 선택
2. `POST /api/payments/stripe/checkout` → Stripe Hosted Checkout
3. 성공 시 `/dashboard/subscription/success?provider=stripe&session_id=...`
4. `POST /api/payments/stripe/confirm` → `tenants` 구독 갱신

## 5. USD 요금 (센트)

`src/lib/subscription/pricing.ts` 의 `PLAN_USD_TOTAL_CENTS` 에서 조정합니다.

## 6. 운영 전 체크리스트

- [ ] Stripe **테스트 카드** `4242 4242 4242 4242` 로 E2E
- [ ] 운영 국가 VN/US 등으로 설정한 테스트 테넌트에서 USD 표시 확인
- [ ] KR 테넌트는 여전히 토스 창이 뜨는지 확인
- [ ] Live 전환 시 `sk_live_` 키로 교체

## 7. (선택) Webhook

현재는 **성공 URL + confirm API** 로 구독을 반영합니다.  
브라우저 이탈 대비가 필요하면 `checkout.session.completed` 웹훅을 추가하는 것을 권장합니다.
