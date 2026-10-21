/**
 * AI 상담 지식 문서(마크다운) → 검색 청크 + 외국어 별칭 사전.
 *
 * 파일·DB 를 모르는 순수 함수라, 빌드 스크립트(scripts/kb-build.ts → chunks.generated.ts, 내장 폴백)와
 * 마스터 콘솔 업로드 API(서버에서 docx→마크다운→청킹 → ai_knowledge_chunks)가 같은 코드를 쓴다.
 *
 * 문서 규칙:
 *   - `# 장 제목` → 장. 제목의 단어로 카테고리(CHAPTER_RULES)를 정하고, 질문의 과·업종과 같으면 검색 가중치.
 *   - `## 소제목`, `### 소제목` → 절.
 *   - 표의 각 행 → 청크 1개 (제목 = 첫 칸, 본문 = "머리글: 값 | …").
 *   - 표 밖 문단 → 절 단위로 묶어 청크 1개.
 *   - '대조표' 장의 표는 청크 대신 별칭 사전이 된다 — 영어·중국어·일본어 질문을 한국어 용어로.
 *   - 제목의 괄호 안 라틴 표기(예: 울쎄라 (Ulthera / Ultherapy))도 그 청크의 별칭.
 *   - '목차'·'부록'·'화자/내용' 대화 예시 표, '사용 안내' 장의 문단과 '문서 구성/다루는 장' 표는 넣지 않는다.
 */

export type KbChunk = {
  id: string;
  cat: string;
  chapter: string;
  section: string;
  title: string;
  text: string;
  aliases: string[];
};

/** 별칭(소문자) → 한국어 용어들 */
export type AliasPair = [string, string[]];

/** 검색이 보는 전체 지식: 청크 + 별칭 사전. DB(활성 문서) 또는 내장(chunks.generated.ts) */
export type KnowledgeSource = { chunks: KbChunk[]; aliases: AliasPair[] };

export type ChunkResult = {
  chunks: KbChunk[];
  /** 이 문서에서 나온 별칭 사전 (등장 순서, 정렬 전). 여러 문서는 mergeAliases 로 합친다 */
  aliases: AliasPair[];
  /** 카테고리별 청크 수 */
  cats: Record<string, number>;
};

/**
 * 장 제목 → 카테고리 키 (route.ts HOSPITAL_CATS·LISTING_CATS 의 키와 같은 이름). 문서마다 장 번호가 다르므로 제목 단어로 정한다.
 * 특수 키: toc(목차)·appendix(부록)·glossary(대조표→별칭 사전)·rules(상담 원칙)·intro(문서 안내: 문단 제외, 표는 포함)·common.
 */
export const CHAPTER_RULES: Array<[RegExp, string]> = [
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

const OTHER: [RegExp, string] = [/$^/, 'other'];
export const catForChapter = (title: string): string => (CHAPTER_RULES.find(([re]) => re.test(title)) ?? OTHER)[1];

const SKIP_CHAPTERS = new Set(['toc', 'appendix', 'glossary']);

const clean = (s: string): string => s.replace(/\s+/g, ' ').trim();
const stripParen = (s: string): string => clean(s.replace(/[\(（][^)）]*[\)）]/g, ''));
const splitAlt = (s: string): string[] => s.split(/\s*\/\s*|\s*·\s*|\s*、\s*/).map(clean).filter(Boolean);
const hasLatin = (s: string): boolean => /[A-Za-z]/.test(s);

/** 괄호 밖의 '/' 로만 나눈다: "二重(埋没/切開) / 眼瞼下垂手術" → ["二重(埋没/切開)", "眼瞼下垂手術"] */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '（') depth++;
    if (ch === ')' || ch === '）') depth = Math.max(0, depth - 1);
    if (ch === '/' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(clean).filter(Boolean);
}

const innerParts = (s: string): string[] => (s.match(/[\(（]([^)）]+)[\)）]/g) ?? []).flatMap((g) => splitAlt(g.slice(1, -1)));
const parseTableRow = (line: string): string[] => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(clean);

