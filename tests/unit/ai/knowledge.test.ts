/**
 * AI 상담 지식 베이스 — 청커 모듈 분리·DB 소스 전환 전후 동치 검증.
 *  1. lib/ai/knowledge/chunker.ts 가 docs/*.md 로 만든 청크·별칭 == 빌드 산출물 chunks.generated.ts
 *  2. 기준 질문 3개(+과 가중치)가 전환 전에 고르던 청크 id 를 그대로 고른다 (2026-10-21 커밋 2891cdce 기준)
 *  3. DB 행 형태(문서 slug + seq) 로 돌려 만든 소스(buildSource)도 같은 청크를 고른다
 *  4. (파일이 있을 때만) Word 원본 → docx.ts 변환 결과가 docs/*.md 와 같다
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { chunkMarkdown, mergeAliases, type AliasPair, type KbChunk } from '@/lib/ai/knowledge/chunker';
import { KB_ALIASES, KB_CHUNKS } from '@/lib/ai/knowledge/chunks.generated';
import { buildSource } from '@/lib/ai/knowledge/db';
import { docxToMarkdown } from '@/lib/ai/knowledge/docx';
import { BUILTIN_SOURCE, rankKnowledge, type KnowledgeSource } from '@/lib/ai/knowledge/retrieve';

const DOCS = path.resolve(process.cwd(), 'lib/ai/knowledge/docs');
const docFiles = readdirSync(DOCS).filter((f) => f.endsWith('.md')).sort();

function buildFromDocs(): { chunks: KbChunk[]; aliases: AliasPair[]; perDoc: Array<{ slug: string; chunks: KbChunk[]; aliases: AliasPair[] }> } {
  const perDoc = docFiles.map((f) => {
    const slug = f.replace(/\.md$/, '');
    const r = chunkMarkdown(readFileSync(path.join(DOCS, f), 'utf8'), slug);
    return { slug, chunks: r.chunks, aliases: r.aliases };
  });
  return { chunks: perDoc.flatMap((d) => d.chunks), aliases: mergeAliases(perDoc.map((d) => d.aliases)), perDoc };
}

/** 전환 전(retrieveKnowledge 동기 버전, 내장 청크)에 고르던 청크 id — 그대로 유지돼야 한다 */
const BASELINE: Array<{ q: string; cats: string[]; ids: string[] }> = [
  { q: '임플란트 보험 되나요', cats: ['dental'], ids: ['medical-terms-guide.ko#140', 'medical-terms-guide.ko#139', 'medical-terms-guide.ko#138', 'medical-terms-guide.ko#148', 'medical-terms-guide.ko#151', 'medical-terms-guide.ko#2', 'medical-terms-guide.ko#315', 'medical-terms-guide.ko#32'] },
  { q: '써마지랑 울쎄라 차이', cats: ['dermatology'], ids: ['medical-terms-guide.ko#33', 'medical-terms-guide.ko#34', 'medical-terms-guide.ko#83', 'medical-terms-guide.ko#32', 'medical-terms-guide.ko#11'] },
  { q: '二重の埋没法 何日滞在', cats: ['plastic_surgery'], ids: ['medical-terms-guide.ko#88', 'medical-terms-guide.ko#89'] },
  { q: '임플란트 보험 되나요', cats: [], ids: ['medical-terms-guide.ko#2', 'medical-terms-guide.ko#315', 'medical-terms-guide.ko#140', 'medical-terms-guide.ko#32', 'medical-terms-guide.ko#87', 'medical-terms-guide.ko#168', 'medical-terms-guide.ko#185', 'medical-terms-guide.ko#138'] },
  { q: '써마지랑 울쎄라 차이', cats: [], ids: ['medical-terms-guide.ko#33', 'medical-terms-guide.ko#34', 'medical-terms-guide.ko#11', 'medical-terms-guide.ko#83', 'medical-terms-guide.ko#32', 'medical-terms-guide.ko#10'] },
  { q: '二重の埋没法 何日滞在', cats: [], ids: ['medical-terms-guide.ko#88', 'medical-terms-guide.ko#89'] },
];

