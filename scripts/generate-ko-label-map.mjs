// DB 의 한국어 프로모 라벨(category_listings.promo_label,
// partner_listings.promo_label)과 자유형 가격단위를 Gemini 로 일괄
// 번역해 lib/i18n/ko-labels.generated.ts 정적 맵으로 생성.
// 새 라벨이 DB 에 추가되면 다시 실행 — 기존 맵을 읽어 이미 있는
// 라벨은 재번역하지 않는다 (idempotent).
//
// usage: node --env-file=.env.local scripts/generate-ko-label-map.mjs

import postgres from 'postgres';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!KEY) { console.error('no gemini key'); process.exit(1); }
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const OUT = 'lib/i18n/ko-labels.generated.ts';
const LOCALES = ['en', 'zh', 'ja', 'ru', 'vi'];

async function gemini(promptText, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
        },
      );
      if (res.status === 429 || res.status >= 500) {
        console.log(`    [retry ${attempt}] HTTP ${res.status}`);
        await new Promise((r) => setTimeout(r, 15000 * attempt));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const j = await res.json();
      const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('empty response');
      return JSON.parse(text);
    } catch (e) {
      if (attempt === retries) throw e;
      console.log(`    [retry ${attempt}] ${e.message.slice(0, 80)}`);
      await new Promise((r) => setTimeout(r, 8000 * attempt));
    }
  }
}

// ── 라벨 수집 ────────────────────────────────────────────────────
// hospitals.details 의 구조화 라벨(시술명·진료과·의료진 역할·시설 등)도 수집
const detailRows = await sql`select details from hospitals where details <> '{}'::jsonb`;
const detailLabels = [];
{
  const push = (v) => { if (typeof v === 'string' && v.trim()) detailLabels.push(v.trim()); };
  for (const r of detailRows) {
    const d = r.details ?? {};
    push(d.tagline); push(d.hours); push(d.station);
    (d.signatureProcedures ?? []).forEach(push);
    (d.departments ?? []).forEach((dep) => { push(dep?.title); (dep?.items ?? []).forEach(push); });
    (d.doctors ?? []).forEach((doc) => { push(doc?.name); push(doc?.role); });
    (d.facilities ?? []).forEach(push);
    (d.trust ?? []).forEach(push);
    (d.foreignSupport?.languages ?? []).forEach(push);
    push(d.foreignSupport?.note);
    push(d.notice);
  }
}

const a = await sql`select distinct promo_label as l from category_listings where promo_label is not null and promo_label <> ''`;
const b = await sql`select distinct promo_label as l from partner_listings where promo_label is not null and promo_label <> ''`;
const c = await sql`select distinct price_unit as l from partner_listings where price_unit is not null and price_unit <> ''`;
// 병원 카드/상세의 도시명도 이 맵을 탄다. 하드코딩하면 새 도시가 들어올 때마다
// 조용히 번역에서 빠지므로 DB 에서 그대로 읽는다.
const d2 = await sql`select distinct address_json->>'city' as l from hospitals where address_json->>'city' <> ''`;
await sql.end();

// DB 밖 하드코딩 라벨 (랜딩 호텔 어메니티 등) — 같은 맵에서 번역
const EXTRA_LABELS = [
  '스파 무료 이용', '조식 뷔페 포함', '루프탑 무료 이용', '피트니스 무료 이용',
  '수영장 무료 이용', '사우나 무료 이용', '컨시어지 서비스', '주차 무료',
  // K팝 투어 무료 스팟의 가격 자리 라벨 (details.priceRange)
  '무료 입장', '외부 촬영 무료', '유료 · 사전 예약제',
];

const hasKorean = (s) => /[가-힯]/.test(s);
const labels = [...new Set([...[...a, ...b, ...c, ...d2].map((r) => r.l.trim()), ...EXTRA_LABELS, ...detailLabels])]
  .filter((s) => s && hasKorean(s))
  .sort();

// ── 기존 맵 로드 (재실행 시 skip) ────────────────────────────────
let existing = {};
if (existsSync(OUT)) {
  const src = readFileSync(OUT, 'utf8');
  const m = src.match(/KO_LABELS = (\{[\s\S]*\}) as const/);
  if (m) {
    try { existing = JSON.parse(m[1]); } catch { existing = {}; }
  }
}
const todo = labels.filter((l) => !existing[l]);
console.log(`labels total=${labels.length} todo=${todo.length}`);

// ── 청크 번역 ────────────────────────────────────────────────────
const CHUNK = 40;
const map = { ...existing };
for (let i = 0; i < todo.length; i += CHUNK) {
  const chunk = todo.slice(i, i + CHUNK);
  console.log(`  chunk ${i / CHUNK + 1}: ${chunk.length} labels`);
  const prompt = `You are a professional medical-tourism translator. These are short Korean marketing badge labels and price-unit labels shown on hospital/product cards. Translate each into English, Simplified Chinese, Japanese, Russian, and Vietnamese.

RULES:
- Keep them SHORT — badge-length (under ~40 chars where possible).
- Keep numbers, brand names (JCI, HYBE, Thermage, Marriott, Juvederm...), and "·" separators.
- 역 = Station/站/駅/станция/ga. 복지부 = Ministry of Health. 의료관광 = medical tourism.
- Return ONLY valid JSON: an array aligned to the input, each item {"ko":"...","en":"...","zh":"...","ja":"...","ru":"...","vi":"..."}.

INPUT (JSON array of Korean labels):
${JSON.stringify(chunk, null, 0)}`;
  const out = await gemini(prompt);
  const arr = Array.isArray(out) ? out : out.items ?? out.labels ?? [];
  for (const item of arr) {
    if (!item?.ko || !labels.includes(item.ko)) continue;
    const entry = {};
    for (const loc of LOCALES) {
      if (typeof item[loc] === 'string' && item[loc].trim()) entry[loc] = item[loc].trim();
    }
    if (Object.keys(entry).length === LOCALES.length) map[item.ko] = entry;
  }
}

const missing = labels.filter((l) => !map[l]);
if (missing.length) console.log('MISSING (kept untranslated):', missing);

// ── TS 파일 출력 ─────────────────────────────────────────────────
const sorted = Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k]]));
const ts = `// 자동 생성 파일 — scripts/generate-ko-label-map.mjs 가 만든
// 한국어 프로모 라벨/자유형 가격단위 → 5개 로케일 번역 맵.
// 직접 수정하지 말고 스크립트를 다시 실행할 것.
/* eslint-disable */
export const KO_LABELS = ${JSON.stringify(sorted, null, 2)} as const;
`;
writeFileSync(OUT, ts, 'utf8');
console.log(`wrote ${OUT}: ${Object.keys(sorted).length} entries`);
