-- 앱 푸시 토큰 (2026-10-13). drizzle/schema/push-tokens.ts 와 동일.
-- 적용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/push-tokens.sql
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null unique,
  platform text not null default 'android',
  app_version text,
  locale text,
  chat_enabled boolean not null default true,
  booking_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on push_tokens (user_id);
-- 서버 직결 역할만 접근: RLS 켜고(정책 없음 = 전부 거부) 공개 REST 권한 회수
alter table push_tokens enable row level security;
revoke all on table push_tokens from anon, authenticated;
