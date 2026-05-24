-- 0001_trial_quota.sql
-- Adds the free-trial usage counter to billing_accounts.
-- Run in Supabase SQL Editor after the initial 0000 migration.

ALTER TABLE billing_accounts
  ADD COLUMN IF NOT EXISTS trial_uses_limit integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS trial_uses_count integer NOT NULL DEFAULT 0;

-- Existing trial-status rows (if any) should keep their counter at 0;
-- existing 'active' rows are paid and the counter is moot for them.
-- No backfill needed beyond the column default.
