-- 지역 마스터를 여러 국가에 붙일 수 있게 한다.
--
-- 원래 region_admins 의 기본키가 email 하나여서 한 사람이 한 나라만
-- 맡을 수 있었다. 일본 마스터에게 영어권·중국어권·한국까지 맡기려면
-- (email, country_code) 쌍이 키여야 한다.
--
-- 기존 행(weaverpark01@gmail.com / JP)은 그대로 살아남는다.

alter table region_admins drop constraint if exists region_admins_pkey;
alter table region_admins add constraint region_admins_pkey primary key (email, country_code);
create index if not exists region_admins_email_idx on region_admins (email);
