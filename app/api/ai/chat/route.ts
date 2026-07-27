import { NextResponse } from 'next/server';
import { and, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { hospitalLocaleContent } from '@/drizzle/schema/hospital-locale-content';
import { categoryListings } from '@/drizzle/schema/category-listings';
import { partnerListings, partnerListingLocaleContent } from '@/drizzle/schema/partner-listings';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { localizeKoLabel } from '@/lib/i18n/ko-label';
import { localizePriceUnit } from '@/lib/i18n/price-unit';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 실시간 AI 상담 — 우리 DB(병원 + 상품)를 근거로 답하는 RAG 챗.
 *
 *   1. 사용자 질문에서 토큰을 뽑아 병원(hospitals + details)과
 *      상품(partner_listings)을 검색한다. 카테고리 키워드 매핑은
 *      /search 와 같은 규칙을 쓰되 챗 문맥에 맞게 축약했다.
 *   2. 검색 결과를 "근거 목록"으로 만들어 시스템 프롬프트에 넣고,
 *      DB 에 없는 정보는 지어내지 말라고 강하게 지시한다.
 *   3. 답변과 함께 참조한 항목을 cards 로 돌려줘 UI 가 링크를 건다.
 *
 * 안전 규칙(의료법 §56 · 진단 금지):
 *   - 진단·처방·치료효과 보장 금지, 가격은 등록된 값만 인용
 *   - 판단이 필요한 질문은 컨시어지/병원 상담으로 연결
 */

const BodySchema = z.object({
  locale: z.string(),
  /** true 면 SSE 로 토큰을 흘려보낸다 (타이핑 효과). */
  stream: z.boolean().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(2000),
  })).min(1).max(20),
});

const LOCALE_LANGUAGE: Record<PublicLocale, string> = {
  kr: 'Korean', en: 'English', zh: 'Simplified Chinese',
  ja: 'Japanese', ru: 'Russian', vi: 'Vietnamese',
};

// 질문 → 카테고리 키워드 (검색 페이지 매핑의 챗 버전)
const HOSPITAL_CATS: Array<{ words: string[]; cat: string }> = [
  {
    words: [
      '성형', 'plastic', 'surgery', '整形', '整容', 'пластик', 'thẩm mỹ',
      // 세부 시술명으로 물어봐도 성형외과로 연결 (details 검색과 병행)
      '쌍꺼풀', '트임', '눈매교정', '눈밑지방', '눈성형',
      '코끝', '콧대', '비중격', '코수술', '코성형',
      '양악', '광대', '사각턱', '윤곽',
      '가슴', '지방흡입', '바디라인', '체형교정',
      '윤곽주사', '지방이식', '리프팅', '보톡스', '필러',
      'double eyelid', 'rhinoplasty', 'nose job', 'facial contour', 'liposuction',
    ],
    cat: 'plastic_surgery',
  },
  { words: ['피부', 'skin', 'derma', '皮肤', '皮膚', 'кожа', 'da liễu'], cat: 'dermatology' },
  { words: ['치과', '임플란트', 'dental', 'implant', '牙', '歯', 'стомат', 'nha khoa'], cat: 'dental' },
  { words: ['안과', '라식', '라섹', 'eye', 'lasik', '眼', 'глаз', 'mắt'], cat: 'ophthalmology' },
  { words: ['모발', '탈모', '모발이식', 'hair transplant', '植发', '植毛', 'волос', 'tóc'], cat: 'hair' },
  { words: ['검진', '건강검진', 'checkup', 'check-up', '体检', '検診', 'чек-ап', 'khám sức khỏe'], cat: 'health_checkup' },
  { words: ['줄기세포', 'stem cell', '干细胞', '幹細胞', 'стволов', 'tế bào gốc'], cat: 'stem_cell' },
  { words: ['한방', '한의', 'korean medicine', 'oriental', '韩医', '韓方', 'восточн', 'y học cổ truyền'], cat: 'oriental' },
];

