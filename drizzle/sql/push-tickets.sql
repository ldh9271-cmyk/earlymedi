-- 앱 푸시 발송 티켓 (2026-10-13). drizzle/schema/push-tickets.ts 와 동일.
-- 적용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/push-tickets.sql
-- Expo 'ok' 티켓을 적어 두고 크론(/api/cron/push-receipts)이 영수증을 조회해 DeviceNotRegistered 토큰을 정리한다.
create table if not exists push_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null unique,
  token text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_tickets_created_idx on push_tickets (created_at);
-- 서버 직결 역할만 접근: RLS 켜고(정책 없음 = 전부 거부) 공개 REST 권한 회수
alter table push_tickets enable row level security;
revoke all on table push_tickets from anon, authenticated;
