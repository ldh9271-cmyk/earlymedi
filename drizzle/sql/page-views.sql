-- 공개 포털 방문 기록 (마스터 통계 리포트 원천). drizzle/schema/page-views.ts 와 동일.
create table if not exists page_views (
  id bigserial primary key,
  ts timestamptz not null default now(),
  path text not null,
  locale text,
  country text,
  referrer_host text,
  device text,
  session_id text,
  is_entry boolean not null default false
);
create index if not exists page_views_ts_idx on page_views (ts);
create index if not exists page_views_path_idx on page_views (path, ts);
create index if not exists page_views_country_idx on page_views (country, ts);
