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
import { hospitalRegistry } from '@/drizzle/schema/hospital-registry';
import { lodgingRegistry } from '@/drizzle/schema/lodging-registry';
import { foodRegistry } from '@/drizzle/schema/food-registry';
import { beautyRegistry } from '@/drizzle/schema/beauty-registry';
import { tourSpots } from '@/drizzle/schema/tour-spots';
import { parseTopic } from '@/lib/chat/topic-room';
import { KB_RULES, retrieveKnowledge } from '@/lib/ai/knowledge/retrieve';

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
  /** 상세 페이지 'AI 상담' 버튼에서 연 대화면 그 대상 — 'listing:<slug>' 또는 'topic:<종류>:<id>' (consult-buttons.tsx). 2026-10-14 */
  context: z.string().max(240).optional(),
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
      '울쎄라', '울세라', '써마지', '서마지', '울써마', 'ulthera', 'thermage',
      'double eyelid', 'rhinoplasty', 'nose job', 'facial contour', 'liposuction',
      // 눈·안면 세부 시술 (하안검·상안검 등은 성형외과 상담 대상)
      '하안검', '상안검', '안검', '안검하수', '눈밑', '눈꺼풀', '눈매', '눈수술', '눈썹거상', '거상', '안면거상', '눈밑처짐', '눈밑꺼짐', '다크서클',
      '이마', '팔자', '입술', '인중', '귀족', '턱끝', '무턱', '안면', '얼굴', '실리프팅', '가슴성형', '가슴확대', '복부', '허벅지', '팔뚝',
      'blepharoplasty', 'eyelid', 'brow lift', 'facelift', 'face lift', 'breast', 'jaw', 'chin', 'forehead', 'lip',
      '眼袋', '双眼皮', '隆鼻', '下眼睑', '上眼睑', '眼瞼', '二重', '鼻', 'блефаро', 'веки', 'ринопласт', 'mí mắt', 'nâng mũi',
    ],
    cat: 'plastic_surgery',
  },
  { words: ['피부', 'skin', 'derma', '皮肤', '皮膚', 'кожа', 'da liễu', '여드름', '흉터', '기미', '잡티', '색소', '미백', '모공', '토닝', '레이저', '제모', '문신제거', '스킨부스터', '리쥬란', '주름', '탄력', '피부관리', 'acne', 'scar', 'pigment', 'laser', 'whitening', 'pore', 'wrinkle', '痘', '色斑', '美白', '脱毛', 'ニキビ', 'シミ', '脱毛', 'акне', 'пигмент', 'mụn', 'nám'], cat: 'dermatology' },
  // '矯正' 단독은 縮毛矯正(헤어 매직)과 겹쳐서 치아 교정 표기(歯列矯正·矯正歯科)만 (2026-10-21)
  { words: ['치과', '임플란트', 'dental', 'implant', '牙', '歯', 'стомат', 'nha khoa', '치아', '교정', '라미네이트', '치아미백', '신경치료', '사랑니', '크라운', '틀니', '충치', '잇몸', 'teeth', 'tooth', 'orthodont', 'veneer', 'braces', '歯列矯正', '矯正歯科', '正畸', 'зуб', 'răng'], cat: 'dental' },
  { words: ['안과', '라식', '라섹', 'eye', 'lasik', 'lasek', '眼', 'глаз', 'mắt', '스마일라식', '렌즈삽입', 'icl', '백내장', '노안', '녹내장', '시력교정', '드림렌즈', '안구건조', '시력', 'cataract', 'presbyopia', 'glaucoma', 'vision', '近视', '白内障', '老花', '視力', 'катаракт', 'зрени', 'cận thị', 'đục thủy tinh thể'], cat: 'ophthalmology' },
  { words: ['모발', '탈모', '모발이식', 'hair transplant', '植发', '植毛', 'волос', 'tóc', '헤어라인', '이마축소', '두피', 'hairline', 'scalp', '脱发', '薄毛', 'rụng tóc'], cat: 'hair' },
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
  // 시술명으로 물어도 살롱 상품이 근거에 들어가게 — 펌·염색·매직(縮毛矯正)·커트 등 (2026-10-21, K뷰티 가이드 반영)
  { words: ['헤어', '미용실', '헤어샵', '펌', '염색', '탈색', '매직', '커트', '발레아쥬', 'hair salon', 'haircut', 'perm', 'hair color', 'balayage', 'straightening', 'ヘア', '美容室', '美容院', 'パーマ', 'カラー', '縮毛矯正', 'カット', 'ブリーチ', '美发', '理发', '烫发', '染发', '漂发', 'волосы', 'парикмахер'], cats: ['hair'] },
  { words: ['메이크업', 'makeup', 'make-up', 'メイク', '化妆', 'макияж'], cats: ['makeup'] },
  { words: ['네일', '젤네일', '패디큐어', 'nail', 'gel', 'pedicure', 'manicure', 'ネイル', 'ジェル', '美甲', '光疗甲', 'маникюр'], cats: ['nail'] },
  { words: ['반영구', '눈썹', 'pmu', 'eyebrow', 'microblading', 'アートメイク', '半永久', '雾眉', '纹眉'], cats: ['pmu'] },
  { words: ['사진', '스튜디오', 'photo', 'studio', '写真', 'фото'], cats: ['photo_studio'] },
  { words: ['케이팝', 'k팝', 'kpop', 'k-pop', 'アイドル'], cats: ['kpop_tour'] },
];

