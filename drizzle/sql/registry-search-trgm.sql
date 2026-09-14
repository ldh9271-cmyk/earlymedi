-- 통합 검색(글로우업 찾기)이 레지스트리 5종을 지역 단어(강남·명동 …)로도 찾도록
-- 시군구·도로명주소 컬럼에 trigram 인덱스를 건다. 이름 컬럼 인덱스는 이미 있다.
-- 없으면 뷰티샵 22만 행을 매번 순차 탐색해 검색이 4~6초 걸렸다.
create extension if not exists pg_trgm;
create index if not exists hospital_registry_sggu_trgm on hospital_registry using gin (sggu_name gin_trgm_ops);
create index if not exists lodging_registry_sggu_trgm  on lodging_registry  using gin (sggu_name gin_trgm_ops);
create index if not exists lodging_registry_addr_trgm  on lodging_registry  using gin (addr_road gin_trgm_ops);
create index if not exists food_registry_sggu_trgm     on food_registry     using gin (sggu_name gin_trgm_ops);
create index if not exists food_registry_addr_trgm     on food_registry     using gin (addr_road gin_trgm_ops);
create index if not exists beauty_registry_sggu_trgm   on beauty_registry   using gin (sggu_name gin_trgm_ops);
create index if not exists beauty_registry_addr_trgm   on beauty_registry   using gin (addr_road gin_trgm_ops);
create index if not exists tour_spots_keyword_trgm     on tour_spots        using gin (keyword gin_trgm_ops);
