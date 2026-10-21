-- AI 상담 지식 문서·청크 (2026-10-21). drizzle/schema/ai-knowledge.ts 와 동일.
-- 적용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/ai-knowledge.sql
-- 첫 시드(한 번만): npx tsx scripts/kb-seed-db.ts  → lib/ai/knowledge/docs/*.md 를 문서로 넣는다 (이미 있는 slug 는 건너뜀)
create extension if not exists pg_trgm;

create table if not exists ai_knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  source_filename text,
  markdown text not null,
  status text not null default 'active',
  aliases jsonb not null default '[]'::jsonb,
  chunk_count integer not null default 0,
  uploaded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_knowledge_docs_status_check check (status in ('active', 'disabled'))
);
create index if not exists ai_knowledge_docs_status_idx on ai_knowledge_docs (status, slug);

create table if not exists ai_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references ai_knowledge_docs (id) on delete cascade,
  seq integer not null,
  cat text not null,
  chapter text not null default '',
  section text not null default '',
  title text not null,
  text text not null,
  aliases jsonb not null default '[]'::jsonb,
  -- 검색용(앞으로 DB 측 검색을 붙일 때). 지금 검색은 활성 청크 전체를 메모리에서 점수 매긴다.
  search tsvector generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(text, ''))) stored,
  unique (doc_id, seq)
);
create index if not exists ai_knowledge_chunks_doc_idx on ai_knowledge_chunks (doc_id, seq);
create index if not exists ai_knowledge_chunks_search_idx on ai_knowledge_chunks using gin (search);
create index if not exists ai_knowledge_chunks_title_trgm_idx on ai_knowledge_chunks using gin (title gin_trgm_ops);
create index if not exists ai_knowledge_chunks_text_trgm_idx on ai_knowledge_chunks using gin (text gin_trgm_ops);

-- 서버 직결 역할만 접근: RLS 켜고(정책 없음 = 전부 거부) 공개 REST 권한 회수
alter table ai_knowledge_docs enable row level security;
alter table ai_knowledge_chunks enable row level security;
revoke all on table ai_knowledge_docs from anon, authenticated;
revoke all on table ai_knowledge_chunks from anon, authenticated;