function matchCats<T extends { words: string[] }>(q: string, table: T[]): T[] {
  const lower = q.toLowerCase();
  return table.filter((m) => m.words.some((w) => lower.includes(w.toLowerCase())));
}

type Card = { kind: 'clinic' | 'listing'; title: string; href: string; note: string };

/** 카테고리 단어가 없어도 수술·시술 문의면 성형외과로 본다 (하안검처럼 목록에 없는 시술명 대비). */
const MEDICAL_HINT = /수술|시술|성형|병원|의원|surgery|procedure|clinic|hospital|手术|整形|手術|операц|клиник|phẫu thuật|thẩm mỹ/i;

function inferFallbackCat(q: string): string | null {
  const cats = matchCats(q, HOSPITAL_CATS).map((m) => m.cat);
  if (cats[0]) return cats[0];
  return MEDICAL_HINT.test(q) ? 'plastic_surgery' : null;
}

/** 질문에 맞는 병원 근거 수집 — 카테고리 매칭 우선, 없으면 이름 검색. */
/**
 * 시술 동의어 그룹 — 한 단어가 걸리면 같은 그룹 전체로 검색을 넓힌다.
 * 병원마다 표기가 달라서(울써마 = 울쎄라+써마지 합성어처럼) 사용자가 쓴
 * 말과 DB 표기가 어긋나는 경우를 잡는다.
 */
const PROCEDURE_SYNONYMS: string[][] = [
  // 리프팅 장비 — '울써마'는 울쎄라+써마지 합성 표기
  ['울써마', '울쎄라', '울세라', '써마지', '서마지', '울쎄라리프팅', 'ulthera', 'thermage', 'ultherapy'],
  // 눈성형
  ['쌍꺼풀', '쌍커풀', '눈성형', 'double eyelid'],
  ['트임', '앞트임', '뒤트임', '눈매교정'],
  // 코성형
  ['코성형', '코수술', '콧대', '코끝', 'rhinoplasty', 'nose'],
  // 윤곽
  ['윤곽', '양악', '광대', '사각턱', 'contour', 'facial contour'],
  // 체형
  ['지방흡입', '체형', '바디라인', 'liposuction'],
  // 주사 시술
  ['보톡스', '필러', '쁘띠', 'botox', 'filler'],
  ['지방이식', '나노지방이식', 'fat graft'],
];

/** 토큰을 동의어 그룹으로 확장 (중복 제거, 최대 10개). */
function expandSynonyms(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const tk of tokens) {
    const lower = tk.toLowerCase();
    for (const group of PROCEDURE_SYNONYMS) {
      if (group.some((w) => lower.includes(w.toLowerCase()) || w.toLowerCase().includes(lower))) {
        group.forEach((w) => out.add(w));
      }
    }
  }
  return [...out].slice(0, 10);
}

