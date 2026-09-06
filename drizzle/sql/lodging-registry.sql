-- lodging_registry — 전국 숙박업소 레지스트리 (행안부 문화_숙박업)
-- 적용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/lodging-registry.sql
create table if not exists public.lodging_registry (
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
  rooms_ko                integer not null default 0,
  rooms_we                integer not null default 0,
  floors                  integer not null default 0,
  area_m2                 double precision,
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
create unique index if not exists lodging_registry_mgt_no_unique on public.lodging_registry (mgt_no);
create index if not exists lodging_registry_region_idx on public.lodging_registry (sido_name, sggu_name);
create index if not exists lodging_registry_status_idx on public.lodging_registry (status_code);
create index if not exists lodging_registry_contracted_idx on public.lodging_registry (contracted_listing_id);
create index if not exists lodging_registry_geo_idx on public.lodging_registry (lat, lng);
create index if not exists lodging_registry_cat_gin on public.lodging_registry using gin (category_keys);
create index if not exists lodging_registry_name_trgm on public.lodging_registry using gin (name gin_trgm_ops);
alter table public.lodging_registry enable row level security;
