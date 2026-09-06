-- tour_spots 다국어 (한국관광공사 영문·일문·중문 TourAPI 매칭) 2026-09-07
alter table tour_spots add column if not exists i18n jsonb not null default '{}'::jsonb;
