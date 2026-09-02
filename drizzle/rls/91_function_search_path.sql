-- ─────────────────────────────────────────────────────────
-- 함수 search_path 고정 — Security Advisor 경고 해소
--
-- search_path 미고정 함수는 호출자가 조작한 스키마 경로로 같은 이름의
-- 악성 객체를 먼저 참조하게 만들 수 있다 (search path hijack). 본문이
-- 전부 스키마 한정 참조(public.*, auth.*)라 빈 경로로 고정해도 안전.
-- 새 함수를 만들 때도 반드시 SET search_path = '' 를 붙일 것.
-- 적용: 2026-09-01 (운영 DB 반영 완료)
-- ─────────────────────────────────────────────────────────

ALTER FUNCTION public.current_actor_id() SET search_path = '';
ALTER FUNCTION public.current_org_id() SET search_path = '';
ALTER FUNCTION public.has_cross_org_visibility(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.is_active_member(uuid) SET search_path = '';
ALTER FUNCTION public.update_hospital_locale_content_updated_at() SET search_path = '';
