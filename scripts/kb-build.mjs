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

/**
 * 장 제목 → 카테고리 키 (route.ts HOSPITAL_CATS·LISTING_CATS 의 키와 같은 이름). 문서마다 장 번호가 다르므로 제목 단어로 정한다.
 * 특수 키: toc(목차)·appendix(부록)·glossary(대조표→별칭 사전)·rules(상담 원칙)·intro(문서 안내: 문단 제외, 표는 포함)·common.
 */
const CHAPTER_RULES = [
  [/^목차/, 'toc'], [/^부록/, 'appendix'], [/대조표|glossary/i, 'glossary'],
  [/상담 원칙|필수 원칙|법규|금지 표현/, 'rules'],
  [/사용 목적|사용 안내|읽는 법|문서의 범위/, 'intro'],
  [/공통 기초|공통되는|기초 용어/, 'common'],
  // 의료 (의료용어·급여비급여 가이드)
  [/피부과|dermatolog/i, 'dermatology'], [/성형외과|plastic surgery/i, 'plastic_surgery'], [/치과|dentist/i, 'dental'],
  [/안과|ophthalm/i, 'ophthalmology'], [/정형외과|orthoped/i, 'orthopedics'], [/척추|통증의학|신경외과|재활의학/, 'spine'],
  [/내과|건강검진|영상의학|health screening/i, 'health_checkup'], [/산부인과|gynecolog/i, 'obgyn'], [/비뇨/, 'urology'],
  [/이비인후과|\bENT\b/, 'ent'], [/정신건강|기타 진료과/, 'other'], [/한의|korean medicine/i, 'oriental'], [/모발이식|탈모|hair transplant/i, 'hair'],
  // 비의료 뷰티 (K뷰티 비의료 용어 가이드)
  // (순서 주의: '반영구 화장 (Permanent Makeup)' 은 메이크업보다 먼저, '두피 · 헤드스파' 는 에스테틱(스파)보다 먼저)
  [/퍼스널컬러|personal color/i, 'personal_color'], [/헤어 ?살롱|hair salon/i, 'hair'], [/반영구|\bPMU\b|permanent makeup/i, 'pmu'],
  [/메이크업|makeup/i, 'makeup'], [/네일|\bnail/i, 'nail'], [/속눈썹|왁싱|\blash\b|waxing/i, 'lash_brow'], [/두피|헤드스파|scalp/i, 'scalp'],
  [/에스테틱|스파|피부관리실|esthetic/i, 'esthetic'], [/포토 ?스튜디오|photo studio/i, 'photo_studio'], [/k-?pop/i, 'kpop_tour'], [/패키지|숙박|운영 용어/, 'travel_package'],
];
const catForChapter = (title) => (CHAPTER_RULES.find(([re]) => re.test(title)) ?? [null, 'other'])[1];
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
    // 문서 안내 장의 "문서 구성/다루는 장" 표(사이트 카테고리 개요)는 상담 근거가 아니다 — 업체 수·가격대는 DATA 에서만
    if (chapterKey === 'intro' && header.some((h) => /다루는 장|문서 구성/.test(h))) return;
    if (header[0] === '화자') return; // 대화 예시 표(고객/AI) — 원칙은 KB_RULES 에, 예시는 넣지 않는다
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
        const key = catForChapter(title);
        chapterKey = !num && key === 'other' ? 'intro' : key; // 번호 없는 머리말은 안내로 본다
        chapterTitle = title; chapterCat = chapterKey === 'intro' ? 'common' : chapterKey; section = '';
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
