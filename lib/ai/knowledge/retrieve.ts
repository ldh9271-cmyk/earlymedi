/**
 * AI 상담 지식 베이스 검색 — 질문과 관련된 가이드 청크(의료 용어·급여/비급여·시술/수술 설명)를 골라
 * /api/ai/chat 시스템 프롬프트의 KNOWLEDGE 블록으로 준다. 임베딩 없이 용어 일치로 고른다:
 *   1. 외국어·라틴 표기를 한국어 용어로 바꾼다(KB_ALIASES: 16장 대조표 + 제목 괄호 표기).
 *   2. 질문을 단어로 나눠 조사를 떼고, 보험→급여 같은 질문 표현을 문서 표현으로 넓힌다.
 *   3. 청크 제목 일치 3점·본문 일치 1점(접두 부분 일치는 비례 감점), 질문의 진료과와 같은 장이면 ×1.3.
 *   4. 점수순으로 글자 예산(기본 3,500자) 안에서 최대 8개, 한 절에서 3개까지.
 * 원본 문서·재생성 방법: lib/ai/knowledge/docs/, scripts/kb-build.mjs
 */
import { KB_ALIASES, KB_CHUNKS, type KbChunk } from './chunks.generated';

/** 질문 표현 → 문서 표현 확장 (양쪽 다 검색어로 쓴다). */
const QUERY_EXPANSIONS: Array<[RegExp, string[]]> = [
  [/보험|insurance|cover|医保|保险|報銷|保険|保険適用/i, ['급여', '비급여', '건강보험']],
  [/가격|비용|얼마|견적|price|cost|how much|价格|费用|多少钱|料金|費用|いくら/i, ['가격', '비용', '추가 요금']],
  [/체류|며칠|몇 일|몇일|머물|일정|stay|days|how long|停留|几天|滞在|何日/i, ['체류', '다운타임', '실밥']],
  [/회복|붓기|멍|downtime|recovery|swelling|恢复|肿|ダウンタイム|腫れ/i, ['다운타임', '회복']],
  [/마취|아프|통증|anesthesia|pain|hurt|麻醉|疼|麻酔|痛/i, ['마취', '통증']],
  [/차이|비교|vs|versus|difference|区别|哪个|違い|どっち/i, ['비교', '설명']],
  [/정품|가짜|genuine|authentic|正品|真假|正規品/i, ['정품', '정량']],
  // 비의료 뷰티
  [/유지 ?기간|얼마나 가|오래 가|last|how long does|维持|保持多久|持ち|もつ/i, ['유지', '리터치']],
  [/제거|지우|오프|removal|remove|卸|オフ|落と/i, ['오프', '제거']],
  [/시간 얼마나|몇 시간|소요|how long|take|多久|多长时间|時間|何時間/i, ['소요 시간', '시술 시간']],
];