const LISTING_CATS: Array<{ words: string[]; cats: string[] }> = [
  { words: ['패키지', '여행', 'package', 'tour', 'ツアー', '跟团', 'тур'], cats: ['travel_package'] },
  { words: ['연수', '세미나', 'training', 'seminar', '研修', '培训'], cats: ['travel_package'] },
  { words: ['호텔', '숙소', 'hotel', 'ホテル', '酒店', 'отель', 'khách sạn'], cats: ['hotel'] },
  { words: ['맛집', '식당', 'food', 'restaurant', 'グルメ', '美食', 'ресторан'], cats: ['food', 'restaurant'] },
  { words: ['퍼스널컬러', '퍼스널 컬러', 'personal color', 'パーソナルカラー', '色彩', 'цветотип'], cats: ['personal_color'] },
  { words: ['헤어', '미용실', 'hair salon', 'ヘア', '美发', 'волосы'], cats: ['hair'] },
  { words: ['메이크업', 'makeup', 'メイク', '化妆', 'макияж'], cats: ['makeup'] },
  { words: ['네일', 'nail', 'ネイル', '美甲', 'маникюр'], cats: ['nail'] },
  { words: ['반영구', '눈썹', 'pmu', 'eyebrow', 'アートメイク', '半永久'], cats: ['pmu'] },
  { words: ['사진', '스튜디오', 'photo', 'studio', '写真', 'фото'], cats: ['photo_studio'] },
  { words: ['케이팝', 'k팝', 'kpop', 'k-pop', 'アイドル'], cats: ['kpop_tour'] },
];

function matchCats<T extends { words: string[] }>(q: string, table: T[]): T[] {
  const lower = q.toLowerCase();
  return table.filter((m) => m.words.some((w) => lower.includes(w.toLowerCase())));
}

type Card = { kind: 'clinic' | 'listing'; title: string; href: string; note: string };

/** 질문에 맞는 병원 근거 수집 — 카테고리 매칭 우선, 없으면 이름 검색. */
/** '잘하는', '병원' 같은 군더더기를 뺀 검색 토큰. */
function procedureTokens(q: string): string[] {
  const STOP = /잘하는|잘하|추천|알려줘|어디|어때|병원|의원|클리닉|좋은|해줘|해주|찾아|please|recommend|clinic|hospital|good|best|for|the|a|an/gi;
  return q
    .replace(STOP, ' ')
    .split(/[s,·.?!·、，。]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 4);
}

async function findHospitals(q: string, locale: PublicLocale): Promise<Array<{ text: string; card: Card }>> {
  const cats = matchCats(q, HOSPITAL_CATS).map((m) => m.cat);
  try {
    const rows = cats.length
      ? await db
          .select({
            id: hospitals.id, name: hospitals.name, slug: hospitals.slug,
            details: hospitals.details, notes: hospitals.notes,
            addressJson: hospitals.addressJson,
            promo: categoryListings.promoLabel, cat: categoryListings.categoryKey,
          })
          .from(categoryListings)
          .innerJoin(hospitals, eq(categoryListings.hospitalId, hospitals.id))
          .where(
            and(
              inArray(categoryListings.categoryKey, cats),
              eq(hospitals.isActiveForMatching, true),
            ),
          )
          .orderBy(sql`${categoryListings.sortOrder} asc`, sql`${hospitals.sortOrder} asc`)
          .limit(6)
      : await db
          .select({
            id: hospitals.id, name: hospitals.name, slug: hospitals.slug,
            details: hospitals.details, notes: hospitals.notes,
            addressJson: hospitals.addressJson,
            promo: sql<string | null>`null`, cat: sql<string | null>`null`,
          })
          .from(hospitals)
          .where(and(eq(hospitals.countryCode, 'KR'), ilike(hospitals.name, `%${q.slice(0, 20)}%`)))
          .limit(4);

    // 시술명 검색 — details(진료분야·대표시술) 텍스트에 토큰이 있으면 합류.
    // "쌍꺼풀 잘하는 병원"처럼 카테고리 단어가 없는 질문을 잡는다.
    const tokens = procedureTokens(q);
    if (tokens.length > 0) {
      const seen = new Set(rows.map((r) => r.id));
      const byProc = await db
        .select({
          id: hospitals.id, name: hospitals.name, slug: hospitals.slug,
          details: hospitals.details, notes: hospitals.notes,
          addressJson: hospitals.addressJson,
          promo: categoryListings.promoLabel, cat: categoryListings.categoryKey,
        })
        .from(hospitals)
        .leftJoin(categoryListings, eq(categoryListings.hospitalId, hospitals.id))
        .where(
          and(
            eq(hospitals.isActiveForMatching, true),
            or(...tokens.map((tk) => sql`${hospitals.details}::text ILIKE ${'%' + tk + '%'}`)) as SQL,
          ),
        )
        .orderBy(sql`coalesce(${categoryListings.sortOrder}, 999) asc`, sql`${hospitals.sortOrder} asc`)
        .limit(6);
      for (const r of byProc) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        rows.push(r as (typeof rows)[number]);
      }
    }
    if (rows.length === 0) return [];

    const lc = new Map<string, { name: string | null; intro: string | null }>();
    try {
      const l = await db
        .select({ hospitalId: hospitalLocaleContent.hospitalId, name: hospitalLocaleContent.name, intro: hospitalLocaleContent.intro })
        .from(hospitalLocaleContent)
        .where(and(inArray(hospitalLocaleContent.hospitalId, rows.map((r) => r.id)), eq(hospitalLocaleContent.locale, locale)));
      for (const x of l) lc.set(x.hospitalId, x);
    } catch { /* keep base */ }

    return rows.map((r) => {
      const o = lc.get(r.id);
      const name = o?.name?.trim() || r.name;
      const d = (r.details ?? {}) as Record<string, unknown>;
      const proc = Array.isArray(d.signatureProcedures) ? (d.signatureProcedures as string[]).join(', ') : '';
      const intro = (o?.intro || r.notes || '').replace(/\s+/g, ' ').slice(0, 260);
      const city = (r.addressJson as { city?: string } | null)?.city ?? '';
      const parts = [
        `[병원] ${name}`,
        r.cat ? `분야: ${r.cat}` : '',
        city ? `지역: ${city}` : '',
        typeof d.station === 'string' ? `위치: ${d.station}` : '',
        proc ? `대표시술: ${proc}` : '',
        Array.isArray(d.departments)
          ? `진료분야: ${(d.departments as Array<{ title?: string; items?: string[] }>)
              .map((dep) => `${dep.title ?? ''}(${(dep.items ?? []).join('·')})`)
              .join(' ; ')
              .slice(0, 300)}`
          : '',
        typeof d.hours === 'string' ? `진료시간: ${d.hours}` : '',
        typeof d.phone === 'string' ? `전화: ${d.phone}` : '',
        intro ? `소개: ${intro}` : '',
        `링크: /${locale}/clinics/${r.slug}`,
      ].filter(Boolean);
      return {
        text: parts.join(' | '),
        card: {
          kind: 'clinic' as const,
          title: name,
          href: `/${locale}/clinics/${r.slug}`,
          note: r.promo ? localizeKoLabel(r.promo, locale) : localizeKoLabel(proc.split(',')[0] ?? '', locale),
        },
      };
    });
  } catch {
    return [];
  }
}

