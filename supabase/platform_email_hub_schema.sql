-- FloXync 슈퍼관리자: 플랫폼 이메일 템플릿 · 발송 로그
-- API는 service_role(super_admin 검증 후)만 사용

create table if not exists public.platform_email_templates (
  slug text primary key,
  category text not null,
  name_ko text not null,
  name_en text,
  description text,
  subject text not null,
  body_html text not null,
  variables text[] not null default '{}',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists platform_email_templates_category_idx
  on public.platform_email_templates (category, sort_order);

comment on table public.platform_email_templates is '슈퍼관리자 운영 메일 템플릿 (계약·임대·마케팅 등)';

create table if not exists public.platform_email_send_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  template_slug text references public.platform_email_templates(slug) on delete set null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  status text not null check (status in ('sent', 'simulated', 'failed')),
  error_message text,
  sent_by uuid references auth.users(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  metadata jsonb not null default '{}'
);

create index if not exists platform_email_send_log_created_idx
  on public.platform_email_send_log (created_at desc);

comment on table public.platform_email_send_log is '슈퍼관리자 수동·일괄 메일 발송 이력';

alter table public.platform_email_templates enable row level security;
alter table public.platform_email_send_log enable row level security;

-- anon/authenticated 직접 접근 없음 — API service_role

-- 베타 신청 운영 필드
alter table public.test_user_applications
  add column if not exists selection_status text not null default 'pending';

alter table public.test_user_applications
  add column if not exists printer_loan_interest boolean not null default false;

alter table public.test_user_applications
  add column if not exists admin_notes text;

comment on column public.test_user_applications.selection_status is 'pending | shortlisted | selected | rejected | contracted | shipped';
