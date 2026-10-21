import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * AI 상담 지식 문서 (2026-10-21) — 마스터 콘솔(/master/ai-knowledge)에서 Word(.docx)·마크다운을 올리면
 * 서버가 변환·청킹해 저장하고, /api/ai/chat 이 활성 문서의 청크를 60초 캐시(변경 시 즉시 무효화)로 읽어
 * 시스템 프롬프트의 KNOWLEDGE 블록 근거로 쓴다. 문서가 없거나 DB 가 실패하면 빌드에 내장된
 * lib/ai/knowledge/chunks.generated.ts 로 폴백한다. SQL: drizzle/sql/ai-knowledge.sql (RLS: 서비스 롤만).
 */
export const aiKnowledgeDocs = pgTable(
  'ai_knowledge_docs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 파일명에서 만든 고유 키 — 청크 id 는 `${slug}#${seq}` (내장 청크의 `파일명#순번` 과 같은 꼴) */
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    sourceFilename: text('source_filename'),
    /** 변환된 원문(마크다운). 재청킹·열람용 */
    markdown: text('markdown').notNull(),
    /** active | disabled */
    status: text('status').notNull().default('active'),
    /** 이 문서에서 나온 외국어 별칭 사전 [[alias, [한국어 용어…]], …] (chunker.ts) */
    aliases: jsonb('aliases').$type<Array<[string, string[]]>>().notNull().default(sql`'[]'::jsonb`),
    chunkCount: integer('chunk_count').notNull().default(0),
    /** 올린 마스터 이메일 (시드는 'seed:…') */
    uploadedBy: text('uploaded_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ statusIdx: index('ai_knowledge_docs_status_idx').on(t.status, t.slug) }),
);

/**
 * 문서의 검색 단위(표 행·절). 검색용 tsvector(`search`, generated) 와 trigram 인덱스는 SQL 에만 있다 —
 * 지금 검색(retrieve.ts)은 활성 청크 전체를 캐시로 읽어 메모리에서 점수를 매기므로 drizzle 이 이 컬럼을 알 필요가 없다.
 */
export const aiKnowledgeChunks = pgTable(
  'ai_knowledge_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    docId: uuid('doc_id')
      .notNull()
      .references(() => aiKnowledgeDocs.id, { onDelete: 'cascade' }),
    /** 문서 안 순번(1부터) — 청크 id 의 뒷자리 */
    seq: integer('seq').notNull(),
    /** 장 카테고리 (chunker.ts CHAPTER_RULES: dermatology, dental, nail, …) */
    cat: text('cat').notNull(),
    chapter: text('chapter').notNull().default(''),
    section: text('section').notNull().default(''),
    title: text('title').notNull(),
    text: text('text').notNull(),
    /** 제목의 별칭(괄호 안 라틴 표기 등) */
    aliases: jsonb('aliases').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  },
  (t) => ({ docIdx: index('ai_knowledge_chunks_doc_idx').on(t.docId, t.seq) }),
);