/** 질문에 맞는 상품 근거 수집. */
async function findListings(
  q: string,
  locale: PublicLocale,
  units: Record<string, string>,
): Promise<Array<{ text: string; card: Card }>> {
  const cats = matchCats(q, LISTING_CATS).flatMap((m) => m.cats);
  try {
    const conds: SQL[] = [eq(partnerListings.status, 'approved')];
    if (cats.length) {
      conds.push(inArray(partnerListings.category, cats));
    } else {
      const p = `%${q.slice(0, 20)}%`;
      conds.push(or(ilike(partnerListings.title, p), ilike(partnerListings.description, p)) as SQL);
    }
    const rows = await db
      .select()
      .from(partnerListings)
      .where(and(...conds))
      .orderBy(sql`(${partnerListings.coverImageUrl} IS NULL)`, sql`${partnerListings.sortOrder} asc`)
      .limit(6);
    if (rows.length === 0) return [];

    const lc = new Map<string, { title: string | null; description: string | null }>();
    try {
      const l = await db
        .select({ listingId: partnerListingLocaleContent.listingId, title: partnerListingLocaleContent.title, description: partnerListingLocaleContent.description })
        .from(partnerListingLocaleContent)
        .where(and(inArray(partnerListingLocaleContent.listingId, rows.map((r) => r.id)), eq(partnerListingLocaleContent.locale, locale)));
      for (const x of l) lc.set(x.listingId, x);
    } catch { /* keep base */ }

    return rows.map((r) => {
      const o = lc.get(r.id);
      const title = o?.title?.trim() || r.title;
      const d = (r.details ?? {}) as Record<string, unknown>;
      const unit = r.priceWon
        ? localizePriceUnit(r.priceUnit, r.category, units as never, locale)
        : '';
      const price = r.priceWon
        ? `₩${r.priceWon.toLocaleString('ko-KR')}${unit ? ` / ${unit}` : ''}`
        : (typeof d.priceRange === 'string' ? localizeKoLabel(d.priceRange, locale) : '');
      const desc = (o?.description || r.description || '').replace(/\s+/g, ' ').slice(0, 220);
      const parts = [
        `[상품] ${title}`,
        `카테고리: ${r.category}${d.subType ? `/${d.subType}` : ''}`,
        r.locationLabel ? `위치: ${r.locationLabel}` : '',
        `가격: ${price}`,
        typeof d.durationDays === 'number' ? `일정: ${d.durationDays}일` : '',
        desc ? `설명: ${desc}` : '',
        `링크: /${locale}/listings/${r.slug}`,
      ].filter(Boolean);
      return {
        text: parts.join(' | '),
        card: {
          kind: 'listing' as const,
          title,
          href: `/${locale}/listings/${r.slug}`,
          note: price,
        },
      };
    });
  } catch {
    return [];
  }
}

