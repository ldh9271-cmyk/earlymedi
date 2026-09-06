-- 한국 공휴일 (공공데이터포털 특일정보 API 로 매일 동기화, 없으면 정적 목록) — 진료 중/종료 배지의 공휴일 보정용
create table if not exists kr_holidays (
  ymd text primary key,
  name text not null default '',
  source text not null default 'static',
  updated_at timestamptz not null default now()
);
