-- 글로우업 채팅 2차: 상품(listing)별 방 + 마스터 지정 상담 관리자 — 스키마: drizzle/schema/chat.ts
-- 적용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/chat-operators.sql
alter table public.chat_rooms add column if not exists listing_slug text;
create unique index if not exists chat_rooms_listing_uq on public.chat_rooms (user_id, listing_slug) where listing_slug is not null;

create table if not exists public.chat_operators (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text,
  active      integer not null default 1,
  created_by  text,
  created_at  timestamptz not null default now()
);
create unique index if not exists chat_operators_email_uq on public.chat_operators (email);
alter table public.chat_operators enable row level security;
