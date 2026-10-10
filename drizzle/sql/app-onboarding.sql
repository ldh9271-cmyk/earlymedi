-- app_onboarding — 안드로이드 앱 첫 실행 설문(언어·관심 분야·방문 예정 시기·연령대). 스키마: drizzle/schema/app-onboarding.ts
-- 적용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/app-onboarding.sql
create table if not exists public.app_onboarding (
  id           bigserial primary key,
  ts           timestamptz not null default now(),
  device_id    text,
  app_version  text,
  platform     text not null default 'android',
  locale       text,
  device_lang  text,
  interests    text[] not null default '{}'::text[],
  visit        text,
  skipped      boolean not null default false,
  country      text
);
create index if not exists app_onboarding_ts_idx on public.app_onboarding (ts);
create index if not exists app_onboarding_device_idx on public.app_onboarding (device_id);
-- 공개 REST 차단 (drizzle/rls/90_lockdown.sql 원칙: RLS enable + 무정책). 앱 서버는 직결이라 영향 없음.
alter table public.app_onboarding enable row level security;
-- 2026-10-11 연령대 질문 추가 (앱 1.1.1): 20s | 30s | 40s | 50s | 60plus. 같은 명령으로 다시 적용하면 된다.
alter table public.app_onboarding add column if not exists age text;
