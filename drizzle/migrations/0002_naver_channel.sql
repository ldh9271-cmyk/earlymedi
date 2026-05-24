-- 0002_naver_channel.sql
-- Adds 'naver' (Naver Talk Talk) to the channel_kind enum.
-- Postgres requires ALTER TYPE … ADD VALUE in a non-transaction context.
-- Supabase SQL Editor runs each ; statement separately so this is fine.

ALTER TYPE channel_kind ADD VALUE IF NOT EXISTS 'naver';
