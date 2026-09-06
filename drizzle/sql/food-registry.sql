-- food_registry — 전국 일반음식점 레지스트리 (행안부 식품_일반음식점)
-- 적용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/food-registry.sql
create table if not exists public.food_registry (
  id                      uuid primary key default gen_random_uuid(),
  mgt_no                  text not null,
  name                    text not null,
  biz_type                text,
  sanitation_type         text,
  category_keys           text[] not null default '{}'::text[],
  status_code             text,
  status_name             text,
  opened_date             text,
  closed_date             text,
  local_code              text,
  sido_name               text,
  sggu_name               text,
  addr_road               text,
  addr_lot                text,
  zip                     text,
  tel                     text,
  lat                     double precision,
  lng                     double precision,
  contracted_listing_id   uuid references public.partner_listings(id) on delete set null,
  claim_org_id            uuid references public.organizations(id) on delete set null,
  claim_status            text not null default 'none',
  claimed_at              timestamptz,
  details                 jsonb not null default '{}'::jsonb,
  last_modified_at        timestamptz,
  synced_at               timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create unique index if not exists food_registry_mgt_no_unique on public.food_registry (mgt_no);
create index if not exists food_registry_region_idx on public.food_registry (sido_name, sggu_name);
create index if not exists food_registry_status_idx on public.food_registry (status_code);
create index if not exists food_registry_contracted_idx on public.food_registry (contracted_listing_id);
create index if not exists food_registry_geo_idx on public.food_registry (lat, lng);
create index if not exists food_registry_cat_gin on public.food_registry using gin (category_keys);
create index if not exists food_registry_name_trgm on public.food_registry using gin (name gin_trgm_ops);
alter table public.food_registry enable row level security;
