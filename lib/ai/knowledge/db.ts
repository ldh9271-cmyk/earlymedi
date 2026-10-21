/**
 * AI 상담 지식 문서·청크 DB 접근 — drizzle 인스턴스를 인자로 받는 순수 함수들.
 * 앱 서버는 store.ts(서버 전용, 캐시) 를 통해, 스크립트(scripts/kb-seed-db.ts)는 자기 연결로 직접 쓴다.
 * ('server-only' 를 여기서 import 하지 않는 이유: tsx 스크립트·vitest 에서 그 모듈을 찾을 수 없다)
 */
import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '@/drizzle/schema';
import { aiKnowledgeChunks, aiKnowledgeDocs } from '@/drizzle/schema/ai-knowledge';
import { chunkMarkdown, mergeAliases, type AliasPair, type KbChunk, type KnowledgeSource } from './chunker';

export type KnowledgeDb = PostgresJsDatabase<typeof schema>;
export type KnowledgeDocStatus = 'active' | 'disabled';

export type KnowledgeDocRow = {
  id: string;
  slug: string;
  title: string;
  sourceFilename: string | null;
  status: string;
  chunkCount: number;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** 카테고리별 청크 수 */
  cats: Record<string, number>;
};

/** 파일명 → slug: 확장자 제거, 소문자, 글자·숫자·'.'·'-' 외는 '-' */
export function slugify(name: string): string {
  const base = name
    .replace(/\.(docx|md|markdown|txt)$/i, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return base.slice(0, 80) || 'doc';
}

async function uniqueSlug(db: KnowledgeDb, base: string): Promise<string> {
  const rows = await db
    .select({ slug: aiKnowledgeDocs.slug })
    .from(aiKnowledgeDocs)
    .where(sql`${aiKnowledgeDocs.slug} = ${base} or ${aiKnowledgeDocs.slug} like ${base + '-%'}`);
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const s = `${base}-${i}`;
    if (!taken.has(s)) return s;
  }
}

export async function listKnowledgeDocs(db: KnowledgeDb): Promise<KnowledgeDocRow[]> {
  const docs = await db
    .select({
      id: aiKnowledgeDocs.id,
      slug: aiKnowledgeDocs.slug,
      title: aiKnowledgeDocs.title,
      sourceFilename: aiKnowledgeDocs.sourceFilename,
      status: aiKnowledgeDocs.status,
      chunkCount: aiKnowledgeDocs.chunkCount,
      uploadedBy: aiKnowledgeDocs.uploadedBy,
      createdAt: aiKnowledgeDocs.createdAt,
      updatedAt: aiKnowledgeDocs.updatedAt,
    })
    .from(aiKnowledgeDocs)
    .orderBy(desc(aiKnowledgeDocs.createdAt));
  if (docs.length === 0) return [];
  const counts = await db
    .select({ docId: aiKnowledgeChunks.docId, cat: aiKnowledgeChunks.cat, n: sql<number>`count(*)::int` })
    .from(aiKnowledgeChunks)
    .groupBy(aiKnowledgeChunks.docId, aiKnowledgeChunks.cat);
  const byDoc = new Map<string, Record<string, number>>();
  for (const c of counts) {
    const m = byDoc.get(c.docId) ?? {};
    m[c.cat] = Number(c.n);
    byDoc.set(c.docId, m);
  }
  return docs.map((d) => ({ ...d, cats: byDoc.get(d.id) ?? {} }));
}

export async function getKnowledgeDoc(db: KnowledgeDb, id: string): Promise<typeof aiKnowledgeDocs.$inferSelect | null> {
  const [row] = await db.select().from(aiKnowledgeDocs).where(eq(aiKnowledgeDocs.id, id)).limit(1);
  return row ?? null;
}

export type InsertKnowledgeDocInput = {
  title: string;
  markdown: string;
  sourceFilename?: string | null;
  uploadedBy?: string | null;
  /** 생략하면 파일명(없으면 제목)에서 만든다. 겹치면 -2, -3 … */
  slug?: string;
};

