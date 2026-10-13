-- 글로우업 채팅 3차: 자동 번역(원문 + 한국어/고객 언어 번역 저장) — 스키마: drizzle/schema/chat.ts, 번역: lib/chat/translate.ts
-- 적용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/chat-translate.sql
alter table public.chat_messages add column if not exists body_ko text;
alter table public.chat_messages add column if not exists body_lang text;
alter table public.chat_rooms add column if not exists last_message_preview_ko text;
