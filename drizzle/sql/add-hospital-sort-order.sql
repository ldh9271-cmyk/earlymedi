-- 2026-06-25 — hospitals.sort_order 컬럼 추가
-- /master/hospitals 통합 관리 페이지의 노출 순서 제어용.
-- partner_listings.sort_order 와 동일한 컨벤션 — 낮을수록 먼저 노출.
-- 기본값 100, NOT NULL. 기존 행은 자동으로 100 으로 채워짐.

ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 100;

-- (선택) 정렬 인덱스 — 200건 미만 데이터는 굳이 필요 없지만 향후
-- 확장 대비. 등록일 보조 정렬까지 함께.
CREATE INDEX IF NOT EXISTS hospitals_sort_idx
  ON hospitals (sort_order ASC, created_at DESC);
