-- ─────────────────────────────────────────────────────────────────
-- Hospital images — Storage bucket + gallery column
--
-- Run this in Supabase Dashboard → SQL Editor once.
-- ─────────────────────────────────────────────────────────────────

-- 1. Gallery URL array column on hospitals.
alter table public.hospitals
  add column if not exists gallery_image_urls jsonb not null default '[]'::jsonb;

-- 2. Storage bucket — public read so the patient portal can render
--    images without signed URLs. Writes go through the server action
--    which uses the service-role key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hospital-images',
  'hospital-images',
  true,
  10485760, -- 10 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 3. RLS policies for the bucket.
--    Public read (anon + authenticated). Writes only via service role
--    (server actions). Authenticated users could write directly too,
--    but we route through the server action to keep the master gate
--    centralized.

drop policy if exists "hospital-images public read" on storage.objects;
create policy "hospital-images public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'hospital-images');

-- No insert/update/delete policy for non-service roles → service role
-- bypasses RLS and is the only path to write.
