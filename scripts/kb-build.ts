/**
 * AI 상담 지식 베이스 내장 빌드 — lib/ai/knowledge/docs/*.md 를 청크로 쪼개 chunks.generated.ts 를 만든다.
 * 이 파일은 DB(ai_knowledge_docs) 에 활성 문서가 없거나 DB 를 못 읽을 때의 **폴백**이다 —
 * 운영 지식은 마스터 콘솔(/master/ai-knowledge) 업로드가 우선이고 재배포 없이 바로 반영된다.
 *
 *   npx tsx scripts/kb-build.ts
 *
 * 청킹 규칙은 lib/ai/knowledge/chunker.ts (업로드 API 와 같은 코드). 문서 구조가 다르면 거기의 CHAPTER_RULES 를 맞춘다.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chunkMarkdown, mergeAliases, type AliasPair, type KbChunk } from '../lib/ai/knowledge/chunker';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(root, 'lib/ai/knowledge/docs');
const OUT = path.join(root, 'lib/ai/knowledge/chunks.generated.ts');

const chunks: KbChunk[] = [];
const aliasLists: AliasPair[][] = [];
for (const file of readdirSync(DOCS).filter((f) => f.endsWith('.md')).sort()) {
  const r = chunkMarkdown(readFileSync(path.join(DOCS, file), 'utf8'), file.replace(/\.md$/, ''));
  chunks.push(...r.chunks);
  aliasLists.push(r.aliases);
}
const aliases = mergeAliases(aliasLists);

const header = `/* eslint-disable */
// 자동 생성 — 편집 금지. 원본: lib/ai/knowledge/docs/*.md, 생성: npx tsx scripts/kb-build.ts (${new Date().toISOString().slice(0, 10)})
// DB(ai_knowledge_docs) 에 활성 문서가 없거나 DB 를 못 읽을 때의 폴백 — 운영 지식은 /master/ai-knowledge 업로드가 우선.
import type { KbChunk } from './chunker';
export type { KbChunk } from './chunker';
`;
writeFileSync(
  OUT,
  `${header}export const KB_CHUNKS: KbChunk[] = ${JSON.stringify(chunks)};\n/** 외국어·라틴 표기 → 한국어 용어 (긴 별칭부터) */\nexport const KB_ALIASES: Array<[string, string[]]> = ${JSON.stringify(aliases)};\n`,
);
const byCat = chunks.reduce<Record<string, number>>((m, c) => ((m[c.cat] = (m[c.cat] ?? 0) + 1), m), {});
console.log(
  `chunks ${chunks.length} (${Object.entries(byCat).map(([k, v]) => `${k}:${v}`).join(' ')}) aliases ${aliases.length} → ${path.relative(root, OUT)} (${(readFileSync(OUT).length / 1024).toFixed(0)} KB)`,
);