/** 문서 + 청크 저장(트랜잭션). 청크 0개여도 저장은 하되 호출 쪽에서 미리 걸러 주는 편이 낫다. */
export async function insertKnowledgeDoc(
  db: KnowledgeDb,
  input: InsertKnowledgeDocInput,
): Promise<{ id: string; slug: string; chunkCount: number; cats: Record<string, number> }> {
  const slug = await uniqueSlug(db, slugify(input.slug ?? input.sourceFilename ?? input.title));
  const { chunks, aliases, cats } = chunkMarkdown(input.markdown, slug);
  const id = await db.transaction(async (tx) => {
    const [doc] = await tx
      .insert(aiKnowledgeDocs)
      .values({
        slug,
        title: input.title,
        sourceFilename: input.sourceFilename ?? null,
        markdown: input.markdown,
        status: 'active',
        aliases,
        chunkCount: chunks.length,
        uploadedBy: input.uploadedBy ?? null,
      })
      .returning({ id: aiKnowledgeDocs.id });
    if (!doc) throw new Error('ai_knowledge_docs insert failed');
    for (let i = 0; i < chunks.length; i += 200) {
      await tx.insert(aiKnowledgeChunks).values(
        chunks.slice(i, i + 200).map((c, j) => ({
          docId: doc.id,
          seq: i + j + 1,
          cat: c.cat,
          chapter: c.chapter,
          section: c.section,
          title: c.title,
          text: c.text,
          aliases: c.aliases,
        })),
      );
    }
    return doc.id;
  });
  return { id, slug, chunkCount: chunks.length, cats };
}

export async function setKnowledgeDocStatus(db: KnowledgeDb, id: string, status: KnowledgeDocStatus): Promise<boolean> {
  const rows = await db
    .update(aiKnowledgeDocs)
    .set({ status, updatedAt: new Date() })
    .where(eq(aiKnowledgeDocs.id, id))
    .returning({ id: aiKnowledgeDocs.id });
  return rows.length > 0;
}

/** 문서 삭제 — 청크는 FK cascade 로 함께 지워진다 */
export async function deleteKnowledgeDoc(db: KnowledgeDb, id: string): Promise<boolean> {
  const rows = await db.delete(aiKnowledgeDocs).where(eq(aiKnowledgeDocs.id, id)).returning({ id: aiKnowledgeDocs.id });
  return rows.length > 0;
}

type ChunkRow = {
  docId: string;
  seq: number;
  cat: string;
  chapter: string;
  section: string;
  title: string;
  text: string;
  aliases: string[];
};

/**
 * 활성 문서의 청크 행 → 검색 소스. 문서는 slug 순(내장 빌드의 파일명 순과 같게), 청크는 seq 순.
 * 순수 함수 — 테스트에서 DB 없이 DB 경로와 내장 경로의 동치를 확인한다.
 */
export function buildSource(docs: Array<{ id: string; slug: string; aliases: AliasPair[] }>, rows: ChunkRow[]): KnowledgeSource {
  const slugOf = new Map(docs.map((d) => [d.id, d.slug] as const));
  const byDoc = new Map<string, KbChunk[]>();
  for (const r of [...rows].sort((a, b) => a.seq - b.seq)) {
    const slug = slugOf.get(r.docId);
    if (!slug) continue;
    const list = byDoc.get(r.docId) ?? [];
    list.push({ id: `${slug}#${r.seq}`, cat: r.cat, chapter: r.chapter, section: r.section, title: r.title, text: r.text, aliases: r.aliases });
    byDoc.set(r.docId, list);
  }
  const chunks = docs.flatMap((d) => byDoc.get(d.id) ?? []);
  return { chunks, aliases: mergeAliases(docs.map((d) => d.aliases)) };
}

/** 활성 문서 전체의 청크 + 별칭 사전. 활성 문서가 없으면 null(→ 내장 폴백) */
export async function fetchActiveKnowledge(db: KnowledgeDb): Promise<KnowledgeSource | null> {
  const docs = await db
    .select({ id: aiKnowledgeDocs.id, slug: aiKnowledgeDocs.slug, aliases: aiKnowledgeDocs.aliases })
    .from(aiKnowledgeDocs)
    .where(eq(aiKnowledgeDocs.status, 'active'))
    .orderBy(asc(aiKnowledgeDocs.slug));
  if (docs.length === 0) return null;
  const rows = await db
    .select({
      docId: aiKnowledgeChunks.docId,
      seq: aiKnowledgeChunks.seq,
      cat: aiKnowledgeChunks.cat,
      chapter: aiKnowledgeChunks.chapter,
      section: aiKnowledgeChunks.section,
      title: aiKnowledgeChunks.title,
      text: aiKnowledgeChunks.text,
      aliases: aiKnowledgeChunks.aliases,
    })
    .from(aiKnowledgeChunks)
    .where(inArray(aiKnowledgeChunks.docId, docs.map((d) => d.id)))
    .orderBy(asc(aiKnowledgeChunks.seq));
  return buildSource(docs, rows);
}
