-- ─────────────────────────────────────────────────────────────────
-- hospital_registry — 전국 의료기관 레지스트리 (심평원 원천)
--
-- 이 프로젝트는 drizzle-kit push 를 쓰지 않으므로 한 번 직접 적용한다.
-- (scripts: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/hospital-registry.sql)
-- Drizzle 스키마: drizzle/schema/hospital-registry.ts
-- ─────────────────────────────────────────────────────────────────

create extension if not exists pg_trgm;

create table if not exists public.hospital_registry (
  id                        uuid primary key default gen_random_uuid(),
  ykiho                     text not null,
  name                      text not null,

  cl_cd                     text,
  cl_name                   text,
  sido_cd                   text,
  sido_name                 text,
  sggu_cd                   text,
  sggu_name                 text,
  emdong_name               text,
  post_no                   text,
  addr                      text,
  tel                       text,
  url                       text,
  estb_date                 text,

  dr_total                  integer not null default 0,
  dr_general                integer not null default 0,
  dr_specialist             integer not null default 0,
  dr_dental                 integer not null default 0,
  dr_oriental               integer not null default 0,

  lat                       double precision,
  lng                       double precision,

  foreign_licensed          boolean not null default false,
  foreign_licensed_source   text,
  foreign_licensed_at       timestamptz,

  contracted_hospital_id    uuid references public.hospitals(id) on delete set null,

  claim_org_id              uuid references public.organizations(id) on delete set null,
  claim_status              text not null default 'none',
  claimed_at                timestamptz,

  details                   jsonb not null default '{}'::jsonb,
  details_synced_at         timestamptz,
  source                    text not null default 'hira_api',
  synced_at                 timestamptz not null default now(),

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create unique index if not exists hospital_registry_ykiho_unique on public.hospital_registry (ykiho);
create index if not exists hospital_registry_region_idx on public.hospital_registry (sido_cd, sggu_cd);
create index if not exists hospital_registry_cl_idx on public.hospital_registry (cl_cd);
create index if not exists hospital_registry_name_idx on public.hospital_registry (name);
create index if not exists hospital_registry_name_trgm_idx on public.hospital_registry using gin (name gin_trgm_ops);
create index if not exists hospital_registry_addr_trgm_idx on public.hospital_registry using gin (addr gin_trgm_ops);
create index if not exists hospital_registry_contracted_idx on public.hospital_registry (contracted_hospital_id);
create index if not exists hospital_registry_foreign_idx on public.hospital_registry (foreign_licensed);

-- REST(anon) 노출 차단 — 앱은 postgres 롤(bypassrls)로 직접 읽는다.
alter table public.hospital_registry enable row level security;