const idsOf = (q: string, cats: string[], source: KnowledgeSource): string[] => rankKnowledge(q, { cats }, source).hits.map((h) => h.chunk.id);

describe('knowledge chunker ↔ chunks.generated.ts', () => {
  it('docs/*.md 를 chunker.ts 로 쪼갠 결과가 빌드 산출물과 같다', () => {
    const built = buildFromDocs();
    expect(built.chunks.length).toBe(KB_CHUNKS.length);
    expect(built.chunks).toEqual(KB_CHUNKS);
    expect(built.aliases).toEqual(KB_ALIASES);
  });

  it('표 행·절 청크와 별칭이 의미 있게 나온다', () => {
    const built = buildFromDocs();
    expect(built.chunks.length).toBeGreaterThan(400);
    expect(built.aliases.length).toBeGreaterThan(500);
    const ulthera = built.chunks.find((c) => c.title === '울쎄라');
    expect(ulthera?.cat).toBe('dermatology');
    expect(ulthera?.aliases).toContain('ulthera');
    expect(built.chunks.some((c) => c.cat === 'nail')).toBe(true);
  });
});

describe('knowledge retrieval parity (builtin)', () => {
  for (const b of BASELINE) {
    it(`"${b.q}" [${b.cats.join(',') || '과 없음'}]`, () => {
      expect(idsOf(b.q, b.cats, BUILTIN_SOURCE)).toEqual(b.ids);
    });
  }
});

describe('knowledge retrieval parity (DB-shaped source)', () => {
  const built = buildFromDocs();
  // ai_knowledge_docs / ai_knowledge_chunks 행처럼 만들었다가 buildSource 로 되돌린다 (slug 순, seq 순)
  const docs = built.perDoc.map((d, i) => ({ id: `doc-${i}`, slug: d.slug, aliases: d.aliases }));
  const rows = built.perDoc.flatMap((d, i) =>
    d.chunks.map((c, j) => ({ docId: `doc-${i}`, seq: j + 1, cat: c.cat, chapter: c.chapter, section: c.section, title: c.title, text: c.text, aliases: c.aliases })),
  );
  const dbSource = buildSource(docs, [...rows].reverse()); // 행 순서가 뒤섞여도 seq 로 복원

  it('DB 행 → 소스 복원이 내장 청크와 같다', () => {
    expect(dbSource.chunks).toEqual(KB_CHUNKS);
    expect(dbSource.aliases).toEqual(KB_ALIASES);
  });

  for (const b of BASELINE) {
    it(`"${b.q}" [${b.cats.join(',') || '과 없음'}] — DB 소스`, () => {
      expect(idsOf(b.q, b.cats, dbSource)).toEqual(b.ids);
    });
  }

  it('문서를 비활성화(소스에서 제외)하면 그 문서의 청크가 빠진다', () => {
    const medicalIdx = built.perDoc.findIndex((d) => d.slug === 'medical-terms-guide.ko');
    const without = buildSource(docs.filter((_, i) => i !== medicalIdx), rows.filter((r) => r.docId !== `doc-${medicalIdx}`));
    expect(without.chunks.some((c) => c.id.startsWith('medical-terms-guide.ko#'))).toBe(false);
    expect(idsOf('임플란트 보험 되나요', ['dental'], without)).not.toContain('medical-terms-guide.ko#140');
  });
});

describe('docx → markdown (원본 Word 파일이 있을 때만)', () => {
  const samples: Array<[string, string]> = [
    ['GlowUpTour_의료용어_급여비급여_가이드.docx', 'medical-terms-guide.ko.md'],
    ['GlowUpTour_K뷰티_비의료_용어_가이드.docx', 'kbeauty-terms-guide.ko.md'],
  ];
  for (const [docx, md] of samples) {
    const src = path.join(os.homedir(), 'Downloads', docx);
    it.skipIf(!existsSync(src))(`${docx} → ${md} (첫 줄 출처 주석 제외)`, () => {
      const converted = docxToMarkdown(readFileSync(src), { sourceName: docx }).split('\n').slice(1).join('\n');
      const committed = readFileSync(path.join(DOCS, md), 'utf8').split('\n').slice(1).join('\n');
      expect(converted).toBe(committed);
    });
  }
});
