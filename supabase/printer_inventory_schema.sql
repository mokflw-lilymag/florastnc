-- 1. 본사 프린터 장비 자산 재고 테이블 생성
create table if not exists public.printer_inventory (
  id uuid default gen_random_uuid() primary key,
  device_type text not null check (device_type in ('pos', 'label')), -- pos: 포스프린터, label: 라벨프린터
  model_name text not null unique,                                  -- 기종명 (고유)
  total_stock integer not null default 0,                          -- 본사 보유 총대수
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 정책 설정 (최고 관리자 및 시스템 어드민만 접근 허용)
alter table public.printer_inventory enable row level security;

create policy "Super Admins can do everything on printer_inventory"
  on public.printer_inventory
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'super_admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'super_admin'
    )
  );

-- 기본 시드 데이터 삽입
insert into public.printer_inventory (device_type, model_name, total_stock)
values 
  ('pos', 'PP-8000', 50),
  ('pos', 'Xprint-250', 20),
  ('label', 'SEWOO-LK-B30', 30),
  ('label', 'Bixolon-SRP-770III', 15)
on conflict (model_name) do nothing;
