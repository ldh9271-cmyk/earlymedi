-- 회원가입 시 생일(월/일) 수집을 위한 컬럼 추가
-- 한국 컨벤션에 따라 출생연도(birth_year)와 별도로 월/일만 저장.
-- Kakao 채널 개인정보 동의항목 "선택 수집"으로 등록할 수 있도록 정렬.
-- Run in Supabase SQL Editor.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS birth_month integer,
  ADD COLUMN IF NOT EXISTS birth_day integer;

-- 값 범위 가드 (입력 폼이 1차 검증하지만 DB-level 안전망)
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_birth_month_range,
  ADD CONSTRAINT users_birth_month_range CHECK (birth_month IS NULL OR (birth_month BETWEEN 1 AND 12));

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_birth_day_range,
  ADD CONSTRAINT users_birth_day_range CHECK (birth_day IS NULL OR (birth_day BETWEEN 1 AND 31));
