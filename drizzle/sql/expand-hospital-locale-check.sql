-- 2026-07-24 — hospital_locale_content.locale CHECK 확장
-- 기존: kr/en/zh/ja 4개 → 앱이 지원하는 6개 로케일(ru, vi 추가)로 확장.
-- 기존 행에 영향 없는 additive 변경. (prod 에는 이미 적용 완료 —
-- 이 파일은 이력 보존 및 staging/타 환경용.)

ALTER TABLE hospital_locale_content
  DROP CONSTRAINT IF EXISTS hospital_locale_content_locale_check;

ALTER TABLE hospital_locale_content
  ADD CONSTRAINT hospital_locale_content_locale_check
  CHECK (locale = ANY (ARRAY['kr','en','zh','ja','ru','vi']));
