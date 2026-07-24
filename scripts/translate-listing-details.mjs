// details.itinerary / details.highlights 가 있는 listing 의 구조화 콘텐츠를
// 5개 로케일로 번역해 details.itineraryI18n / highlightsI18n 에 저장.
// idempotent: 이미 5개 로케일 I18n 이 있으면 skip.

import postgres from 'postgres';

const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
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
        await new Promise((r) => setTimeout(r, 15000 * attempt));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text ?? 'null');
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 8000 * attempt));
    }
  }
}

const rows = await sql`
  SELECT id, title, details
  FROM partner_listings
  WHERE details ? 'itinerary' OR details ? 'highlights'
`;

for (const p of rows) {
  const d = p.details;
  const hasItinI18n = d.itineraryI18n && LOCALES.every((l) => Array.isArray(d.itineraryI18n[l]));
  const hasHlI18n = d.highlightsI18n && LOCALES.every((l) => Array.isArray(d.highlightsI18n[l]));
  if ((!d.itinerary || hasItinI18n) && (!d.highlights || hasHlI18n)) {
    console.log(`  [skip] ${p.title}`);
    continue;
  }

  const source = {};
  if (d.itinerary && !hasItinI18n) source.itinerary = d.itinerary;
  if (d.highlights && !hasHlI18n) source.highlights = d.highlights;

  const prompt = `You are a professional travel/medical-tourism translator. Translate this Korean structured content into English, Simplified Chinese, Japanese, Russian, and Vietnamese.

RULES:
- Preserve JSON structure EXACTLY (same keys: day/title/items for itinerary; icon/title/desc for highlights).
- "icon" values must stay unchanged (expert/concierge/check).
- Keep times (10:00), brand names (HYBE, SM, K★Star Road, DDP, GlowUpTour) as-is.
- "1일차" → "Day 1" / "第1天" / "1日目" / "День 1" / "Ngày 1" style per language.
- For highlights desc: the Korean source may contain an English tail sentence — output ONLY the target language (drop the English tail except in the "en" output).
- Natural, marketing-friendly tone.

SOURCE (Korean):
${JSON.stringify(source, null, 2)}

Return ONLY JSON: {"en":{...same shape as source...},"zh":{...},"ja":{...},"ru":{...},"vi":{...}}`;

  try {
    const t = await gemini(prompt);
    const newDetails = { ...d };
    if (source.itinerary) {
      newDetails.itineraryI18n = Object.fromEntries(
        LOCALES.map((l) => [l, t[l]?.itinerary ?? null]).filter(([, v]) => Array.isArray(v)),
      );
    }
    if (source.highlights) {
      newDetails.highlightsI18n = Object.fromEntries(
        LOCALES.map((l) => [l, t[l]?.highlights ?? null]).filter(([, v]) => Array.isArray(v)),
      );
    }
    await sql`
      UPDATE partner_listings SET details = ${sql.json(newDetails)}, updated_at = NOW()
       WHERE id = ${p.id}
    `;
    console.log(`  [ok] ${p.title} — itin:${!!newDetails.itineraryI18n} hl:${!!newDetails.highlightsI18n}`);
  } catch (e) {
    console.log(`  [FAIL] ${p.title}: ${e.message.slice(0, 80)}`);
  }
  await new Promise((r) => setTimeout(r, 1500));
}

await sql.end();
console.log('details i18n done');
