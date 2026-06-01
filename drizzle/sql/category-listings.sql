-- ─────────────────────────────────────────────────────────────────
-- category_listings table — master-curated B2C catalog mappings
--
-- Run this in Supabase Dashboard → SQL Editor once. Drizzle schema
-- already declares the table; this is the one-time apply step since
-- drizzle-kit push is bypassed in this project (see CLAUDE/MEMORY).
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.category_listings (
  id              uuid primary key default gen_random_uuid(),

  category_key    text not null,
  procedure_slug  text,

  hospital_id     uuid not null references public.hospitals(id) on delete cascade,

  sort_order      integer not null default 100,

  promo_label     text,
  promo_label_en  text,
  promo_label_zh  text,
  promo_label_ja  text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- A hospital can only appear once per (category, procedure) slot.
-- COALESCE makes NULL procedure_slug behave as ''.
create unique index if not exists category_listings_unique
  on public.category_listings (category_key, coalesce(procedure_slug, ''), hospital_id);

create index if not exists category_listings_category_idx
  on public.category_listings (category_key, sort_order);

create index if not exists category_listings_procedure_idx
  on public.category_listings (procedure_slug, sort_order);

-- ─────────────────────────────────────────────────────────────────
-- Row-level security
--
-- Master-curated public catalog: readable to everyone (anon role for
-- the patient portal), writable only by master operators (enforced in
-- the server action layer + service-role connections).
-- ─────────────────────────────────────────────────────────────────

alter table public.category_listings enable row level security;

drop policy if exists "category_listings public read" on public.category_listings;
create policy "category_listings public read"
  on public.category_listings
  for select
  to anon, authenticated
  using (true);

-- Writes go through the server action with isMasterEmail() gate; no
-- corresponding insert/update/delete policy for non-service roles.
-- Service role bypasses RLS regardless.