/** 제목 "울쎄라 (Ulthera / Ultherapy)" → aliases ['ulthera','ultherapy','울쎄라'] */
export function titleAliases(title: string): string[] {
  const aliases = new Set<string>();
  const m = title.match(/[\(（]([^)）]+)[\)）]/g) ?? [];
  for (const g of m) for (const part of splitAlt(g.slice(1, -1))) if (part.length >= 3) aliases.add(part.toLowerCase());
  for (const part of splitAlt(stripParen(title))) if (part.length >= 2) aliases.add(part.toLowerCase());
  return [...aliases];
}

/**
 * 마크다운 한 문서를 청크로 쪼갠다. 청크 id 는 `${docKey}#순번`(1부터) — DB 에서는 문서 slug + seq 로 같은 id 를 만든다.
 */
export function chunkMarkdown(markdown: string, docKey: string): ChunkResult {
  const chunks: KbChunk[] = [];
  const aliasMap = new Map<string, Set<string>>(); // alias(lower) → Set<koTerm>
  const addAlias = (alias: string, ko: string | undefined): void => {
    const a = alias.toLowerCase().trim();
    if (a.length < 2 || !ko) return;
    let set = aliasMap.get(a);
    if (!set) { set = new Set(); aliasMap.set(a, set); }
    set.add(ko);
  };

  let chapterKey = 'intro';
  let chapterTitle = '';
  let chapterCat = 'common';
  let section = '';
  let para: string[] = [];
  let table: { header: string[]; rows: string[][] } | null = null;
  let n = 0;

  const flushPara = (): void => {
    const text = clean(para.join(' '));
    para = [];
    // 제목 앞 머리말과 안내 장(문서 목적) 문단은 뺀다 — 안내 장의 표(급여 표기 기준)는 flushTable 에서 들어간다
    if (!text || !chapterTitle || chapterKey === 'intro' || SKIP_CHAPTERS.has(chapterKey)) return;
    chunks.push({ id: `${docKey}#${++n}`, cat: chapterCat, chapter: chapterTitle, section, title: section || chapterTitle, text, aliases: [] });
  };

  const flushTable = (): void => {
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
      chunks.push({ id: `${docKey}#${++n}`, cat: chapterCat, chapter: chapterTitle, section, title: stripParen(title) || title, text: body, aliases });
      // 라틴 별칭 → 한국어 제목 (영어 질문이 한국어 청크를 찾게)
      const base = stripParen(title).split(/\s*\/\s*/)[0];
      for (const a of aliases) if (hasLatin(a)) addAlias(a, base);
    }
  };

  for (const raw of markdown.split('\n')) {
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
      const level = (h[1] ?? '').length;
      const title = clean(h[2] ?? '');
      if (level === 1) {
        const numbered = /^(\d{1,2})\./.test(title);
        const key = catForChapter(title);
        chapterKey = !numbered && key === 'other' ? 'intro' : key; // 번호 없는 머리말은 안내로 본다
        chapterTitle = title;
        chapterCat = chapterKey === 'intro' ? 'common' : chapterKey;
        section = '';
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

  const cats: Record<string, number> = {};
  for (const c of chunks) cats[c.cat] = (cats[c.cat] ?? 0) + 1;
  return { chunks, aliases: [...aliasMap.entries()].map(([a, s]) => [a, [...s]] as AliasPair), cats };
}

/** 여러 문서의 별칭 사전을 합친다(문서 순서 = 등장 순서) → 긴 별칭부터. 검색(retrieve.ts)이 쓰는 최종 형태 */
export function mergeAliases(lists: AliasPair[][]): AliasPair[] {
  const m = new Map<string, Set<string>>();
  for (const list of lists) {
    for (const [a, kos] of list) {
      let set = m.get(a);
      if (!set) { set = new Set(); m.set(a, set); }
      for (const k of kos) set.add(k);
    }
  }
  return [...m.entries()]
    .map(([a, s]) => [a, [...s]] as AliasPair)
    .filter(([a]) => a.length >= 2)
    .sort((x, y) => y[0].length - x[0].length);
}
