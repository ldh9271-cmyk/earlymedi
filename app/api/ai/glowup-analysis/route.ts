import { NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { categoryListings } from '@/drizzle/schema/category-listings';
import { hospitalLocaleContent } from '@/drizzle/schema/hospital-locale-content';
import { fetchFeaturedListings } from '@/lib/listings/query';
import { localizeKoLabel } from '@/lib/i18n/ko-label';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * AI Glow-Up 얼굴 분석 — 사진 1장을 Gemini 비전으로 분석해
 * 퍼스널컬러 톤·피부·헤어·눈썹 코멘트를 만들고, 분석 결과에 맞춰
 * 마켓플레이스에서 카테고리별 추천 1~2개(퍼스널컬러·헤어·네일·
 * 반영구 + 병원)를 골라 돌려준다.
 *
 * 개인정보: 이미지는 Gemini 호출에만 사용하고 저장하지 않는다
 * (dict.ai.note 문구와 일치). 의료 진단이 아닌 뷰티 추천 용도로만
 * 프롬프트를 제한한다.
 */

const LOCALE_LANGUAGE: Record<PublicLocale, string> = {
  kr: 'Korean',
  en: 'English',
  zh: 'Simplified Chinese',
  ja: 'Japanese',
  ru: 'Russian',
  vi: 'Vietnamese',
};

type Analysis = {
  faceDetected: boolean;
  personalColorSeason: string;
  personalColorNote: string;
  skinNote: string;
  hairNote: string;
  browNote: string;
  overallNote: string;
  clinicCategory: 'dermatology' | 'plastic_surgery';
};

async function analyzeWithGemini(
  imageBase64: string,
  mimeType: string,
  language: string,
): Promise<Analysis | null> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;
  const prompt = `You are a friendly K-beauty consultant AI for a Seoul beauty-tour service. Analyze the face in this photo for BEAUTY styling purposes only (no medical diagnosis, no judgement of attractiveness).

Return ONLY valid JSON:
{
  "faceDetected": boolean,            // false if no clear human face
  "personalColorSeason": "spring warm" | "summer cool" | "autumn warm" | "winter cool",
  "personalColorNote": string,        // why this season suits them + 1 color tip
  "skinNote": string,                 // gentle skin-care/treatment direction (beauty tone, not medical)
  "hairNote": string,                 // hair style/color direction that would suit
  "browNote": string,                 // brow shape/semi-permanent makeup direction
  "overallNote": string,              // warm 1-2 sentence summary of their glow-up direction
  "clinicCategory": "dermatology" | "plastic_surgery"  // which clinic type fits the skin/beauty direction best; default "dermatology"
}

All note fields MUST be written in ${language}, warm and encouraging, 1-2 short sentences each. If faceDetected is false, still return the JSON with empty strings.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
                { text: prompt },
              ],
            }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
          }),
        },
      );
      if (!res.ok) {
        if (res.status === 429 || res.status >= 500) continue;
        return null;
      }
      const j = await res.json();
      const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      const parsed = JSON.parse(text) as Partial<Analysis>;
      return {
        faceDetected: !!parsed.faceDetected,
        personalColorSeason: parsed.personalColorSeason ?? '',
        personalColorNote: parsed.personalColorNote ?? '',
        skinNote: parsed.skinNote ?? '',
        hairNote: parsed.hairNote ?? '',
        browNote: parsed.browNote ?? '',
        overallNote: parsed.overallNote ?? '',
        clinicCategory: parsed.clinicCategory === 'plastic_surgery' ? 'plastic_surgery' : 'dermatology',
      };
    } catch {
      /* retry once */
    }
  }
  return null;
}

type RecItem = { title: string; href: string; img: string | null; promo: string | null };

async function pickClinics(cat: string, locale: PublicLocale): Promise<RecItem[]> {
  try {
    const rows = await db
      .select({
        id: hospitals.id,
        slug: hospitals.slug,
        name: hospitals.name,
        coverImageUrl: hospitals.coverImageUrl,
        promoLabel: categoryListings.promoLabel,
      })
      .from(categoryListings)
      .innerJoin(hospitals, eq(categoryListings.hospitalId, hospitals.id))
      .where(eq(categoryListings.categoryKey, cat))
      .orderBy(sql`(${hospitals.coverImageUrl} IS NULL), ${hospitals.sortOrder} asc`)
      .limit(2);
    if (rows.length === 0) return [];
    const overrides = new Map<string, { name: string | null; coverImageUrl: string | null }>();
    try {
      const lc = await db
        .select({
          hospitalId: hospitalLocaleContent.hospitalId,
          name: hospitalLocaleContent.name,
          coverImageUrl: hospitalLocaleContent.coverImageUrl,
        })
        .from(hospitalLocaleContent)
        .where(
          and(
            inArray(hospitalLocaleContent.hospitalId, rows.map((r) => r.id)),
            eq(hospitalLocaleContent.locale, locale),
          ),
        );
      for (const o of lc) overrides.set(o.hospitalId, o);
    } catch { /* keep base */ }
    return rows.map((r) => {
      const o = overrides.get(r.id);
      return {
        title: o?.name?.trim() || r.name,
        href: `/${locale}/clinics/${r.slug}`,
        img: o?.coverImageUrl || r.coverImageUrl,
        promo: r.promoLabel ? localizeKoLabel(r.promoLabel, locale) : null,
      };
    });
  } catch {
    return [];
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: { image?: string; mimeType?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const locale: PublicLocale = isPublicLocale(body.locale ?? '') ? (body.locale as PublicLocale) : 'kr';
  const image = (body.image ?? '').replace(/^data:[^;]+;base64,/, '');
  const mimeType = body.mimeType && /^image\/(jpeg|png|webp)$/.test(body.mimeType)
    ? body.mimeType
    : 'image/jpeg';
  if (!image || image.length < 100) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (image.length > 11_000_000) { // ~8MB
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  const analysis = await analyzeWithGemini(image, mimeType, LOCALE_LANGUAGE[locale]);
  if (!analysis) {
    return NextResponse.json({ error: 'analysis_failed' }, { status: 502 });
  }
  if (!analysis.faceDetected) {
    return NextResponse.json({ error: 'no_face' }, { status: 422 });
  }

  // 분석과 함께 보여줄 카테고리별 추천 — 커버 사진 우선 2개씩.
  const [colors, hairs, nails, pmus, clinics] = await Promise.all([
    fetchFeaturedListings({ locale, categories: ['personal_color'], limit: 2 }),
    fetchFeaturedListings({ locale, categories: ['hair'], limit: 2 }),
    fetchFeaturedListings({ locale, categories: ['nail'], limit: 2 }),
    fetchFeaturedListings({ locale, categories: ['pmu'], limit: 2 }),
    pickClinics(analysis.clinicCategory, locale),
  ]);
  const toItem = (l: (typeof colors)[number]): RecItem => ({
    title: l.title,
    href: `/${locale}/listings/${l.slug}`,
    img: l.coverImageUrl,
    promo: l.promoLabel ? localizeKoLabel(l.promoLabel, locale) : null,
  });

  return NextResponse.json({
    analysis,
    recs: [
      { key: 'clinic', items: clinics },
      { key: 'personal_color', items: colors.map(toItem) },
      { key: 'hair', items: hairs.map(toItem) },
      { key: 'nail', items: nails.map(toItem) },
      { key: 'pmu', items: pmus.map(toItem) },
    ].filter((r) => r.items.length > 0),
  });
}