/** '잘하는', '병원' 같은 군더더기를 뺀 검색 토큰. */
function procedureTokens(q: string): string[] {
  const STOP = /잘하는|잘하|추천|알려줘|어디|어때|병원|의원|클리닉|좋은|해줘|해주|찾아|please|recommend|clinic|hospital|good|best|for|the|a|an/gi;
  const raw = q
    .replace(STOP, ' ')
    .split(/[s,·.?!·、，。]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 4);
  return expandSynonyms(raw);
}

async function findHospitals(q: string, locale: PublicLocale): Promise<Array<{ text: string; card: Card; fallback?: boolean; focus?: boolean }>> {
  const cats = matchCats(q, HOSPITAL_CATS).map((m) => m.cat);
  try {
    // 질문에 병원 이름(기본 또는 언어별 이름)이 그대로 들어 있으면 그 병원을 맨 앞에 — '○○에 대해 알려 주세요' (2026-10-14)
    // 과(카테고리) 검색은 순서 상위 6곳만 가져와서, 순서가 뒤인 병원은 이름을 말해도 빠지던 문제.
    const namedRaw = await db
      .select({
        id: hospitals.id, name: hospitals.name, slug: hospitals.slug,
        details: hospitals.details, notes: hospitals.notes,
        addressJson: hospitals.addressJson,
        promo: categoryListings.promoLabel, cat: categoryListings.categoryKey,
      })
      .from(hospitals)
      .leftJoin(categoryListings, eq(categoryListings.hospitalId, hospitals.id))
      .where(and(
        eq(hospitals.isActiveForMatching, true),
        or(
          sql`${q} ILIKE '%' || "hospitals"."name" || '%'`,
          sql`exists (select 1 from hospital_locale_content l where l.hospital_id = "hospitals"."id" and length(coalesce(l.name, '')) >= 2 and ${q} ILIKE '%' || l.name || '%')`,
        ) as SQL,
      ))
      .limit(6);
    const namedIds = new Set<string>();
    const named = namedRaw.filter((r) => (namedIds.has(r.id) ? false : (namedIds.add(r.id), true))).slice(0, 3);
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
    if (named.length) {
      const rest = rows.filter((r) => !namedIds.has(r.id));
      rows.length = 0;
      rows.push(...(named as Array<(typeof rows)[number]>), ...rest);
    }
    // 정확히 맞는 병원이 없으면 "없다"고 끝내지 않고, 해당 과의 글로우 인증 병원 1~5위(마스터 순서)를 근거로 준다.
    let fallbackCat: string | null = null;
    if (rows.length === 0) {
      fallbackCat = inferFallbackCat(q);
      if (!fallbackCat) return [];
      const top = await db
        .select({
          id: hospitals.id, name: hospitals.name, slug: hospitals.slug,
          details: hospitals.details, notes: hospitals.notes,
          addressJson: hospitals.addressJson,
          promo: categoryListings.promoLabel, cat: categoryListings.categoryKey,
        })
        .from(categoryListings)
        .innerJoin(hospitals, eq(categoryListings.hospitalId, hospitals.id))
        .where(and(eq(categoryListings.categoryKey, fallbackCat), eq(hospitals.isActiveForMatching, true), eq(hospitals.countryCode, 'KR')))
        .orderBy(sql`${hospitals.sortOrder} asc`, sql`${categoryListings.sortOrder} asc`, sql`${hospitals.name} asc`)
        .limit(5);
      for (const r of top) rows.push(r as (typeof rows)[number]);
      if (rows.length === 0) return [];
    }

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
      const focus = namedIds.has(r.id);
      return {
        fallback: Boolean(fallbackCat),
        focus,
        text: (focus ? '[질문에 나온 병원] ' : fallbackCat ? '[글로우 인증 추천] ' : '') + parts.join(' | '),
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
): Promise<Array<{ text: string; card: Card; focus?: boolean }>> {
  const cats = matchCats(q, LISTING_CATS).flatMap((m) => m.cats);
  try {
    // 질문에 상품 이름이 그대로 있으면 맨 앞에 (병원과 같은 이유, 2026-10-14)
    const named = await db.select().from(partnerListings)
      .where(and(eq(partnerListings.status, 'approved'), sql`length(${partnerListings.title}) >= 2 and ${q} ILIKE '%' || ${partnerListings.title} || '%'`))
      .limit(3);
    const namedIds = new Set(named.map((r) => r.id));
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
      .limit(6)
      .then((rs) => [...named, ...rs.filter((r) => !namedIds.has(r.id))].slice(0, 6));
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
      // 호텔은 요금을 공개하지 않는다 — 설명 안의 "1박 ₩…" 도 지운다 (문의 후 견적, 2026-10-11)
      const isHotel = r.category === 'hotel';
      const priceText = isHotel ? '요금 미표시 — 예약 문의 후 컨시어지가 안내' : price;
      const descRaw = (o?.description || r.description || '').replace(/\s+/g, ' ').slice(0, 220);
      const desc = isHotel ? descRaw.replace(/(1박\s*)?₩\s?[\d,]+(\s?[~\-–]\s?₩?[\d,]+)?\.?/g, '').replace(/\s{2,}/g, ' ').trim() : descRaw;
      const parts = [
        `[상품] ${title}`,
        `카테고리: ${r.category}${d.subType ? `/${d.subType}` : ''}`,
        r.locationLabel ? `위치: ${r.locationLabel}` : '',
        `가격: ${priceText}`,
        typeof d.durationDays === 'number' ? `일정: ${d.durationDays}일` : '',
        desc ? `설명: ${desc}` : '',
        `링크: /${locale}/listings/${r.slug}`,
      ].filter(Boolean);
      return {
        focus: namedIds.has(r.id),
        text: (namedIds.has(r.id) ? '[질문에 나온 상품] ' : '') + parts.join(' | '),
        card: {
          kind: 'listing' as const,
          title,
          href: `/${locale}/listings/${r.slug}`,
          note: priceText,
        },
      };
    });
  } catch {
    return [];
  }
}

