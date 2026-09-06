-- hospital_registry.dept_codes — 심평원 진료과목 코드(dgsbjtCd) 배열. 과별 카테고리 필터용.
-- 적용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/hospital-registry-depts.sql
alter table public.hospital_registry
  add column if not exists dept_codes text[] not null default '{}'::text[],
  add column if not exists depts_synced_at timestamptz;

create index if not exists hospital_registry_dept_codes_gin on public.hospital_registry using gin (dept_codes);
