-- 0003_user_demographics.sql
-- Adds demographic columns to users for signup-time collection.
-- gender / age_range are free-text columns (validated in app code) rather
-- than enums, so we don't have to ALTER TYPE later if categories grow.
-- All three are nullable — the signup form leaves them optional.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS birth_year integer,
  ADD COLUMN IF NOT EXISTS age_range text;
