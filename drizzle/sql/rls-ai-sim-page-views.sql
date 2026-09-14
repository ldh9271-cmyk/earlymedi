-- 보안 점검(2026-09-14)에서 발견: 최근 raw SQL 로 만든 4개 테이블에 RLS 가 꺼져 있었고,
-- Supabase 기본 권한 때문에 공개 anon 키로 REST 에서 읽고 쓸 수 있었다
-- (ai_sim_credits 에 포인트를 마음대로 넣을 수 있는 상태). 앱은 service role /
-- 직결 커넥션으로만 접근하므로 RLS 를 켜고(정책 없음 = 전부 거부) anon/authenticated
-- 권한도 거둔다. 나머지 71개 테이블은 이미 RLS 가 켜져 있다.
alter table ai_sim_credits  enable row level security;
alter table ai_simulations  enable row level security;
alter table page_views      enable row level security;
alter table kr_holidays     enable row level security;
revoke all on table ai_sim_credits, ai_simulations, page_views, kr_holidays from anon, authenticated;
