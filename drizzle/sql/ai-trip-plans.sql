-- AI 여행 플래너 일정 (2026-09-07). 대화·최신 일정을 저장해 회원가입 뒤 이메일 발송으로 이어준다.
create table if not exists ai_trip_plans (
  id uuid primary key default gen_random_uuid(),
  locale text not null default 'kr',
  user_id uuid,
  email text,
  trip_type text,
  messages jsonb not null default '[]'::jsonb,
  plan_md text,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_trip_plans_user_idx on ai_trip_plans (user_id);
alter table ai_trip_plans enable row level security;
