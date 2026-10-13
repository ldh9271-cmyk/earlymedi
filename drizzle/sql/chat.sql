-- 글로우업 채팅(소비자·사업자·플랫폼 3자) — 스키마: drizzle/schema/chat.ts
-- 적용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/chat.sql
create table if not exists public.chat_rooms (
  id                   uuid primary key default gen_random_uuid(),
  kind                 text not null default 'support',
  order_id             uuid,
  user_id              uuid not null,
  user_email           text,
  user_name            text,
  org_id               uuid,
  org_name             text,
  title                text not null,
  locale               text not null default 'kr',
  status               text not null default 'open',
  last_message_at      timestamptz,
  last_message_preview text,
  last_sender_role     text,
  consumer_unread      integer not null default 0,
  business_unread      integer not null default 0,
  platform_unread      integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists chat_rooms_order_uq on public.chat_rooms (order_id);
create index if not exists chat_rooms_user_idx on public.chat_rooms (user_id, last_message_at);
create index if not exists chat_rooms_org_idx on public.chat_rooms (org_id, last_message_at);
create index if not exists chat_rooms_last_idx on public.chat_rooms (last_message_at);

create table if not exists public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.chat_rooms(id) on delete cascade,
  sender_role     text not null,
  sender_user_id  uuid,
  sender_name     text,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists chat_messages_room_idx on public.chat_messages (room_id, created_at);

-- 공개 REST 차단 (drizzle/rls/90_lockdown.sql 원칙: RLS enable + 무정책)
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
