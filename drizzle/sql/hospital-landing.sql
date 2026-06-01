-- ─────────────────────────────────────────────────────────────────
-- Hospital landing image — long-form vertical promo image
--
-- A single tall image (typically a clinic's full-width promo poster)
-- rendered inside the "오늘의 추천 병원" section on the patient
-- detail page, just below the notes text.
--
-- Run this once in Supabase Dashboard → SQL Editor. Storage bucket
-- 'hospital-images' (created earlier) is reused.
-- ─────────────────────────────────────────────────────────────────

alter table public.hospitals
  add column if not exists landing_image_url text;
