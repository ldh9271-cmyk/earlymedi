-- ─────────────────────────────────────────────────────────
-- 공개 REST(PostgREST) 잠금 — RLS 미적용 테이블 전면 차단
--
-- Supabase 는 public 스키마를 anon 키로 REST 공개한다. 아래 테이블은
-- RLS 가 꺼져 있어 누구나 읽기/쓰기가 가능했다 (Security Advisor
-- 2026-08-31 지적, 2026-09-01 실측 확인 후 즉시 적용).
--
-- 정책은 만들지 않는다 — RLS enable + 무정책 = anon/authenticated 전면
-- 거부. 앱은 rolbypassrls 역할(DATABASE_URL 직결)로 접근하므로 영향
-- 없다. 새 테이블을 만들 때는 반드시 ENABLE ROW LEVEL SECURITY 를
-- 함께 적용할 것.
-- ─────────────────────────────────────────────────────────

ALTER TABLE public.case_quotes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_ledger      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_topups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_unlocks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attributions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_partners      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.region_admins          ENABLE ROW LEVEL SECURITY;
