#!/usr/bin/env node
/**
 * AI 상담 지식 베이스 빌드 — lib/ai/knowledge/docs/*.md 를 검색 단위(청크)로 쪼개
 * lib/ai/knowledge/chunks.generated.ts 를 만든다. /api/ai/chat 가 질문마다 관련 청크를 골라
 * 시스템 프롬프트의 KNOWLEDGE 블록에 넣는다(lib/ai/knowledge/retrieve.ts).
 *
 *   node scripts/kb-build.mjs
 *
 * 문서 규칙(의료용어·급여비급여 가이드 기준):
 *   - `# N. 장 제목` → 장(진료과). 번호 → 카테고리(CHAPTER_CAT) 로 질문의 과와 맞춰 가중치.
 *   - `## N.M 소제목`, `### 소제목` → 절.
 *   - 표의 각 행 → 청크 1개 (제목 = 첫 칸, 본문 = "머리글: 값 | …").
 *   - 표 밖 문단 → 절 단위로 묶어 청크 1개.
 *   - 16장 '다국어 핵심 용어 대조표' 표는 청크 대신 별칭 사전(KB_ALIASES)이 된다 — 영어·중국어·일본어 질문을 한국어 용어로.
 *   - 제목의 괄호 안 라틴 표기(예: 울쎄라 (Ulthera / Ultherapy))도 그 청크의 별칭.
 *   - '목차'·'부록'(대화 예시)은 넣지 않는다. 15.1 금지 표현은 retrieve.ts 의 KB_RULES 에 요약돼 있다.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(root, 'lib/ai/knowledge/docs');
const OUT = path.join(root, 'lib/ai/knowledge/chunks.generated.ts');

/** 장 번호 → 카테고리 키 (route.ts HOSPITAL_CATS 의 cat 과 같은 이름을 쓴다). */
const CHAPTER_CAT = {
  0: 'common', 1: 'common', 2: 'dermatology', 3: 'plastic_surgery', 4: 'dental', 5: 'ophthalmology',
  6: 'orthopedics', 7: 'spine', 8: 'health_checkup', 9: 'obgyn', 10: 'urology', 11: 'ent', 12: 'other',
  13: 'oriental', 14: 'hair', 15: 'rules', 16: 'glossary',
};
const SKIP_CHAPTERS = new Set(['toc', 'appendix', 'glossary']);

const clean = (s) => s.replace(/\s+/g, ' ').trim();
const stripParen = (s) => clean(s.replace(/[\(（][^)）]*[\)）]/g, ''));
const splitAlt = (s) => s.split(/\s*\/\s*|\s*·\s*|\s*、\s*/).map(clean).filter(Boolean);
const hasLatin = (s) => /[A-Za-z]/.test(s);
/** 괄호 밖의 '/' 로만 나눈다: "二重(埋没/切開) / 眼瞼下垂手術" → ["二重(埋没/切開)", "眼瞼下垂手術"] */
function splitTop(s) {
  const out = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '（') depth++;
    if (ch === ')' || ch === '）') depth = Math.max(0, depth - 1);
    if (ch === '/' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(clean).filter(Boolean);
}
const innerParts = (s) => (s.match(/[\(（]([^)）]+)[\)）]/g) ?? []).flatMap((g) => splitAlt(g.slice(1, -1)));

function parseTableRow(line) {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(clean);
}

/** 제목 "울쎄라 (Ulthera / Ultherapy)" → base '울쎄라', aliases ['ulthera','ultherapy'] */
function titleAliases(title) {
  const aliases = new Set();
  const m = title.match(/[\(（]([^)）]+)[\)）]/g) ?? [];
  for (const g of m) for (const part of splitAlt(g.slice(1, -1))) if (part.length >= 3) aliases.add(part.toLowerCase());
  for (const part of splitAlt(stripParen(title))) if (part.length >= 2) aliases.add(part.toLowerCase());
  return [...aliases];
}

const chunks = [];
const aliasMap = new Map(); // alias(lower) → Set<koTerm>
const addAlias = (alias, ko) => {
  const a = alias.toLowerCase().trim();
  if (a.length < 2 || !ko) return;
  if (!aliasMap.has(a)) aliasMap.set(a, new Set());
  aliasMap.get(a).add(ko);
};