async function callGemini(system: string, messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents,
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 900,
              // 사고 예산을 최소로 (0 은 이 모델에서 400) — 사고 파트는
              // 아래에서 thought 플래그로 걸러 답변에 섞이지 않게 한다.
              thinkingConfig: { thinkingBudget: 128 },
            },
          }),
        },
      );
      if (!res.ok) {
        if (res.status === 429 || res.status >= 500) continue;
        return null;
      }
      const j = await res.json();
      const parts = (j.candidates?.[0]?.content?.parts ?? []) as Array<{ text?: string; thought?: boolean }>;
      const text = parts.filter((p) => p.thought !== true).map((p) => p.text ?? '').join('');
      return text.trim() || null;
    } catch {
      /* retry once */
    }
  }
  return null;
}


/** SSE 스트리밍 — 토큰이 오는 대로 흘려보낸다. thought 파트는 제외. */
async function* streamGemini(
  system: string,
  messages: Array<{ role: string; content: string }>,
): AsyncGenerator<string> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return;
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse&key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 900,
          thinkingConfig: { thinkingBudget: 128 },
        },
      }),
    },
  );
  if (!res.ok || !res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split(String.fromCharCode(10));
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const j = JSON.parse(payload);
        const parts = (j.candidates?.[0]?.content?.parts ?? []) as Array<{ text?: string; thought?: boolean }>;
        const chunk = parts.filter((p) => p.thought !== true).map((p) => p.text ?? '').join('');
        if (chunk) yield chunk;
      } catch {
        /* partial JSON — skip */
      }
    }
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const locale: PublicLocale = isPublicLocale(body.locale) ? (body.locale as PublicLocale) : 'kr';
  const lastUser = [...body.messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  // 최근 2개 사용자 발화를 합쳐 검색 (문맥 유지)
  const recentUser = body.messages.filter((m) => m.role === 'user').slice(-2).map((m) => m.content).join(' ');
  const [clinics, listings] = await Promise.all([
    findHospitals(recentUser || lastUser, locale),
    findListings(recentUser || lastUser, locale, (await getDictionary(locale)).detail.units),
  ]);
  const evidence = [...clinics, ...listings];

  const system = `You are the GlowUpTour concierge assistant for a Korean medical-tourism and K-beauty marketplace.

Reply ONLY with the message shown to the user — no preamble, no self-checks, no meta commentary.
Write in ${LOCALE_LANGUAGE[locale]}, warm and concise (about 150 words), using short bullet lines when listing options.

GROUNDING RULES — critical:
- Recommend ONLY the clinics/products in the DATA block below. Never invent a clinic, price, address, phone or claim.
- Quote prices/hours/locations exactly as given. If the data does not contain what the user asks, say so plainly and offer to connect them with a human concierge.
- When you mention an item, refer to it by its exact name so the UI can link it.
- If the user asks who is good at a specific procedure (e.g. double-eyelid, rhinoplasty, contouring), match it against each clinic's 대표시술/진료분야 in the DATA and say which listed procedure line makes it relevant. Keep the clinics in the order given — the first entry is our featured partner.

MEDICAL SAFETY:
- You are not a doctor. Never diagnose, never prescribe, never promise or guarantee treatment results or recovery times.
- For anything clinical (suitability, risks, outcomes), say it must be decided at an in-person consultation with the clinic.
- Never describe any treatment as curing a disease.

If the user wants to book or needs a judgement call, invite them to send an inquiry (the UI shows a concierge button).

DATA (the only facts you may use):
${evidence.length ? evidence.map((e) => `- ${e.text}`).join('\n') : '(no matching records found)'}`;

  const pickCards = (text: string): Card[] => {
    const mentioned = evidence.filter((e) => text.includes(e.card.title));
    return (mentioned.length ? mentioned : evidence.slice(0, 3)).slice(0, 4).map((e) => e.card);
  };

  // ── 스트리밍 모드 (SSE) ──────────────────────────────────────────
  if (body.stream) {
    const encoder = new TextEncoder();
    const rs = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}

`));
        let full = '';
        try {
          for await (const chunk of streamGemini(system, body.messages)) {
            full += chunk;
            send({ delta: chunk });
          }
        } catch {
          /* fall through — 아래에서 빈 응답 처리 */
        }
        if (!full) {
          send({ error: 'ai_unavailable' });
        } else {
          send({ done: true, cards: pickCards(full) });
        }
        controller.close();
      },
    });
    return new NextResponse(rs, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  const text = await callGemini(system, body.messages);
  if (!text) {
    return NextResponse.json({ error: 'ai_unavailable' }, { status: 502 });
  }

  return NextResponse.json({ text, cards: pickCards(text) });
}
