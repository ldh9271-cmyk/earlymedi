-- partner_listings + partner_listing_locale_content
--
-- Run this once in the Supabase SQL Editor (or via psql) to set up the
-- non-medical marketplace inventory tables. Mirrors the hospitals /
-- hospital_locale_content pair, but unified across hotel / restaurant /
-- 맛집 / 퍼스널컬러 / 헤어 / 메이크업 / 사진 / K-팝 투어 via a single
-- `category` text column and a JSONB `details` blob for per-category
-- extras.
--
-- Re-runnable: every CREATE uses IF NOT EXISTS. ALTER TABLE adds are
-- wrapped in DO blocks that no-op if the column already exists.

create table if not exists partner_listings (
  id                    uuid primary key default gen_random_uuid(),
  owner_org_id          uuid not null references organizations(id) on delete cascade,
  category              text not null,
  status                text not null default 'draft',
  slug                  text not null,
  title                 text not null,
  location_label        text,
  address_json          jsonb not null default '{}'::jsonb,
  price_won             integer,
  price_unit            text,
  cover_image_url       text,
  gallery_image_urls    jsonb not null default '[]'::jsonb,
  promo_label           text,
  featured              boolean not null default false,
  sort_order            integer not null default 100,
  rating                integer,
  reviews_count         integer not null default 0,
  description           text,
  interest_key          text,
  details               jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists partner_listings_owner_cat_slug_unique
  on partner_listings (owner_org_id, category, slug);

create index if not exists partner_listings_status_idx
  on partner_listings (status, category, sort_order);

create index if not exists partner_listings_featured_idx
  on partner_listings (featured, category, sort_order);

-- Per-locale content overrides
create table if not exists partner_listing_locale_content (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null references partner_listings(id) on delete cascade,
  locale              text not null,
  title               text,
  description         text,
  location_label      text,
  cover_image_url     text,
  gallery_image_urls  jsonb not null default '[]'::jsonb,
  seo_title           text,
  seo_description     text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists partner_listing_locale_content_unique
  on partner_listing_locale_content (listing_id, locale);

-- Light RLS: public reads of approved rows, owner-only writes. Master
-- bypasses via the service-role connection so these policies don't
-- need to know about master at all.
alter table partner_listings enable row level security;
alter table partner_listing_locale_content enable row level security;

drop policy if exists "approved listings readable by all" on partner_listings;
create policy "approved listings readable by all"
  on partner_listings for select
  using (status = 'approved');

drop policy if exists "approved listing locale readable" on partner_listing_locale_content;
create policy "approved listing locale readable"
  on partner_listing_locale_content for select
  using (
    exists (
      select 1 from partner_listings p
      where p.id = partner_listing_locale_content.listing_id
        and p.status = 'approved'
    )
  );

-- Supabase Storage bucket for listing images.
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists "listing images public read" on storage.objects;
create policy "listing images public read"
  on storage.objects for select
  using (bucket_id = 'listing-images');

drop policy if exists "listing images service write" on storage.objects;
create policy "listing images service write"
  on storage.objects for all
  using (bucket_id = 'listing-images' and auth.role() = 'service_role')
  with check (bucket_id = 'listing-images' and auth.role() = 'service_role');