for (const file of readdirSync(DOCS).filter((f) => f.endsWith('.md')).sort()) {
  const doc = file.replace(/\.md$/, '');
  const lines = readFileSync(path.join(DOCS, file), 'utf8').split('\n');
  let chapterKey = 'intro', chapterTitle = '', chapterCat = 'common', section = '';
  let para = [];
  let table = null; // { header, rows }
  let n = 0;
  const flushPara = () => {
    const text = clean(para.join(' '));
    para = [];
    // 제목 앞 머리말과 0장(문서 목적) 문단은 뺀다 — 0장의 표(급여 표기 기준)는 flushTable 에서 들어간다
    if (!text || !chapterTitle || chapterKey === 'intro' || SKIP_CHAPTERS.has(chapterKey)) return;
    chunks.push({ id: `${doc}#${++n}`, cat: chapterCat, chapter: chapterTitle, section, title: section || chapterTitle, text, aliases: [] });
  };
  const flushTable = () => {
    if (!table) return;
    const { header, rows } = table;
    table = null;
    if (chapterKey === 'glossary') {
      // 한국어 | English | 中文 | 日本語 — 칸마다 ' / ' 로 여러 용어
      for (const r of rows) {
        const koTerms = splitTop(r[0] ?? '');
        const ko = koTerms.map(stripParen).filter(Boolean);
        for (const col of r.slice(1)) {
          const terms = splitTop(col);
          terms.forEach((t, i) => {
            const target = ko[i] ?? ko[0];
            addAlias(stripParen(t), target);
            // 괄호 안 세부 표기는 한국어 쪽 괄호 안과 짝 (二重(埋没/切開) ↔ 쌍꺼풀 (매몰/절개)), 짝이 없으면 기본 용어로
            const koInner = innerParts(koTerms[i] ?? '');
            innerParts(t).forEach((inner, j) => addAlias(inner, koInner[j] ? `${target} ${koInner[j]}` : target));
            if (ko.length !== terms.length) for (const k of ko) addAlias(stripParen(t), k);
          });
        }
      }
      return;
    }
    if (SKIP_CHAPTERS.has(chapterKey)) return;
    for (const r of rows) {
      const title = r[0] ?? '';
      if (!title) continue;
      const body = r.slice(1).map((c, i) => (c ? `${header[i + 1] ?? ''}: ${c}` : '')).filter(Boolean).join(' | ');
      const aliases = titleAliases(title);
      chunks.push({ id: `${doc}#${++n}`, cat: chapterCat, chapter: chapterTitle, section, title: stripParen(title) || title, text: body, aliases });
      // 라틴 별칭 → 한국어 제목 (영어 질문이 한국어 청크를 찾게)
      const base = stripParen(title).split(/\s*\/\s*/)[0];
      for (const a of aliases) if (hasLatin(a)) addAlias(a, base);
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (/^\s*<!--/.test(line)) continue;
    if (line.startsWith('|')) {
      flushPara();
      const cells = parseTableRow(line);
      if (cells.every((c) => /^-{3,}$/.test(c))) continue; // 구분선
      if (!table) table = { header: cells, rows: [] };
      else table.rows.push(cells);
      continue;
    }
    if (table) flushTable();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushPara();
      const level = h[1].length, title = clean(h[2]);
      if (level === 1) {
        const num = title.match(/^(\d{1,2})\./);
        const no = num ? Number(num[1]) : null;
        chapterKey = /^목차/.test(title) ? 'toc' : /^부록/.test(title) ? 'appendix' : no === 0 || no === null ? 'intro' : (CHAPTER_CAT[no] ?? 'other');
        chapterTitle = title; chapterCat = no === null ? 'common' : (CHAPTER_CAT[no] ?? 'other'); section = '';
      } else {
        section = title;
      }
      continue;
    }
    if (!clean(line)) { flushPara(); continue; }
    para.push(line);
  }
  if (table) flushTable();
  flushPara();
}

const aliases = [...aliasMap.entries()]
  .map(([a, s]) => [a, [...s]])
  .filter(([a]) => a.length >= 2)
  .sort((x, y) => y[0].length - x[0].length);

const header = `/* eslint-disable */
// 자동 생성 — 편집 금지. 원본: lib/ai/knowledge/docs/*.md, 생성: node scripts/kb-build.mjs (${new Date().toISOString().slice(0, 10)})
export type KbChunk = { id: string; cat: string; chapter: string; section: string; title: string; text: string; aliases: string[] };
`;
writeFileSync(OUT, `${header}export const KB_CHUNKS: KbChunk[] = ${JSON.stringify(chunks)};\n/** 외국어·라틴 표기 → 한국어 용어 (긴 별칭부터) */\nexport const KB_ALIASES: Array<[string, string[]]> = ${JSON.stringify(aliases)};\n`);
const byCat = chunks.reduce((m, c) => ((m[c.cat] = (m[c.cat] ?? 0) + 1), m), {});
console.log(`chunks ${chunks.length} (${Object.entries(byCat).map(([k, v]) => `${k}:${v}`).join(' ')}) aliases ${aliases.length} → ${path.relative(root, OUT)} (${(readFileSync(OUT).length / 1024).toFixed(0)} KB)`);
