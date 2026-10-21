/**
 * 운영 DB 지식 문서 점검 — 문서 목록, 활성 청크 로드 시간, 내장(chunks.generated.ts)과의 동치, 질문별로 잡히는 청크.
 *
 *   npx tsx scripts/kb-check-db.ts ["질문" [cat,cat…]] …     # 인자 없으면 기준 질문 4개
 *   예) npx tsx scripts/kb-check-db.ts "임플란트 보험 되나요" dental "젤네일 얼마나 가요" nail
 */
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../drizzle/schema';
import { fetchActiveKnowledge, listKnowledgeDocs } from '../lib/ai/knowledge/db';
import { BUILTIN_SOURCE, rankKnowledge } from '../lib/ai/knowledge/retrieve';

const DEFAULT_QS: Array<[string, string[]]> = [
  ['임플란트 보험 되나요', ['dental']],
  ['써마지랑 울쎄라 차이', ['dermatology']],
  ['二重の埋没法 何日滞在', ['plastic_surgery']],
  ['젤네일 얼마나 가요', ['nail']],
];

async function main(): Promise<void> {
  loadEnv({ path: '.env.local' });
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 이 없습니다 (.env.local)');
  const args = process.argv.slice(2);
  const qs: Array<[string, string[]]> = [];
  for (let i = 0; i < args.length; i += 2) qs.push([args[i] ?? '', (args[i + 1] ?? '').split(',').filter(Boolean)]);
  const client = postgres(url, { ssl: 'require', max: 1, prepare: false });
  const db = drizzle(client, { schema });
  try {
    for (const d of await listKnowledgeDocs(db)) console.log(`doc: ${d.slug} [${d.status}] ${d.chunkCount}청크 — ${d.title} (${d.uploadedBy ?? ''})`);
    const t0 = Date.now();
    const src = await fetchActiveKnowledge(db);
    console.log(`fetchActiveKnowledge: ${Date.now() - t0}ms, chunks ${src?.chunks.length ?? 0}, aliases ${src?.aliases.length ?? 0}`);
    if (!src) { console.log('활성 문서 없음 → 상담은 내장 폴백'); return; }
    const same = JSON.stringify(src.chunks) === JSON.stringify(BUILTIN_SOURCE.chunks) && JSON.stringify(src.aliases) === JSON.stringify(BUILTIN_SOURCE.aliases);
    console.log('DB 소스 == 내장 청크:', same);
    for (const [q, cats] of qs.length ? qs : DEFAULT_QS) {
      const a = rankKnowledge(q, { cats }, src).hits;
      const b = rankKnowledge(q, { cats }, BUILTIN_SOURCE).hits.map((h) => h.chunk.id);
      console.log(`\n"${q}" [${cats.join(',')}] — 내장과 같음: ${JSON.stringify(a.map((h) => h.chunk.id)) === JSON.stringify(b)}`);
      for (const h of a) console.log(`  ${h.score.toFixed(1).padStart(5)}  ${h.chunk.id}  ${h.chunk.title}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => { console.error('[kb-check-db] FAILED', err); process.exit(1); });
