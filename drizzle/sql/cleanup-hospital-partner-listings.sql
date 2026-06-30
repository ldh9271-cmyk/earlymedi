-- 2026-06-25 — partner_listings 에서 중복 hospital 행 cleanup
--
-- 정책: 병원 데이터는 hospitals 테이블이 단일 진실원.
-- partner_listings 의 category='hospital' 행은 seedPlasticSurgeryAction
-- 가 과거에 만들어둔 중복 (글로우업 상품관리 표면에 노출하기 위한 것)
-- 이었으나 2026-06-25 정책 변경으로 더 이상 만들지 않으며 기존 행도 제거.
--
-- 영향:
--   - /agency/listings: UI 필터로 이미 가려져 있음 (이 SQL 없이도 안전)
--   - /kr/clinics: hospitals + category_listings 만 읽으므로 무관
--   - /listings/{slug}: 해당 hospital 슬러그로 직접 진입한 URL 은 404
--     → 정상 경로는 /clinics/{slug} (hospitals 테이블 기반)
--
-- 자동화: 직접 Supabase SQL Editor 에서 실행.

DELETE FROM partner_listings
 WHERE category = 'hospital';
