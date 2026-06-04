# Floxync 통합 운영·고객 안내 매뉴얼

> **대상 독자:** 슈퍼관리자 · 본사 CS · 온보딩 담당 · 교육 매니저  
> **용도:** 매장(사장님)에게 기능을 **전화·화상·현장 교육**으로 설명할 때 쓰는 **본사 공식 매뉴얼**  
> **버전:** 2026-05-19  
> **앱 내 열람:** 대시보드 → 헤더 **[운영 매뉴얼]** 또는 `/dashboard/admin/manual/guide`

---

## 이 책을 어떻게 쓰나요?

| 상황 | 읽을 부분 |
|------|-----------|
| 신규 매장 1주 온보딩 | **제2부** 전체 + **제3부** 1~5장 |
| “매출 캘린더가 뭐예요?” | **제6부** + `revenue_engine_user_manual.md` |
| “솔라피는 누가 가입해요?” | **제4부 4-1** + **제5부** |
| “인스타 연결 어디서?” | **제6부 6-4** |
| 장애·문자 안 감 | **제7부** |
| 개발/운영 경계 | **제1부** + `platform_vs_tenant_configuration_guide.md` |

**말투 가이드:** 사장님께는 Postiz·Trigger.dev·n8n 같은 **내부 기술명을 말하지 않습니다.**  
→ “Instagram 계정 연결”, “자동 문자”, “SNS 초안”처럼 **업무 언어**로 설명하세요.

---

## 전체 목차