/** 영어 질문에서 자주 쓰는 표기 → 한국어 용어 (대조표에 없는 것만 보충). */
const EXTRA_ALIASES: Array<[string, string[]]> = [
  ['hifu', ['울쎄라', '슈링크']], ['botox', ['보톡스']], ['filler', ['필러']], ['lasik', ['라식']], ['lasek', ['라섹']],
  ['smile', ['스마일']], ['icl', ['렌즈삽입술']], ['implant', ['임플란트']], ['veneer', ['라미네이트']], ['whitening', ['미백']],
  ['rhinoplasty', ['코성형']], ['nose job', ['코성형']], ['double eyelid', ['쌍꺼풀']], ['eyelid', ['눈성형', '안검']],
  ['blepharoplasty', ['안검', '눈성형']], ['facelift', ['안면거상']], ['thread lift', ['실리프팅']], ['liposuction', ['지방흡입']],
  ['fat graft', ['지방이식']], ['breast', ['가슴']], ['hair transplant', ['모발이식']], ['hair loss', ['탈모']], ['cataract', ['백내장']],
  ['root canal', ['신경치료']], ['crown', ['크라운']], ['scaling', ['스케일링']], ['checkup', ['건강검진']], ['check-up', ['건강검진']],
  ['endoscopy', ['내시경']], ['acne', ['여드름']], ['scar', ['흉터']], ['pigment', ['색소']], ['melasma', ['기미']], ['pore', ['모공']],
  ['laser', ['레이저']], ['toning', ['토닝']], ['pico', ['피코']], ['rejuran', ['리쥬란']], ['skin booster', ['스킨부스터']],
  ['ulthera', ['울쎄라']], ['ultherapy', ['울쎄라']], ['thermage', ['써마지']], ['shurink', ['슈링크']], ['inmode', ['인모드']],
  ['sculptra', ['스컬트라']], ['exosome', ['엑소좀']], ['prp', ['PRP']], ['jaw', ['턱', '양악']], ['chin', ['턱끝']], ['cheekbone', ['광대']],
  ['two-jaw', ['양악']], ['orthodontic', ['교정']], ['braces', ['교정']], ['aligner', ['투명교정']], ['wisdom', ['사랑니']],
  ['sedation', ['수면마취']], ['general anesthesia', ['전신마취']], ['local anesthesia', ['국소마취']], ['suture', ['실밥']],
  ['korean medicine', ['한의']], ['acupuncture', ['침']], ['herbal', ['한약']], ['mri', ['MRI']], ['pet-ct', ['PET-CT']],
  ['knee', ['무릎']], ['spine', ['척추']], ['disc', ['디스크']], ['shoulder', ['어깨']], ['joint', ['관절']],
  // 중국어·일본어 질문에서 자주 쓰는 세부 표기 (대조표 괄호 안 보충)
  ['埋没', ['매몰']], ['埋线', ['매몰']], ['切開', ['절개']], ['全切', ['절개']], ['二重', ['쌍꺼풀']], ['双眼皮', ['쌍꺼풀']],
  ['整形', ['성형']], ['美容', ['미용']], ['皮肤', ['피부']], ['皮膚', ['피부']], ['牙', ['치과']], ['歯', ['치과']], ['眼', ['안과']],
  ['激光', ['레이저']], ['レーザー', ['레이저']], ['麻醉', ['마취']], ['麻酔', ['마취']], ['拆线', ['실밥']], ['抜糸', ['실밥']],
  ['植发', ['모발이식']], ['植毛', ['모발이식']], ['脱发', ['탈모']], ['薄毛', ['탈모']], ['体检', ['건강검진']], ['健康診断', ['건강검진']],
  // 비의료 뷰티 (영어 일반어 — 대조표에 없는 것만)
  ['perm', ['펌']], ['dye', ['염색']], ['hair color', ['염색']], ['bleach', ['탈색']], ['haircut', ['커트']], ['lash', ['속눈썹']],
  ['eyelash', ['속눈썹']], ['eyebrow', ['눈썹']], ['brow', ['눈썹']], ['facial', ['피부관리']], ['massage', ['마사지']], ['spa', ['스파']],
  ['nail', ['네일']], ['gel', ['젤네일']], ['pedicure', ['패디큐어']], ['manicure', ['네일']], ['makeup', ['메이크업']], ['make-up', ['메이크업']],
  ['tattoo', ['반영구', '문신']], ['microblading', ['엠보']], ['waxing', ['왁싱']], ['wax', ['왁싱']], ['photoshoot', ['촬영']], ['photo', ['촬영']],
  ['hanbok', ['한복']], ['kpop', ['K-pop']], ['k-pop', ['K-pop']], ['idol', ['아이돌']], ['warm tone', ['웜톤']], ['cool tone', ['쿨톤']],
  ['scalp', ['두피']], ['head spa', ['헤드스파']], ['jjimjilbang', ['찜질방']], ['sauna', ['사우나']], ['designer', ['디자이너']],
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** 라틴 별칭은 단어 경계로만(‘eye’ 가 ‘eyeliner’ 안에서 걸리지 않게), 한자·가나·한글 별칭은 부분 일치. */
const ALIASES: Array<{ alias: string; re: RegExp; kos: string[] }> = [...KB_ALIASES, ...EXTRA_ALIASES]
  .filter(([a]) => a.length >= 2 && !(/^[a-z0-9 .+\-]+$/i.test(a) && a.length < 3))
  .sort((a, b) => b[0].length - a[0].length)
  .map(([alias, kos]) => ({
    alias,
    re: /^[a-z0-9 .+\-]+$/i.test(alias) ? new RegExp(`(?<![a-z0-9])${escapeRe(alias)}(?![a-z0-9])`, 'i') : new RegExp(escapeRe(alias), 'i'),
    kos,
  }));

/** 한국어 조사·어미 제거 (검색어용, 완벽하지 않아도 접두 일치가 보완). */
const PARTICLES = /(이에요|예요|인가요|인지|나요|까요|어요|아요|해요|하고|에서|으로|부터|까지|이랑|처럼|보다|이나|에게|한테|은|는|이|가|을|를|의|에|도|로|와|과|요|죠|만|랑|께)$/;
const STOP = new Set(['추천', '알려', '알려줘', '어디', '어때', '잘하는', '좋은', '해줘', '해주세요', '궁금', '질문', '있나요', '있어요', '되나요', '되요', '돼요', '하나요', '할까요', '뭐', '뭔가요', '무엇', '어떤', '어떻게', '그리고', '그런데', '근데', '혹시', '병원', '의원', '클리닉', '한국', '서울', 'please', 'recommend', 'clinic', 'hospital', 'good', 'best', 'korea', 'korean', 'seoul', 'what', 'which', 'about', 'with', 'this', 'that', 'there', 'have', 'does', 'want', 'need', 'the', 'and', 'for', 'are', 'can', 'you', 'get', 'should', 'would', 'like']);

function tokenize(q: string): { terms: string[]; strong: Set<string> } {
  const out = new Set<string>();
  const strong = new Set<string>(); // 별칭에서 온 정확한 용어 — 점수 가중
  const lower = q.toLowerCase();
  // 1) 별칭 → 한국어 용어 (긴 것부터, 한 번 잡힌 구간은 지운다)
  let rest = lower;
  for (const { re, kos } of ALIASES) {
    if (re.test(rest)) {
      kos.forEach((k) => { out.add(k.toLowerCase()); strong.add(k.toLowerCase()); });
      rest = rest.replace(new RegExp(re.source, 'gi'), ' ');
    }
  }
  // 2) 질문 표현 확장
  for (const [re, words] of QUERY_EXPANSIONS) if (re.test(q)) words.forEach((w) => out.add(w.toLowerCase()));
  // 3) 일반 단어: 라틴 3자 이상, 한글·한자·가나 2자 이상 (조사 제거)
  for (const w of rest.split(/[^\p{L}\p{N}+\-]+/u)) {
    let t = w.trim();
    if (!t) continue;
    if (/^[a-z0-9+\-]+$/.test(t)) { if (t.length >= 3 && !STOP.has(t)) out.add(t); continue; }
    const stripped = t.replace(PARTICLES, '');
    if (stripped.length >= 2) t = stripped;
    if (t.length >= 2 && !STOP.has(t)) out.add(t);
  }
  return { terms: [...out].slice(0, 16), strong };
}

/** 접두 부분 일치 점수: '임플란트를' 같은 변형, 복합어 대비. 전체 일치 1, 앞 n글자 일치 n/len×0.6 */
function matchScore(term: string, hay: string): number {
  if (hay.includes(term)) return 1;
  if (term.length < 3 || /^[a-z0-9]+$/.test(term)) return 0;
  for (let n = term.length - 1; n >= 2; n--) if (hay.includes(term.slice(0, n))) return (n / term.length) * 0.6;
  return 0;
}

export type KnowledgeHit = { chunk: KbChunk; score: number };

export type KnowledgeResult = {
  hits: KnowledgeHit[];
  /** 프롬프트에 그대로 넣는 텍스트 (없으면 '') */
  text: string;
  hit: boolean;
  terms: string[];
};

export function retrieveKnowledge(
  question: string,
  opts: { cats?: string[]; budgetChars?: number; max?: number } = {},
): KnowledgeResult {
  const budget = opts.budgetChars ?? 3500;
  const max = opts.max ?? 8;
  const cats = new Set((opts.cats ?? []).map((c) => c.toLowerCase()));
  const { terms, strong: aliasTerms } = tokenize(question);
  if (terms.length === 0 && cats.size === 0) return { hits: [], text: '', hit: false, terms };

  const scored: KnowledgeHit[] = [];
  for (const c of KB_CHUNKS) {
    const title = (c.title + ' ' + c.aliases.join(' ')).toLowerCase();
    const body = c.text.toLowerCase();
    let score = 0, strong = false;
    for (const t of terms) {
      const w = aliasTerms.has(t) ? 1.5 : 1; // 외국어 별칭으로 확정된 용어는 더 믿는다
      const ts = matchScore(t, title);
      if (ts > 0) { score += 3 * ts * w; if (ts === 1) strong = true; continue; }
      const bs = matchScore(t, body);
      if (bs > 0) { score += bs * w; if (bs === 1) strong = true; }
    }
    const sameCat = cats.has(c.cat);
    if (sameCat) {
      score *= 1.5;
      // 과만 말한 질문("피부과 비급여 뭐 있어요")도 그 장의 개요는 보이게
      if (/개요|공통|기초/.test(c.section) || /개요/.test(c.title)) score += 0.5;
    }
    if (c.cat === 'common' || c.cat === 'rules') score *= 0.9; // 과별 설명이 먼저
    if (score > 0 && (strong || sameCat)) scored.push({ chunk: c, score });
  }
  scored.sort((a, b) => b.score - a.score);
  // 1위의 절반 아래는 잡음("성형외과 추천"에 눈·턱 수술 행이 줄줄이 따라오는 것) — 상대 기준으로 자른다
  const floor = Math.max(1.5, (scored[0]?.score ?? 0) * 0.5);

  const picked: KnowledgeHit[] = [];
  const perSection = new Map<string, number>();
  let used = 0;
  for (const h of scored) {
    if (h.score < floor) break;
    const key = h.chunk.chapter + '|' + h.chunk.section;
    if ((perSection.get(key) ?? 0) >= 3) continue;
    const line = formatChunk(h.chunk);
    if (used + line.length > budget) continue;
    picked.push(h);
    perSection.set(key, (perSection.get(key) ?? 0) + 1);
    used += line.length;
    if (picked.length >= max) break;
  }
  return { hits: picked, text: picked.map((h) => formatChunk(h.chunk)).join('\n'), hit: picked.length > 0, terms };
}

function formatChunk(c: KbChunk): string {
  const where = [c.chapter.replace(/^\d+\.\s*/, ''), c.section.replace(/^\d+\.\d+\s*/, '')].filter(Boolean).join(' › ');
  const body = c.text.length > 700 ? c.text.slice(0, 700) + '…' : c.text;
  return `- [${where}] ${c.title}: ${body}`;
}

/**
 * 문서 0장·15장의 상담 원칙 요약 — 질문과 무관하게 항상 프롬프트에 넣는다.
 * (의료광고 금지 표현, 외국인 전액 자부담 전제, 진단 금지, 응급 안내)
 */
export const KB_RULES = `- Korean National Health Insurance (급여) applies only to NHI members. Short-term foreign visitors pay the hospital's quoted price in full regardless of 급여/비급여; foreigners enrolled in NHI (6+ months residence or employed in Korea) are covered like Koreans. Use 급여/비급여 only to explain the Korean system; never say a visitor's treatment will be "covered". Cosmetic procedures (botox, filler, lifting, cosmetic surgery) are not covered anywhere; for treatment-purpose care, hospitals can issue English medical certificates/receipts for the patient's home insurer.
- 비급여 prices are set by each hospital and differ by device generation, shots/cc/units and package contents — always say the exact price is confirmed in the hospital's quote and ask for the unit (e.g. Ulthera 400 shots). Never promise discounts or events.
- Durations, counts and percentages in KNOWLEDGE are typical ranges: say "generally/typically" and "varies by person"; never guarantee results, recovery time or "no side effects"; never use superlatives (best, No.1, only, 100%, painless, cure).
- You do not diagnose or prescribe; suitability is decided by the doctor after an in-person consultation. If the user describes emergency symptoms (chest pain, breathing difficulty, loss of consciousness, heavy bleeding), tell them to call 119 in Korea immediately.
- For stay planning, count: procedure day + follow-up check + suture removal (5–14 days for surgery) + swelling before flying; non-incisional procedures usually allow same-day discharge.
- Non-medical beauty services (personal color, hair salon, makeup, nail, semi-permanent makeup/PMU, lashes, waxing, esthetic/spa, scalp care, photo studio, K-pop tours) are not medical care: no insurance concept, no doctor. Call them 관리/서비스, never treatment or cure. Shops may not use medical lasers, HIFU/RF, injections, prescription peels or medicines; wrinkle, pigment, acne or hair-loss *treatment* belongs to clinics — offer the shop service as a non-medical option and route medical goals to a clinic. PMU/tattoo is a legal grey area in Korea: explain neutrally, recommend hygiene checks (single-use needles, approved pigments), never for minors.
- Salon prices shown as "1회 기준" are base prices: designer grade, hair length (기장 추가), design and options add surcharges — say so whenever you mention a salon price. Gel nails, lash extensions, PMU and perms need touch-ups after 2–4 weeks; for short stays recommend one-visit options and explain removal/aftercare at home. Ask about allergies (hair-dye PPD, lash glue, gel, wax, pigments) and pregnancy/breastfeeding before dye, PMU or waxing. Do not relay unverifiable celebrity/idol claims; soften to "known for".`;
