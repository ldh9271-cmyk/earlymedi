import { NextResponse } from 'next/server';
import { coverByLocale, localesForMedia } from '@/lib/i18n/locale-cover';
import { and, eq, inArray, notIlike, notLike, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { categoryListings } from '@/drizzle/schema/category-listings';
import { hospitalLocaleContent } from '@/drizzle/schema/hospital-locale-content';
import { aiFaceAnalyses } from '@/drizzle/schema/ai-face-analyses';
import { fetchFeaturedListings } from '@/lib/listings/query';
import { localizeKoLabel } from '@/lib/i18n/ko-label';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import {
  CLINIC_REC_CATEGORIES, CLINIC_REC_EXCLUDED_NAME, CLINIC_REC_EXCLUDED_SLUG_PREFIX,
  CLINIC_REC_PER_CATEGORY, clinicRecKey, clinicRecOrder,
} from '@/lib/ai/clinic-recs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * AI Glow-Up 얼굴 분석 — 사진 1장을 Gemini 비전으로 분석해
 * 퍼스널컬러 톤·피부·헤어·눈썹 코멘트를 만들고, 분석 결과에 맞춰
 * 마켓플레이스에서 카테고리별 추천(퍼스널컬러·헤어·네일·반영구 2개씩 +
 * 병원은 모든 카테고리 1~6위, lib/ai/clinic-recs.ts 규칙)을 골라 돌려준다.
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

type ClinicSection = { key: string; items: RecItem[] };

/**
 * 병원 추천 — 모든 카테고리에서 노출 순위 1~6위 (AI 가 고른 카테고리가 먼저).
 * 순위는 category_listings.sort_order → hospitals.sort_order → 이름 순으로,
 * 마스터에서 정한 카테고리 순서가 그대로 1위부터다. 제외 병원은 순위에서 빼고
 * 다음 병원이 올라온다.
 */
async function pickClinics(primaryCat: string, locale: PublicLocale): Promise<ClinicSection[]> {
  try {
    const all = await db
      .select({
        id: hospitals.id,
        slug: hospitals.slug,
        name: hospitals.name,
        coverImageUrl: hospitals.coverImageUrl,
        promoLabel: categoryListings.promoLabel,
        categoryKey: categoryListings.categoryKey,
      })
      .from(categoryListings)
      .innerJoin(hospitals, eq(categoryListings.hospitalId, hospitals.id))
      .where(
        and(
          inArray(categoryListings.categoryKey, [...CLINIC_REC_CATEGORIES]),
          eq(hospitals.isActiveForMatching, true),
          notLike(hospitals.slug, `${CLINIC_REC_EXCLUDED_SLUG_PREFIX}%`),
          notIlike(hospitals.name, `%${CLINIC_REC_EXCLUDED_NAME}%`),
        ),
      )
      .orderBy(
        sql`${categoryListings.sortOrder} asc`,
        sql`${hospitals.sortOrder} asc`,
        sql`${hospitals.name} asc`,
      );
    // 카테고리별 상위 N — 한 병원이 여러 카테고리에 있으면 각 카테고리에서 따로 센다.
    const byCat = new Map<string, typeof all>();
    for (const r of all) {
      const list = byCat.get(r.categoryKey) ?? [];
      if (list.length < CLINIC_REC_PER_CATEGORY && !list.some((x) => x.id === r.id)) list.push(r);
      byCat.set(r.categoryKey, list);
    }
    const rows = clinicRecOrder(primaryCat).flatMap((c) => byCat.get(c) ?? []);
    if (rows.length === 0) return [];
    const overrides = new Map<string, { name: string | null; coverImageUrl: string | null }>();
    let covers = new Map<string, string>();
    try {
      const lc = await db
        .select({
          hospitalId: hospitalLocaleContent.hospitalId,
          locale: hospitalLocaleContent.locale,
          name: hospitalLocaleContent.name,
          coverImageUrl: hospitalLocaleContent.coverImageUrl,
        })
        .from(hospitalLocaleContent)
        .where(
          and(
            inArray(hospitalLocaleContent.hospitalId, rows.map((r) => r.id)),
            inArray(hospitalLocaleContent.locale, localesForMedia(locale)),
          ),
        );
      // 이름은 해당 로케일, 사진은 없으면 kr 것을 공용으로 사용
      for (const o of lc) {
        if (o.locale === locale) overrides.set(o.hospitalId, o);
      }
      covers = coverByLocale(
        lc.map((o) => ({ id: o.hospitalId, locale: o.locale, coverImageUrl: o.coverImageUrl })),
        locale,
      );
    } catch { /* keep base */ }
    const toRec = (r: (typeof rows)[number]): RecItem => {
      const o = overrides.get(r.id);
      return {
        title: o?.name?.trim() || r.name,
        href: `/${locale}/clinics/${r.slug}`,
        img: covers.get(r.id) || o?.coverImageUrl || r.coverImageUrl,
        promo: r.promoLabel ? localizeKoLabel(r.promoLabel, locale) : null,
      };
    };
    return clinicRecOrder(primaryCat)
      .map((c) => ({ key: clinicRecKey(c), items: (byCat.get(c) ?? []).map(toRec) }))
      .filter((s) => s.items.length > 0);
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

  const recs = [
    ...clinics,
    { key: 'personal_color', items: colors.map(toItem) },
    { key: 'hair', items: hairs.map(toItem) },
    { key: 'nail', items: nails.map(toItem) },
    { key: 'pmu', items: pmus.map(toItem) },
  ].filter((r) => r.items.length > 0);

  // 결과만 저장(사진 제외) — '이메일로 받기' 가 회원가입/로그인을 거쳐 돌아와도 결과를 다시 띄우고 보낼 수 있게.
  let id: string | null = null;
  try {
    const { faceDetected: _fd, ...saved } = analysis;
    const [row] = await db.insert(aiFaceAnalyses).values({ locale, analysis: saved, recs }).returning({ id: aiFaceAnalyses.id });
    id = row?.id ?? null;
  } catch { /* 저장 실패해도 결과는 보여준다 */ }

  return NextResponse.json({ id, analysis, recs });
}
