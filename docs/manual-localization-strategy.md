# Manual Localization Strategy

## Goal
When language/country is changed in the app, manual content should also follow:
- Global common guide (same for all countries)
- Country-specific guide (tax, payment, delivery, legal workflow)

## Recommended Manual Structure

1. **Core Manual (Common)**
   - Product overview
   - Basic navigation
   - Order/inventory/print baseline flow
   - Account/security basics

2. **Country Addendum**
   - Messaging channel setup (e.g. KR KakaoTalk, VN Zalo)
   - Delivery integration setup (e.g. KR Kakao T, VN/SG Grab)
   - Payment and settlement specifics (PIX, PayNow, SPEI, etc.)
   - Tax/receipt requirements by country
   - Address/phone/date format examples

3. **Locale Variants**
   - Same country with language variants (e.g. CA: en-CA/fr-CA)
   - UI terms and screenshots aligned with selected locale

## Routing / URL Proposal

- Common: `/docs/manual/common`
- Country: `/docs/manual/country/[countryCode]`
- Locale variant: `/docs/manual/country/[countryCode]?locale=en-CA`

## Rendering Rule in App

When user opens manual:
1. Detect `preferred_country`
2. Detect `preferred_locale`
3. Show:
   - Common section first
   - Country section second
   - Locale-specific labels/examples if available

Fallback order:
1. `[country + locale]`
2. `[country + base language]`
3. `[country default language]`
4. `common only`

## Content Authoring Format

Use Markdown + frontmatter for each section:

```md
---
type: country
country: VN
locale: vi
title: "Vietnam Operations Manual"
version: "1.0"
---
```

## Rollout Plan

1. Phase A: Common manual split from existing one
2. Phase B: Country addendum for KR/VN/JP/CN/ES + RU
3. Phase C: Expanded countries (US/GB/FR/DE/CA/AU/SG/BR/MX)
4. Phase D: Locale variant screenshots and terminology QA

## QA Checklist

- Language switch changes manual language labels
- Country switch changes country addendum
- Links in manual point to localized app routes
- Legal/tax statements are country-accurate
- Mobile and desktop screenshots match selected locale
