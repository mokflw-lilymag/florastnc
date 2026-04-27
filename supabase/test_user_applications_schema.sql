-- Floxync 랜딩: 테스트 유저 신청 저장
-- Supabase SQL Editor에서 한 번 실행하거나 마이그레이션 파이프라인에 포함하세요.
-- API는 SUPABASE_SERVICE_ROLE_KEY로만 INSERT 합니다 (RLS는 anon 차단용).

create table if not exists public.test_user_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  business_name text not null,
  contact text not null,
  email text not null,
  apply_reason text not null,
  participation_use boolean not null default false,
  participation_questions boolean not null default false,
  participation_feedback boolean not null default false,
  participation_features boolean not null default false,
  feature_notes text,
  source text not null default 'landing'
);

comment on table public.test_user_applications is '랜딩 페이지 테스트 유저(베타) 신청';

create index if not exists test_user_applications_created_at_idx
  on public.test_user_applications (created_at desc);

alter table public.test_user_applications enable row level security;

-- anon/authenticated 직접 접근 없음 — 서비스 롤(API 라우트)만 사용

-- 기존 테이블이 이미 있는 환경을 위한 보정
alter table public.test_user_applications
  add column if not exists apply_reason text;
