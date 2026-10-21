/**
 * AI 상담 지식 문서 첫 시드 (한 번만) — lib/ai/knowledge/docs/*.md 를 ai_knowledge_docs/ai_knowledge_chunks 에 넣는다.
 * 이미 같은 slug(파일명) 의 문서가 있으면 건너뛰므로 다시 돌려도 중복되지 않는다.
 *
 *   npx tsx scripts/kb-seed-db.ts            # DATABASE_URL 은 .env.local (운영 DB 직결 — 주의)
 *
 * 선행: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/ai-knowledge.sql
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../drizzle/schema';
import { guessDocTitle } from '../lib/ai/knowledge/docx';
import { insertKnowledgeDoc, listKnowledgeDocs } from '../lib/ai/knowledge/db';

/** docs 파일명 → 화면에 보일 제목 (없으면 머리말 첫 줄) */
const TITLES: Record<string, string> = {
  'medical-terms-guide.ko': '의료용어 · 급여/비급여 · 시술/수술 가이드',
  'kbeauty-terms-guide.ko': 'K뷰티 비의료 서비스 용어 가이드',
};

async function main(): Promise<void> {
  loadEnv({ path: '.env.local' });
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 이 없습니다 (.env.local)');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const DOCS = path.join(root, 'lib/ai/knowledge/docs');

  const client = postgres(url, { ssl: 'require', max: 1, prepare: false });
  const db = drizzle(client, { schema });
  try {
    const existing = new Set((await listKnowledgeDocs(db)).map((d) => d.slug));
    for (const file of readdirSync(DOCS).filter((f) => f.endsWith('.md')).sort()) {
      const slug = file.replace(/\.md$/, '');
      if (existing.has(slug)) {
        console.log(`skip (이미 있음): ${slug}`);
        continue;
      }
      const markdown = readFileSync(path.join(DOCS, file), 'utf8');
      const sourceFilename = (markdown.match(/<!--\s*출처:\s*([^\s(]+)/) ?? [])[1] ?? file;
      const r = await insertKnowledgeDoc(db, {
        slug,
        title: TITLES[slug] ?? guessDocTitle(markdown) ?? slug,
        sourceFilename,
        markdown,
        uploadedBy: 'seed:scripts/kb-seed-db.ts',
      });
      console.log(`seeded ${r.slug}: ${r.chunkCount} chunks`, r.cats);
    }
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error('[kb-seed-db] FAILED', err);
  process.exit(1);
});
