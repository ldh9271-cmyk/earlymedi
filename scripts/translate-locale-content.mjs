// 모든 게시물(hospitals + partner_listings)을 KR 기준으로 en/zh/ja/ru/vi
// 5개 로케일로 번역해 locale content 테이블에 upsert.
//
//   - 병원: hospital_locale_content (name·intro·seo_title·seo_description)
//     en 의 name 은 seed 의 영문명을 유지, intro/SEO 만 번역 교체.
//   - 상품: partner_listing_locale_content (title·description·
//     location_label·seo_title·seo_description)
//   - 번역: Gemini REST (JSON mode) — 항목당 1콜에 5개 로케일 동시 생성.
//   - idempotent: 번역 완료 판정(대상 언어 텍스트가 KR 원문과 다름)이면 skip.
//   - 브랜드 GlowUpTour 는 번역하지 않고 유지.
//
// usage: node --env-file=.env.local _translate_all.mjs [--limit N] [--only hospitals|listings]

import postgres from 'postgres';

const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!KEY) { console.error('no gemini key'); process.exit(1); }
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const LOCALES = ['en', 'zh', 'ja', 'ru', 'vi'];
const LOCALE_NAMES = { en: 'English', zh: 'Simplified Chinese', ja: 'Japanese', ru: 'Russian', vi: 'Vietnamese' };

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

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

function buildPrompt(fields, fixedEnName) {
  return `You are a professional medical-tourism translator. Translate the following Korean content into English, Simplified Chinese, Japanese, Russian, and Vietnamese.

RULES:
- Keep the brand name "GlowUpTour" untranslated in every language.
- Proper nouns (hospital/shop names) → natural localized transliteration or official English name.
- Keep times (10:00), prices, station names accurate; translate "역" as Station/站/駅/станция/ga appropriately.
- seoTitle max 60 chars, seoDescription max 150 chars per language.
- Tone: professional, trustworthy, marketing-friendly.
${fixedEnName ? `- For English, the "name" field MUST be exactly: ${JSON.stringify(fixedEnName)}` : ''}

SOURCE (Korean):
${JSON.stringify(fields, null, 2)}

Return ONLY valid JSON of shape:
{"en":{...same keys...},"zh":{...},"ja":{...},"ru":{...},"vi":{...}}`;
}

