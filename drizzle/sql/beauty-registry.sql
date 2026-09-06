-- beauty_registry — 전국 미용업소 레지스트리 (행안부 생활_미용업)
-- 적용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/beauty-registry.sql
create extension if not exists pg_trgm;

create table if not exists public.beauty_registry (
  id                      uuid primary key default gen_random_uuid(),
  mgt_no                  text not null,
  name                    text not null,
  biz_type                text,
  sanitation_type         text,
  category_keys           text[] not null default '{}'::text[],
  status_code             text,
  status_name             text,
  detail_status_name      text,
  opened_date             text,
  closed_date             text,
  local_code              text,
  sido_name               text,
  sggu_name               text,
  addr_road               text,
  addr_lot                text,
  zip                     text,
  tel                     text,
  area_m2                 double precision,
  chairs                  integer not null default 0,
  beds                    integer not null default 0,
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

create unique index if not exists beauty_registry_mgt_no_unique on public.beauty_registry (mgt_no);
create index if not exists beauty_registry_region_idx on public.beauty_registry (sido_name, sggu_name);
create index if not exists beauty_registry_status_idx on public.beauty_registry (status_code);
create index if not exists beauty_registry_contracted_idx on public.beauty_registry (contracted_listing_id);
create index if not exists beauty_registry_geo_idx on public.beauty_registry (lat, lng);
create index if not exists beauty_registry_cat_gin on public.beauty_registry using gin (category_keys);
create index if not exists beauty_registry_name_trgm on public.beauty_registry using gin (name gin_trgm_ops);

alter table public.beauty_registry enable row level security;
