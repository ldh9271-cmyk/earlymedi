-- AI 여행 일정 확정 → 플랫폼 도움 요청 → 견적(인보이스) → 결제 완료 흐름 (2026-09-07)
alter table ai_trip_plans add column if not exists status text not null default 'draft';
alter table ai_trip_plans add column if not exists order_id uuid;
alter table ai_trip_plans add column if not exists quote_won integer;
alter table ai_trip_plans add column if not exists quote_note text;
alter table ai_trip_plans add column if not exists verified_plan_md text;
alter table ai_trip_plans add column if not exists contact jsonb;
alter table ai_trip_plans add column if not exists start_ymd text;
alter table ai_trip_plans add column if not exists confirmed_at timestamptz;
alter table ai_trip_plans add column if not exists help_requested_at timestamptz;
alter table ai_trip_plans add column if not exists quoted_at timestamptz;
alter table ai_trip_plans add column if not exists paid_at timestamptz;
create index if not exists ai_trip_plans_status_idx on ai_trip_plans (status, updated_at);
