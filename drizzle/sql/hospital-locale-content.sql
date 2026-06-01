-- ─────────────────────────────────────────────────────────────────────
-- hospital_locale_content
-- Per-locale (kr/en/zh/ja) content overrides for a hospital so that
-- /[locale]/clinics/[slug] can serve language-specific copy + images
-- (better SEO, country-appropriate imagery). Master fills via the
-- 4-tab UI on /master/hospitals/[id]/edit.
-- See drizzle/schema/hospital-locale-content.ts for usage notes.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists hospital_locale_content (
  id              uuid primary key default gen_random_uuid(),
  hospital_id     uuid not null references hospitals(id) on delete cascade,
  locale          text not null check (locale in ('kr','en','zh','ja')),
  name            text,
  intro           text,
  cover_image_url text,
  gallery_image_urls jsonb not null default '[]'::jsonb,
  landing_image_url  text,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists hospital_locale_content_hospital_locale_unique
  on hospital_locale_content (hospital_id, locale);

-- updated_at auto-bump trigger
create or replace function update_hospital_locale_content_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_hospital_locale_content_updated_at
  on hospital_locale_content;
create trigger trg_hospital_locale_content_updated_at
  before update on hospital_locale_content
  for each row execute function update_hospital_locale_content_updated_at();

-- RLS — patient-facing pages need anonymous read, writes go through
-- service-role (master console) only.
alter table hospital_locale_content enable row level security;

drop policy if exists "hospital_locale_content_public_read"
  on hospital_locale_content;
create policy "hospital_locale_content_public_read"
  on hospital_locale_content
  for select
  using (true);

-- No write policies → only service_role bypasses RLS, so the master
-- console (which uses createSupabaseServiceClient) can write while
-- public anonymous clients cannot.