/**
 * 'AI 상담' 버튼 문맥 → 근거. 병원·상품은 이름을 돌려줘 검색어 앞에 붙이고(위 이름 일치 검색이 맨 앞으로 올림),
 * 레지스트리 병원·숙박·음식·미용·관광지는 그 행을 직접 근거로 만든다(큐레이션 DB 에 없어서).
 */
async function contextFocus(context: string | undefined, locale: PublicLocale): Promise<{ name: string | null; evidence: { text: string; card: Card; focus: boolean } | null }> {
  if (!context) return { name: null, evidence: null };
  try {
    if (context.startsWith('listing:')) {
      const [l] = await db.select({ title: partnerListings.title }).from(partnerListings).where(eq(partnerListings.slug, context.slice(8))).limit(1);
      return { name: l?.title ?? null, evidence: null };
    }
    const t = context.startsWith('topic:') ? parseTopic(context.slice(6)) : null;
    if (!t) return { name: null, evidence: null };
    const ev = (kind: Card['kind'], title: string, href: string, parts: Array<string | null | undefined>) => ({
      text: ['[지금 보고 있는 곳] ' + title, ...parts.filter(Boolean), `링크: ${href}`].join(' | '),
      card: { kind, title, href, note: '' },
      focus: true,
    });
    switch (t.kind) {
      case 'clinic': {
        const [h] = await db.select({ name: hospitals.name }).from(hospitals).where(eq(hospitals.slug, t.id)).limit(1);
        return { name: h?.name ?? null, evidence: null };
      }
      case 'rclinic': {
        const [r] = await db.select().from(hospitalRegistry).where(eq(hospitalRegistry.ykiho, t.id)).limit(1);
        if (!r) break;
        const deps = ((r.details as { departments?: Array<{ name?: string }> } | null)?.departments ?? []).map((d) => d.name).filter(Boolean).join('·');
        return { name: r.name, evidence: ev('clinic', r.name, `/${locale}/clinics/r/${encodeURIComponent(r.ykiho)}`, [
          r.clName ? `종별: ${r.clName}` : null, deps ? `진료과: ${deps}` : null, r.addr ? `주소: ${r.addr}` : null,
          r.tel ? `전화: ${r.tel}` : null, r.drTotal ? `의사 수: ${r.drTotal}` : null, r.foreignLicensed ? '외국인환자 유치 등록 기관' : null,
          '출처: 건강보험심사평가원 공개 정보(글로우업투어 제휴 상세 정보는 없음)',
        ]) };
      }
      case 'stay':
      case 'eat':
      case 'shop': {
        const tbl = t.kind === 'stay' ? lodgingRegistry : t.kind === 'eat' ? foodRegistry : beautyRegistry;
        const [r] = await db.select({ name: tbl.name, bizType: tbl.bizType, addrRoad: tbl.addrRoad, addrLot: tbl.addrLot, tel: tbl.tel, statusName: tbl.statusName })
          .from(tbl).where(eq(tbl.mgtNo, t.id)).limit(1);
        if (!r) break;
        const path = t.kind === 'stay' ? 'stays' : t.kind === 'eat' ? 'eats' : 'shops';
        return { name: r.name, evidence: ev('listing', r.name, `/${locale}/${path}/r/${encodeURIComponent(t.id)}`, [
          r.bizType ? `업종: ${r.bizType}` : null, (r.addrRoad || r.addrLot) ? `주소: ${r.addrRoad || r.addrLot}` : null,
          r.tel ? `전화: ${r.tel}` : null, r.statusName ? `영업 상태: ${r.statusName}` : null,
          '출처: 지자체 인허가 공개 정보(가격·메뉴 등 상세는 없음 — 예약·문의 안내)',
        ]) };
      }
      case 'spot': {
        const [r] = await db.select().from(tourSpots).where(eq(tourSpots.contentId, t.id)).limit(1);
        if (!r) break;
        const i18n = (r.i18n as Record<string, { title?: string; overview?: string }> | null)?.[locale === 'kr' ? 'ko' : locale];
        return { name: r.title, evidence: ev('listing', i18n?.title || r.title, `/${locale}/attractions/${encodeURIComponent(r.contentId)}`, [
          r.location ? `위치: ${r.location}` : null, i18n?.overview ? `소개: ${i18n.overview.replace(/\s+/g, ' ').slice(0, 260)}` : null,
          '출처: 한국관광공사 관광사진 정보',
        ]) };
      }
      default:
        break;
    }
  } catch { /* 문맥 없이 답한다 */ }
  return { name: null, evidence: null };
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
              maxOutputTokens: 1200,
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
          maxOutputTokens: 1200,
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

  // 최근 2개 사용자 발화를 합쳐 검색 (문맥 유지). 상세 페이지 버튼 문맥이 있으면 그 이름을 앞에 붙여 후속 질문에도 유지.
  const focusCtx = await contextFocus(body.context, locale);
  const recentUser = [focusCtx.name, ...body.messages.filter((m) => m.role === 'user').slice(-2).map((m) => m.content)].filter(Boolean).join(' ');
  // 의료 용어·급여/비급여·시술 가이드(lib/ai/knowledge)에서 질문과 관련된 설명을 고른다 — DB 근거와 별개의 일반 지식 (2026-10-21)
  const kbQuestion = body.messages.filter((m) => m.role === 'user').slice(-2).map((m) => m.content).join(' ');
  const kb = await retrieveKnowledge(kbQuestion, {
    cats: [...matchCats(kbQuestion, HOSPITAL_CATS).map((m) => m.cat), ...matchCats(kbQuestion, LISTING_CATS).flatMap((m) => m.cats)],
  });
  const [clinicsRaw, listings] = await Promise.all([
    findHospitals(recentUser || lastUser, locale),
    findListings(recentUser || lastUser, locale, (await getDictionary(locale)).detail.units),
  ]);
  const clinics = clinicsRaw;
  const focusEvidence = [
    ...(focusCtx.evidence ? [focusCtx.evidence] : []),
    ...clinics.filter((c) => c.focus),
    ...listings.filter((l) => l.focus),
  ];
  const evidence = [...focusEvidence, ...clinics.filter((c) => !c.focus), ...listings.filter((l) => !l.focus)];
  const fallbackMode = focusEvidence.length === 0 && clinics.some((c) => c.fallback);

  const system = `You are the GlowUpTour concierge assistant for a Korean medical-tourism and K-beauty marketplace.

Reply ONLY with the message shown to the user — no preamble, no self-checks, no meta commentary.
Write in ${LOCALE_LANGUAGE[locale]}, warm and concise (about 150 words; up to 230 when KNOWLEDGE below explains the procedure or term the user asked about), using short bullet lines when listing options.

GROUNDING RULES — critical:
- Recommend ONLY the clinics/products in the DATA block below. Never invent a clinic, price, address, phone or claim.
- Quote prices/hours/locations exactly as given.
- NEVER tell the user that we have no information, no data, or that something is "not in our database". If no clinic in DATA lists the exact procedure asked about (e.g. lower blepharoplasty / 하안검), present the DATA clinics as our certified (글로우 인증) clinics for that specialty — in the given order, the first is ranked #1 — say the exact procedure and suitability are confirmed at the clinic consultation, and invite the user to send an inquiry so a concierge can arrange it (the UI shows an inquiry button).
- When you mention an item, refer to it by its exact name so the UI can link it.
- If the user asks who is good at a specific procedure (e.g. double-eyelid, rhinoplasty, contouring), match it against each clinic's 대표시술/진료분야 in the DATA and say which listed procedure line makes it relevant. Keep the clinics in the order given — the first entry is our featured partner.

MEDICAL SAFETY:
- You are not a doctor. Never diagnose, never prescribe, never promise or guarantee treatment results or recovery times.
- For anything clinical (suitability, risks, outcomes), say it must be decided at an in-person consultation with the clinic.
- Never describe any treatment as curing a disease.
- Describe clinics only with facts present in DATA. Do not add evaluative or promotional claims that are not in DATA (e.g. "highly skilled", "rich experience", "safe", "best") — Korean medical-advertising rules forbid them.

If the user wants to book or needs a judgement call, invite them to send an inquiry (the UI shows a concierge button).

CONSULTATION RULES (Korean medical-tourism practice):
${KB_RULES}

${kb.hit ? `KNOWLEDGE (GlowUpTour internal guide on Korean medical terms, 급여/비급여 and procedures — general reference, NOT about any specific clinic):
- Use it to explain what the procedure/term is and who it generally suits, 시술 vs 수술, anesthesia, typical downtime and recommended stay, pricing units (shots/cc/units, package contents), what to confirm before booking, and how 급여/비급여 works. Answer the user's actual question with these facts first, then connect to the DATA clinics.
- Never present KNOWLEDGE as a specific clinic's or shop's offering, price or result. Clinic/product facts and their prices come only from DATA. A price range written in KNOWLEDGE is a general Korean market range from our guide: cite it only as such ("일반적인 시세" / "typical market range"), exactly as written (never rounded or invented), and when a DATA entry has a price, give the DATA price for that entry.
- Each line below is "[chapter › section] term: fields". Ignore lines unrelated to the question.
${kb.text}

` : ''}${focusEvidence.length ? `FOCUS: The user is asking about the DATA entries marked [지금 보고 있는 곳] / [질문에 나온 병원] / [질문에 나온 상품] (they appear first). Answer about that place first and in the most detail, using only its DATA line. Do not switch the answer to other clinics or products unless the user asks for alternatives; at most mention that similar options exist. If a detail is missing for it (price, menu, procedure), say the concierge can confirm it and invite an inquiry or a chat with a concierge.

` : ''}DATA (the only clinic/product facts you may use):
${fallbackMode ? '(No clinic lists this exact procedure. The following are our certified clinics for the inferred specialty, ranked 1-5 — recommend them in this order and suggest an inquiry.)\n' : ''}${evidence.length ? evidence.map((e) => `- ${e.text}`).join('\n') : '(no matching records found — invite the user to send an inquiry so a concierge can help; do not say the database is empty)'}`;

  const pickCards = (text: string): Card[] => {
    if (focusEvidence.length) {
      const others = evidence.filter((e) => !focusEvidence.includes(e) && text.includes(e.card.title));
      return [...focusEvidence, ...others].slice(0, 4).map((e) => e.card);
    }
    const mentioned = evidence.filter((e) => text.includes(e.card.title));
    // 폴백(인증 병원 추천)일 때는 모델이 이름을 안 불러도 1~5위 카드를 전부 보여준다
    if (fallbackMode) return clinics.slice(0, 5).map((e) => e.card);
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
