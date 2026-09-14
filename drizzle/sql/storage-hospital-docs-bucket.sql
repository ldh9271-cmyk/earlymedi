-- 병원 자체 등록의 서류(사업자등록증·유치기관등록증) 업로드 대상 버킷이 실제로는 없었다
-- (코드의 DOC_BUCKET='hospital-docs'). 비공개 버킷으로 만든다 — 읽기는 service role 만.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hospital-docs', 'hospital-docs', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