### 제1부 — 슈퍼관리자(본사)가 하는 일
1. [역할 한 줄 정리](#제1부-슈퍼관리자본사가-하는-일)
2. [플랫폼 vs 매장 설정 경계](#12-플랫폼-vs-매장-설정-경계)
3. [슈퍼 전용 메뉴 지도](#13-슈퍼-전용-메뉴-지도)

### 제2부 — 매장 온보딩 7일 스크립트
4. [Day 1~7 체크리스트](#제2부-매장-온보딩-7일-스크립트)

### 제3부 — 기능 백과 (사장님 설명용)
5. [기본 ERP: 주문·고객·재고](#제3부-기능-백과-사장님-설명용)
6. [리본 프린터·디자인 스튜디오](#32-리본-프린터디자인-스튜디오)
7. [환경설정·국가별 연동](#33-환경설정국가별-연동)

### 제4부 — 연동 가이드 모음
8. [한국: 솔라피·카카오 (매장)](#41-한국-솔라피카카오-매장-담당)
9. [베트남·일본·태국 (준비 중)](#42-글로벌-메신저-로드맵)
10. [POS·몰·배달](#43-pos몰배달)
11. [원본 문서 색인](#44-원본-문서-색인)

### 제5부 — 국가별 운영
12. [국가 코드 · 메신저 · 상태](#제5부-국가별-운영)

### 제6부 — 매출 엔진 (Floxync Revenue)
13. [5분 요약 · 화면 지도](#제6부-매출-엔진-floxync-revenue)
14. [기념일·구매 후·SNS·플래시](#62-기능별-사장님-설명-대본)
15. [플랜별 기능](#63-플랜별-기능)
16. [Instagram 연결 (사장님)](#64-instagram-연결-사장님-용)

### 제7부 — CS · 문제 해결
17. [자주 묻는 질문 · 답변 스크립트](#제7부-cs--문제-해결)

### 부록
18. [화면 경로 Quick Reference](#부록-a-화면-경로-quick-reference)
19. [관련 문서 전체 목록](#부록-b-관련-문서-전체-목록)

---

# 제1부 — 슈퍼관리자(본사)가 하는 일

## 1.1 역할 한 줄 정리

| 구분 | 본사(슈퍼) | 매장(사장님) |
|------|------------|--------------|
| **계정** | 테넌트 생성·플랜·정지 | 일상 주문·고객·설정 |
| **Solapi / Zalo / LINE** | 가이드 제공 · (향후) 발송 코드 | **직접 가입·채널·키 입력** |
| **Instagram 자동 게시** | Postiz VPS · Trigger · Meta 앱 | **Instagram 계정 연결** 버튼 |
| **매출 엔진 문구** | 템플릿 심사용 초안 제공(선택) | 메시지 템플릿 수정·저장 |
| **국가별 API 키** | `regional_key_*` 저장 (6개국 UI) | 운영 국가 선택 · 연동 카드 확인 |

**본사가 솔라피에 가입해 대신 쓰는 구조가 아닙니다.**

## 1.2 플랫폼 vs 매장 설정 경계

| 저장소 | 누가 | 예시 |
|--------|------|------|
| `platform_config` | 슈퍼 | Meta OAuth, Postiz URL, Trigger, `regional_key_*` |
| `system_settings` | 매장 | 상점 정보, 카카오 키(입력란), **운영 국가**, 배송비 |
| 환경변수 (Vercel/Trigger) | DevOps/슈퍼 | `SOLAPI_*`, `GEMINI_*`, `TRIGGER_*` |

상세: [platform_vs_tenant_configuration_guide.md](./platform_vs_tenant_configuration_guide.md)

## 1.3 슈퍼 전용 메뉴 지도

| 메뉴 | 경로 | 설명 |
|------|------|------|
| 테넌트·플랜 | `/dashboard/tenants`, `/dashboard/admin/tenants` | 매장 생성·구독 |
| 국가별 API 키 | `/dashboard/admin/regional-keys` | KR/JP/VN/ID/TH 키 저장 |
| API 키 발급 가이드 | `/dashboard/admin/regional-keys/guide` | 국가별 발급 절차 |
| **통합 운영 매뉴얼** | `/dashboard/admin/manual/guide` | **이 문서** |
| 연동 센터 · 매출엔진 | `/dashboard/marketing/admin` → 매출엔진 탭 | Postiz · Trigger · 발송 상한 |
| 매출 Overview | `/dashboard/admin/revenue` | 전 매장 Floxync 귀속 |
| 조직(HQ) | `/dashboard/admin/organizations` | 다지점 소속 |
| 번역·시드 | `/dashboard/admin/translations` 등 | 플랫폼 운영 |

---

# 제2부 — 매장 온보딩 7일 스크립트

교육 담당자가 매장에 **“이번 주 이렇게만 하시면 됩니다”**라고 말할 때 사용하세요.

| Day | 매장(사장님) 할 일 | 본사(CS) 할 일 |
|-----|-------------------|----------------|
| **1** | 로그인 · **환경설정** → 상점명·연락처·배송비 | 플랜·테넌트 확인 |
| **2** | **카테고리** (상품/자재/지출) · 상품 3개 등록 | 원격 30분 화면 공유 |
| **3** | **주문 1건** 입력 → 완료 처리 | 리본 프린터 필요 시 브릿지 안내 |
| **4** | **고객 3명** + **기념일 여러 건** + 마케팅 동의 | 매출 엔진 탭 미리보기 |
| **5** | **매출 캘린더** → Auto-Pilot ON · 메시지 템플릿 확인 | Solapi 연동 가이드 PDF/링크 전달 |
| **6** | (선택) Instagram 계정 연결 · SNS 초안 1건 복사 | Postiz 인프라 상태 확인 |
| **7** | 성과 리포트 · UTM 링크 주문 1건 테스트 | 파일럿 체크리스트 리뷰 |

체크리스트 원본: [revenue_engine_pilot_checklist.md](./revenue_engine_pilot_checklist.md), [SETUP_CHECKLIST_사장님_운영메모.md](./SETUP_CHECKLIST_사장님_운영메모.md)

---

# 제3부 — 기능 백과 (사장님 설명용)

## 3.1 기본 ERP

### 주문 관리
- **경로:** 대시보드 → **주문**
- **한 줄:** “전화·카톡·매장 주문을 한곳에 모아 리본·배송·정산까지 이어집니다.”
- **핵심 버튼:** [새 주문] · 상태 변경 · 메시지/리본 출력
- **상세 매뉴얼:** [User_Manual.md](./User_Manual.md) 5장

### 고객 관리
- **경로:** 대시보드 → **고객**
- **한 줄:** “단골 정보 + **기념일 여러 개** + 마케팅 동의를 여기서 관리합니다.”
- **매출 연동:** 기념일·동의 → 매출 캘린더 D-7 대상

### 매입·지출
- **경로:** 대시보드 → **매입 및 지출**
- **한 줄:** “꽃시장 사입·임대료를 넣으면 마진·세금 보조에 쓰입니다.”

## 3.2 리본 프린터·디자인 스튜디오

- **리본 프린터:** PC 브릿지(localhost:8002) 연결 후 원클릭 출력
- **디자인 스튜디오:** 주문 연동 카드·리본 문구 디자인 (PRO)
- **상세:** [User_Manual.md](./User_Manual.md) 2.2 · 5장

## 3.3 환경설정·국가별 연동

- **경로:** 대시보드 → **환경설정**
- **운영 국가:** 28개국 선택 → **국가별 연동** 카드가 바뀜
- **한국:** 카카오 알림톡(active), 카카오T, 네이버·카페24
- **베트남:** Zalo ZNS (준비 중) · **일본:** LINE (준비 중)
- **자동화 탭:** Solapi 키·카카오 채널 ID 입력 (매장 명의)

통합 세팅 가이드: [floxync_setup_guide_all.md](./floxync_setup_guide_all.md)  
설정 필드 설명: [Settings_Detailed_Manual.md](./Settings_Detailed_Manual.md)

---

# 제4부 — 연동 가이드 모음

## 4.1 한국: 솔라피·카카오 (매장 담당)

**사장님께 이렇게 말하세요:**  
“문자·알림은 **우리 꽃집 명의 솔라피**로 연결하시면 됩니다. Floxync는 **문구만** 대신 만들어 드리고, **발송 비용·채널은 매장 계정**입니다.”

### Step-by-step (매장용)

1. **[solapi.com](https://solapi.com)** 가입 (매장/대표 명의)
2. **API Key · Secret** 발급
3. **발신번호** 등록 및 인증 (미등록 시 발송 불가)
4. (선택) **카카오톡 채널** 개설 → 비즈니스 인증 → 솔라피에서 채널 연동
5. (알림톡 시) **템플릿 심사** — Floxync 설정의 자유 문구는 **문자(SMS)** 용; 알림톡은 **심사된 틀**만 가능
6. Floxync **환경설정 → 연동 및 자동화** 에 키 입력
7. **매출 캘린더 → 설정 → 메시지 템플릿** 수정 후 저장

**현재 코드 상태 (CS 참고):**  
- 매출 엔진 발송은 아직 **플랫폼 env `SOLAPI_*`** 또는 mock(log)  
- 매장 설정 키 → 매출 엔진 **연동 예정** (로드맵)

### 본사가 제공할 것
- 위 순서 **1페이지 PDF/카톡**  
- 기념일 D-7 / D+1·7·30 **알림톡 심사용 문구 초안** (요청 시)

## 4.2 글로벌 메신저 로드맵

| 국가 | 채널 | 매장 | 슈퍼 `regional_key` | 실발송 |
|------|------|------|---------------------|--------|
| KR | Solapi / 카카오 | 가입·연동 | kakao_alimtalk_* | SMS만(부분) |
| VN | Zalo ZNS | (예정) | zalo_zns_* | 미구현 |
| JP | LINE | (예정) | line_jp_* | 미구현 |
| TH | LINE | (예정) | line_th_* | 미구현 |
| ID | WhatsApp | (예정) | wa_id_* | 미구현 |

국가별 발급: [regional_api_key_issuance_guide.md](./regional_api_key_issuance_guide.md)

## 4.3 POS·몰·배달

| 연동 | 문서 |
|------|------|
| POS (이지체크·토스) | [pos_connection_guide.md](./pos_connection_guide.md) |
| 카페24 | [cafe24-integration-guide.md](./cafe24-integration-guide.md) |
| 카카오T 배달 | [hq_api_setup_manual.md](./hq_api_setup_manual.md) §3 |
| HQ 본사 API | [hq_api_setup_manual.md](./hq_api_setup_manual.md) |

## 4.4 원본 문서 색인

| 주제 | 파일 |
|------|------|
| 사장님 일반 사용법 | [User_Manual.md](./User_Manual.md) |
| HTML 통합 매뉴얼 (웹) | `/docs/manual` → `floxync-manual.html` |
| 할머니도 따라하기 | [grandma_guide_ultra_detailed.md](./grandma_guide_ultra_detailed.md) |
| 전체 세팅 | [floxync_setup_guide_all.md](./floxync_setup_guide_all.md) |
| 매출 엔진 | [revenue_engine_user_manual.md](./revenue_engine_user_manual.md) |
| 플랫폼 vs 매장 | [platform_vs_tenant_configuration_guide.md](./platform_vs_tenant_configuration_guide.md) |
| 국가 기능 매트릭스 | [country-feature-matrix.md](./country-feature-matrix.md) |

---

# 제5부 — 국가별 운영

## 5.1 운영 국가 선택

- **경로:** 환경설정 → **운영 국가**
- **효과:** 통화·세금 프리셋 · **국가별 연동** 카드 목록
- **28개국** UI / **6개국** 슈퍼 API 키 폼 (KR·JP·VN·ID·MY·TH)

## 5.2 CS 멘트 예시

**한국 매장:**  
“카카오 알림톡·솔라피는 **매장에서 직접** 연결하시고, Floxync는 **기념일 문자 문구**와 **자동 발송 스케줄**만 맡깁니다.”

**베트남 매장:**  
“Zalo 연동 카드는 보이지만 **아직 준비 중**입니다. 알림 신청을 남겨 주시면 오픈 시 연락드립니다.”

**일본 매장:**  
“LINE 연동도 **준비 중**입니다. 주문·고객 ERP는 지금 사용 가능합니다.”

---

# 제6부 — 매출 엔진 (Floxync Revenue)

## 6.1 5분 요약 · 화면 지도

**경로:** `/dashboard/revenue` (매출 캘린더)

| 탭 | 사장님에게 말할 한 줄 |
|----|----------------------|
| **기념일 D-7** | “7일 뒤 기념일 고객에게 **문자 + 주문 링크**” |
| **구매 후** | “배송 끝난 뒤 D+1·7·30 **감사·재구매** 문자” |
| **SNS 초안** | “완료 사진으로 **인스타·네이버 글** AI 초안 → 복사 또는 자동 게시” |
| **성과 리포트** | “Floxync 링크로 들어온 **매출 숫자**” |
| **설정** | “문구 톤·**메시지 템플릿 예시**” |

**Auto-Pilot 스위치:** 기념일 D-7 · 구매 후 · (PRO) SNS · (PRO) 재고 플래시

상세: [revenue_engine_user_manual.md](./revenue_engine_user_manual.md)

## 6.2 기능별 사장님 설명 대본

### 기념일 (여러 건 가능)
1. **고객** → 고객 추가/수정  
2. **기념일 여러 개:** 결혼기념일, 부모 생신, 창립기념일 등 **+ 추가**  
3. **마케팅·기념일 알림 수신 동의** 체크  
4. 매출 캘린더 → **기념일 D-7** 탭에서 7일 후 대상 확인  
5. Auto-Pilot **ON**

### 구매 후
- 주문 상태를 **완료/배송완료**로 바꾸면 Trigger가 D+1/7/30 예약  
- **설정 → 메시지 템플릿**에 예시 문구가 채워져 있음 (수정 가능)

### SNS
- 완료 주문 선택 → 콘텐츠 유형 → **[초안 생성]** → **[복사]**  
- PRO: Auto-Pilot · 승인 30분 전 모드

### 재고 플래시 (PRO)
- 재고 5개 이하 → 플래시 후보 · 승인 후 문구 복사 발송

## 6.3 플랜별 기능

| 플랜 | 기능 |
|------|------|
| Free | SNS 수동 초안 (월 5건 상한) |
| ERP SMART | 기념일 D-7 · 구매 후 · 귀속 리포트 |
| FLORA PRO | + SNS Auto-Pilot · 플래시 · A/B · 네이버 SEO |

## 6.4 Instagram 연결 (사장님용)

**절대 “Postiz”라고 말하지 않습니다.**

1. 매출 캘린더 → **SNS 초안** 탭  
2. **[Instagram 계정 연결]** → Facebook·Instagram 로그인  
3. 본인 꽃집 계정 선택·승인  
4. Floxync로 돌아오면 **연결됨** 확인  
5. (PRO) SNS Auto-Pilot ON  

**본사 전제:** 연동 센터에 Instagram 인프라 설정 완료.  
미설정 시: “Instagram 자동 게시 **준비 중** — 고객센터 문의”

---

# 제7부 — CS · 문제 해결

| 증상 | 원인 | CS 답변 |
|------|------|---------|
| 문자가 안 감 | Solapi 미설정 / mock | “Solapi 연동 후 테스트 발송. 지금은 **캠페인 기록만** 될 수 있습니다.” |
| 기념일 대상 0명 | 기념일·동의·연락처 없음 | “고객에 **기념일 + 마케팅 동의** 등록해 주세요.” |
| Instagram 미연결 | 인프라 또는 OAuth 미완 | “**Instagram 계정 연결** 다시 시도 → **연결 상태 다시 확인**” |
| SNS Auto-Pilot 안 됨 | PRO 아님 | “FLORA PRO 구독 필요” |
| 탭 글자 두 줄 | (수정됨) | 새로고침 |
| 알림톡 vs 문자 | 템플릿 미심사 | “지금 설정 문구는 **문자**용. 알림톡은 카카오 **템플릿 심사** 필요” |
| 베트남 Zalo | 미구현 | “준비 중 — 알림 신청” |

매출 엔진 FAQ: [revenue_engine_user_manual.md](./revenue_engine_user_manual.md) §12

---

# 부록 A — 화면 경로 Quick Reference

| 기능 | 경로 |
|------|------|
| 매출 캘린더 | `/dashboard/revenue` |
| 고객 | `/dashboard/customers` |
| 주문 | `/dashboard/orders` |
| 환경설정 | `/dashboard/settings` |
| 구독 | `/dashboard/subscription` |
| 연동 센터 | `/dashboard/marketing/admin` |
| 국가별 API 키 | `/dashboard/admin/regional-keys` |
| **통합 운영 매뉴얼** | `/dashboard/admin/manual/guide` |
| 사장님 HTML 매뉴얼 | `/docs/manual` |

---

# 부록 B — 관련 문서 전체 목록

### 사장님·교육용
- `User_Manual.md` — ERP 기본 사용법  
- `floxync-manual.html` + `/docs/manual` — HTML 통합본  
- `grandma_guide_ultra_detailed.md` — 초보자 상세  
- `floxync_setup_guide_all.md` — 연동 세팅 모음  
- `Settings_Detailed_Manual.md` — 설정 필드 설명  
- `SETUP_CHECKLIST_사장님_운영메모.md` — 운영 체크리스트  
- `revenue_engine_user_manual.md` — 매출 엔진 전용  

### 슈퍼·본사·개발용
- **`super_admin_operations_manual.md`** — **이 문서**  
- `platform_vs_tenant_configuration_guide.md` — 권한·저장소  
- `regional_api_key_issuance_guide.md` — 국가별 API  
- `hq_api_setup_manual.md` — HQ·카카오T·알림톡  
- `revenue_engine_master_plan.md` — 매출 엔진 설계  
- `revenue_engine_task_list.md` — 개발 태스크  
- `revenue_engine_pilot_checklist.md` — 파일럿  
- `country-feature-matrix.md` — 국가별 기능  
- `pos_connection_guide.md` · `cafe24-integration-guide.md`  

### 영상·스크립트
- `setup_video_full_script.md` · `video-guide-script.md` · `setup_video_script_grandma_version.md`

---

**문서 갱신:** 기능·화면 변경 시 **제6부·부록 A**를 먼저 수정하고, 세부는 원본 md에 반영한 뒤 이 색인을 업데이트하세요.
