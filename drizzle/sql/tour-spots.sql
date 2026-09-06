-- tour_spots — 전국 관광지(관광사진) 레지스트리 (한국관광공사 포토코리아)
-- 적용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/tour-spots.sql
create table if not exists public.tour_spots (
  id             uuid primary key default gen_random_uuid(),
  content_id     text not null,
  title          text not null,
  image_url      text,
  thumb_url      text,
  location       text,
  sido_name      text,
  sggu_name      text,
  keyword        text,
  category_keys  text[] not null default '{}'::text[],
  photographer   text,
  photo_month    text,
  lat            double precision,
  lng            double precision,
  created_time   text,
  modified_time  text,
  synced_at      timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists tour_spots_content_id_unique on public.tour_spots (content_id);
create index if not exists tour_spots_region_idx on public.tour_spots (sido_name, sggu_name);
create index if not exists tour_spots_geo_idx on public.tour_spots (lat, lng);
create index if not exists tour_spots_cat_gin on public.tour_spots using gin (category_keys);
create index if not exists tour_spots_name_trgm on public.tour_spots using gin (title gin_trgm_ops);
alter table public.tour_spots enable row level security;
