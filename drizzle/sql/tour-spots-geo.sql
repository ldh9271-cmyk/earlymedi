-- tour_spots: 카카오 키워드 검색으로 찾은 실좌표 표시 (2026-09-07)
alter table tour_spots add column if not exists geo_source text;
alter table tour_spots add column if not exists geo_matched text;
create index if not exists tour_spots_geo_source_idx on tour_spots (geo_source);
