-- AI 시술/스타일 시뮬레이션 — 크레딧(포인트) 원장 + 실행 기록.
-- 사진·결과 이미지는 저장하지 않는다.
create table if not exists ai_sim_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  delta integer not null,
  reason text not null,
  order_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists ai_sim_credits_user_idx on ai_sim_credits (user_id);
create index if not exists ai_sim_credits_order_idx on ai_sim_credits (order_id);

create table if not exists ai_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  locale text not null default 'kr',
  preset text not null,
  status text not null,
  cost_points integer not null default 0,
  duration_ms integer,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_simulations_user_idx on ai_simulations (user_id);