// ── 병원 ─────────────────────────────────────────────────────────
async function translateHospitals() {
  const hospitals = await sql`
    SELECT h.id, h.name,
      (SELECT row_to_json(k) FROM (
        SELECT name, intro, seo_title, seo_description
        FROM hospital_locale_content WHERE hospital_id = h.id AND locale = 'kr'
      ) k) AS kr,
      (SELECT json_object_agg(locale, json_build_object('name', name, 'intro', intro))
       FROM hospital_locale_content WHERE hospital_id = h.id AND locale <> 'kr') AS existing
    FROM hospitals h
    ORDER BY h.created_at
  `;

  let done = 0, skipped = 0, failed = 0, processed = 0;
  for (const h of hospitals) {
    if (processed >= LIMIT) break;
    const kr = h.kr ?? { name: h.name, intro: null, seo_title: null, seo_description: null };
    const krIntro = kr.intro ?? '';
    const existing = h.existing ?? {};

    // 번역 완료 판정: 5개 로케일 모두 존재하고 intro 가 KR 원문과 다르면 skip
    const needs = LOCALES.filter((l) => {
      const ex = existing[l];
      if (!ex) return true;
      if (krIntro && ex.intro === krIntro) return true; // 미번역 복사본
      if (!ex.intro && krIntro) return true;
      return false;
    });
    if (needs.length === 0) { skipped++; continue; }
    processed++;

    const fields = {
      name: kr.name ?? h.name,
      intro: krIntro || `${h.name} — 서울의 의료관광 협력 기관.`,
      seoTitle: kr.seo_title ?? '',
      seoDescription: kr.seo_description ?? '',
    };
    const fixedEnName = existing.en?.name ?? null;

    try {
      const t = await gemini(buildPrompt(fields, fixedEnName));
      for (const l of needs) {
        const v = t[l];
        if (!v) continue;
        const name = l === 'en' && fixedEnName ? fixedEnName : (v.name ?? fields.name);
        try {
          await sql`
            INSERT INTO hospital_locale_content (hospital_id, locale, name, intro, seo_title, seo_description)
            VALUES (${h.id}, ${l}, ${name}, ${v.intro ?? null}, ${v.seoTitle ?? null}, ${v.seoDescription ?? null})
          `;
        } catch {
          await sql`
            UPDATE hospital_locale_content
               SET name = ${name}, intro = ${v.intro ?? null},
                   seo_title = ${v.seoTitle ?? null}, seo_description = ${v.seoDescription ?? null},
                   updated_at = NOW()
             WHERE hospital_id = ${h.id} AND locale = ${l}
          `;
        }
      }
      done++;
      console.log(`  [h ${done}] ${h.name} (${needs.join(',')})`);
    } catch (e) {
      failed++;
      console.log(`  [h FAIL] ${h.name}: ${e.message.slice(0, 100)}`);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  console.log(`hospitals — translated: ${done}, skipped: ${skipped}, failed: ${failed}`);
}

// ── 글로우업 상품 ─────────────────────────────────────────────────
async function translateListings() {
  const listings = await sql`
    SELECT p.id, p.title, p.description, p.location_label,
      p.details->>'seoTitle' AS seo_title,
      p.details->>'seoDescription' AS seo_description,
      p.details->>'englishTitle' AS english_title,
      (SELECT json_object_agg(locale, json_build_object('title', title, 'description', description))
       FROM partner_listing_locale_content WHERE listing_id = p.id AND locale <> 'kr') AS existing
    FROM partner_listings p
    ORDER BY p.created_at
  `;

  let done = 0, skipped = 0, failed = 0, processed = 0;
  for (const p of listings) {
    if (processed >= LIMIT) break;
    const krDesc = p.description ?? '';
    const existing = p.existing ?? {};
    const needs = LOCALES.filter((l) => {
      const ex = existing[l];
      if (!ex) return true;
      if (krDesc && ex.description === krDesc) return true;
      if (!ex.description && krDesc) return true;
      return false;
    });
    if (needs.length === 0) { skipped++; continue; }
    processed++;

    const fields = {
      title: p.title,
      description: krDesc || p.title,
      locationLabel: p.location_label ?? '',
      seoTitle: p.seo_title ?? '',
      seoDescription: p.seo_description ?? '',
    };
    const fixedEnName = p.english_title ?? null;

    try {
      const t = await gemini(buildPrompt(fields, fixedEnName ? { title: fixedEnName } && fixedEnName : null));
      for (const l of needs) {
        const v = t[l];
        if (!v) continue;
        const title = l === 'en' && fixedEnName ? fixedEnName : (v.title ?? fields.title);
        try {
          await sql`
            INSERT INTO partner_listing_locale_content
              (listing_id, locale, title, description, location_label, seo_title, seo_description)
            VALUES (${p.id}, ${l}, ${title}, ${v.description ?? null}, ${v.locationLabel ?? null},
                    ${v.seoTitle ?? null}, ${v.seoDescription ?? null})
          `;
        } catch {
          await sql`
            UPDATE partner_listing_locale_content
               SET title = ${title}, description = ${v.description ?? null},
                   location_label = ${v.locationLabel ?? null},
                   seo_title = ${v.seoTitle ?? null}, seo_description = ${v.seoDescription ?? null},
                   updated_at = NOW()
             WHERE listing_id = ${p.id} AND locale = ${l}
          `;
        }
      }
      done++;
      console.log(`  [p ${done}] ${p.title} (${needs.join(',')})`);
    } catch (e) {
      failed++;
      console.log(`  [p FAIL] ${p.title}: ${e.message.slice(0, 100)}`);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  console.log(`listings — translated: ${done}, skipped: ${skipped}, failed: ${failed}`);
}

if (ONLY !== 'listings') await translateHospitals();
if (ONLY !== 'hospitals') await translateListings();
await sql.end();
console.log('ALL DONE');
