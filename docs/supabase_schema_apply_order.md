# Supabase 스키마 적용 순서 (테스트 환경)

작성일: 2026-04-17  
목적: 테스트 환경에서 스키마 누락 없이 빠르게 재현하기 위한 최소 적용 순서

## 적용 전 체크

- Supabase 프로젝트가 비어 있거나 테스트용인지 확인
- SQL Editor 실행 권한 확인
- 기존 테이블이 있으면 충돌 가능성 확인

## 권장 적용 순서

1. 기본 스키마 적용  
   - 파일: `supabase_schema.sql`
   - 설명: 핵심 테이블/정책의 기본 구조 생성

2. AI 메시징 확장 스키마 적용  
   - 파일: `supabase/ai_messaging_schema_update.sql`
   - 설명: 상담 채팅/AI 응대 관련 컬럼 및 구조 확장

3. 지원 FAQ 스키마 적용  
   - 파일: `supabase/support_faq_schema.sql`
   - 설명: 관리자 FAQ/지식 기반 지원용 테이블 및 정책

## 검증 쿼리 (간단)

```sql
-- 주요 테이블 존재 확인
select table_schema, table_name
from information_schema.tables
where table_schema in ('public')
  and table_name in (
    'profiles',
    'tenants',
    'orders',
    'chat_rooms',
    'chat_messages',
    'support_faq'
  )
order by table_name;
```

## 테스트 단계 운영 원칙

- 스키마 변경은 우선 작은 SQL 파일로 검증
- 적용 파일명/적용일을 테스트 로그에 남김
- 운영 전환 시에는 마이그레이션 체계로 통합 예정 (`TODO: PROD-HARDEN`)
