import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { PublicLocale } from '@/lib/i18n/locales';
import { mdToHtml } from './md-lite';

/**
 * AI 여행 플래너 — 자유여행·패키지여행·연수패키지 질문에 하루 단위 일정을 짜 준다.
 *
 *  근거(DATA)는 전부 우리 DB: 여행상품(partner_listings travel_package/kpop_tour), 글로우 인증 병원(hospitals),
 *  뷰티샵·호텔·맛집(partner_listings 승인), 관광지(tour_spots 실좌표). 모델은 DATA 밖의 장소·가격을 지어내지 못하게 막는다.
 *  의료광고 규정: 진단·효과 보장·최상급 표현 금지 (시스템 프롬프트에 명시).
 */
export type TripMsg = { role: 'user' | 'assistant'; content: string };
export type TripType = 'free' | 'package' | 'training';

const LOCALE_LANGUAGE: Record<PublicLocale, string> = {
  kr: 'Korean', en: 'English', zh: 'Simplified Chinese', ja: 'Japanese', ru: 'Russian', vi: 'Vietnamese',
};

export function detectTripType(text: string): TripType | null {
  const s = text.toLowerCase();
  if (/연수|세미나|견학|training|seminar|研修|培训|стажиров|đào tạo/.test(s)) return 'training';
  if (/패키지|package|パッケージ|套餐|跟团|пакет|gói/.test(s)) return 'package';
  if (/자유|free|個人|自由|самостоя|tự túc|tự do/.test(s)) return 'free';
  return null;
}

type Row = Record<string, unknown>;
const won = (v: unknown, unit: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `₩${n.toLocaleString('ko-KR')}${unit ? `/${String(unit)}` : ''}` : '가격 문의';
};

/** DATA 블록 — 모델이 쓸 수 있는 유일한 사실. */
export async function buildTripGrounding(locale: PublicLocale): Promise<string> {
  const lines: string[] = [];
  try {
    const travel = (await db.execute(sql`
      select coalesce(nullif(plc.title,''), l.title) as title, l.slug, l.category, l.location_label, l.price_won, l.price_unit,
             l.details->>'subType' as sub, l.details->>'durationDays' as days, left(coalesce(l.description,''), 140) as description
        from partner_listings l left join partner_listing_locale_content plc on plc.listing_id = l.id and plc.locale = ${locale}
       where l.status = 'approved' and l.category in ('travel_package','kpop_tour')
       order by l.sort_order nulls last, l.title limit 40`)) as unknown as Row[];
    for (const r of travel) {
      lines.push(`[여행상품/${r.category === 'kpop_tour' ? 'kpop' : String(r.sub ?? 'free')}] ${r.title} | 위치: ${r.location_label ?? ''} | 가격: ${won(r.price_won, r.price_unit)}${r.days ? ` | 일정: ${r.days}일` : ''}${r.description ? ` | ${String(r.description).replace(/\s+/g, ' ')}` : ''} | 링크: /${locale}/listings/${r.slug}`);
    }
    const hosp = (await db.execute(sql`
      select coalesce(nullif(hlc.name,''), h.name) as name, h.slug, h.primary_categories::text as cats, h.address_json->>'city' as city,
             h.details->>'station' as station,
             (select string_agg(x, ', ') from jsonb_array_elements_text(case when jsonb_typeof(h.details->'signatureProcedures') = 'array' then h.details->'signatureProcedures' else '[]'::jsonb end) x) as procs
        from hospitals h left join hospital_locale_content hlc on hlc.hospital_id = h.id and hlc.locale = ${locale}
       where h.country_code = 'KR' and h.is_active_for_matching = true
       order by h.sort_order nulls last, h.name limit 40`)) as unknown as Row[];
    for (const r of hosp) {
      lines.push(`[병원] ${r.name} | 분야: ${String(r.cats ?? '').replace(/[\[\]"]/g, '')} | 지역: ${r.city ?? ''}${r.station ? ` | 위치: ${r.station}` : ''}${r.procs ? ` | 대표시술: ${String(r.procs).slice(0, 120)}` : ''} | 링크: /${locale}/clinics/${r.slug}`);
    }
    const places = (await db.execute(sql`
      select coalesce(nullif(plc.title,''), l.title) as title, l.slug, l.category, l.location_label, l.price_won, l.price_unit, l.details->>'priceRange' as pr
        from partner_listings l left join partner_listing_locale_content plc on plc.listing_id = l.id and plc.locale = ${locale}
       where l.status = 'approved' and (
             l.category in ('hair','makeup','nail','pmu','personal_color','photo_studio','food','restaurant')
          or (l.category = 'hotel' and (l.price_won > 0 or coalesce(l.sort_order, 0) < 500)))
       order by (l.category = 'hotel'), l.featured desc, l.sort_order nulls last, l.title limit 60`)) as unknown as Row[];
    const label: Record<string, string> = { hair: '헤어샵', makeup: '메이크업샵', nail: '네일', pmu: '반영구', personal_color: '퍼스널컬러', photo_studio: '사진 스튜디오', food: '맛집', restaurant: '맛집', hotel: '호텔' };
    for (const r of places) {
      const price = Number(r.price_won) > 0 ? won(r.price_won, r.price_unit) : (r.pr ? String(r.pr) : '가격 문의');
      lines.push(`[${label[String(r.category)] ?? r.category}] ${r.title} | 위치: ${r.location_label ?? ''} | 가격: ${price} | 링크: /${locale}/listings/${r.slug}`);
    }
    const spots = (await db.execute(sql`
      select title, sido_name, sggu_name, category_keys::text as cats from tour_spots
       where geo_source = 'kakao_kw' and sido_name in ('서울','부산','제주','경기','강원')
       order by (sido_name = '서울') desc, modified_time desc nulls last limit 50`)) as unknown as Row[];
    for (const r of spots) {
      lines.push(`[관광지] ${r.title} | ${r.sido_name ?? ''} ${r.sggu_name ?? ''} | ${String(r.cats ?? '').replace(/[{}"]/g, '')} | 링크: /${locale}/attractions/all?q=${encodeURIComponent(String(r.title))}`);
    }
  } catch {
    /* 부분 실패해도 있는 근거로 진행 */
  }
  return lines.length ? lines.join('\n') : '(no records)';
}

export function buildTripSystem(locale: PublicLocale, data: string): string {
  return `You are the GlowUpTour AI trip planner for a Korean medical-tourism and K-beauty marketplace. The user wants a travel itinerary: a free (independent) trip, a package tour, or a professional training program.

OUTPUT: Reply ONLY with the message shown to the user, written in ${LOCALE_LANGUAGE[locale]}, in simple Markdown (## headings, - bullets, **bold**, [title](/path) links). No preamble, no meta commentary. Keep it under about 650 words. Translate section headings into ${LOCALE_LANGUAGE[locale]}.

HOW TO PLAN:
1. If the trip style, length (nights), or party size is missing, ask for it in one short line — but STILL give a draft itinerary using sensible defaults (Seoul, 2 nights, 1–2 people) so the user gets value right away.
2. Build a day-by-day schedule: "## Day 1 — <theme>" then bullets for morning / afternoon / evening. Put treatments early in the trip and recovery-friendly activities (light sightseeing, food, spa, night views) afterwards; keep the last day light before departure.
3. Choose clinics, beauty shops, hotels, restaurants and attractions ONLY from DATA. Name each by its exact title and add its link as [title](path). Never invent a place, price, address, phone or opening hour. If DATA lacks something the user asks for, say so and suggest the concierge.
4. Prices: quote only prices present in DATA, with their unit. Where DATA says "가격 문의", write the equivalent of "price on request". Add a short "## 예상 비용" section listing the priced items you used; never sum items whose price is on request.
5. For package or training requests, anchor the plan on the matching [여행상품/package] or [여행상품/training] product in DATA and expand it into days. For free trips, mix clinics, shops, food and attractions. For K-pop interest use [여행상품/kpop].
6. End with "## 다음 단계": (a) sign up to receive this itinerary by email, (b) the GlowUpTour concierge confirms bookings, prices and treatment availability.

MEDICAL SAFETY (Korean Medical Service Act): You are not a doctor. Never diagnose, prescribe, promise or guarantee results or recovery times, and never call any clinic "the best" or "No.1". Say suitability and risks are decided at an in-person consultation with the clinic.

DATA (the only facts you may use):
${data}`;
}

/** Gemini SSE 스트림 (공개 챗과 같은 모델·키). thought 파트는 제외. */
export async function* streamGeminiText(system: string, messages: TripMsg[], maxOutputTokens = 2000): AsyncGenerator<string> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return;
  const contents = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse&key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.5, maxOutputTokens, thinkingConfig: { thinkingBudget: 256 } } }),
  });
  if (!res.ok || !res.body) return;
  const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const j = JSON.parse(payload) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> };
        const chunk = (j.candidates?.[0]?.content?.parts ?? []).filter((p) => p.thought !== true).map((p) => p.text ?? '').join('');
        if (chunk) yield chunk;
      } catch { /* partial JSON */ }
    }
  }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.glowuptour.com';

export function buildTripEmailHtml(
  planMd: string,
  t: { title: string; emailIntro: string; disclaimer: string },
  locale: PublicLocale,
  opts: { extraHtml?: string; ctaHref?: string; ctaLabel?: string } = {},
): string {
  const body = mdToHtml(planMd)
    // 상대 링크는 절대 URL 로
    .replace(/href="\//g, `href="${SITE_URL}/`);
  const cta = opts.ctaHref ?? `${SITE_URL}/${locale}/ai-trip`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f7f7f7;font-family:'Helvetica Neue',Arial,'Apple SD Gothic Neo',sans-serif;color:#222;">
  <div style="max-width:600px;margin:0 auto;padding:28px 16px;">
    <div style="text-align:center;padding:10px 0 18px;"><span style="font-size:22px;font-weight:800;color:#ff385c;letter-spacing:-0.5px;">glow-up</span></div>
    <div style="background:#fff;border:1px solid #ebebeb;border-radius:16px;padding:26px 24px;">
      <h1 style="font-size:19px;margin:0 0 6px;">${t.title}</h1>
      <p style="margin:0 0 16px;line-height:1.6;color:#3f3f3f;font-size:14px;">${t.emailIntro}</p>
      ${opts.extraHtml ?? ''}
      <style>.plan h2{font-size:16px;margin:18px 0 6px;color:#222}.plan h3{font-size:14px;margin:14px 0 4px}.plan h4{font-size:13px;margin:12px 0 4px}.plan p{margin:6px 0;line-height:1.6;font-size:14px}.plan ul,.plan ol{margin:4px 0 8px;padding-left:20px}.plan li{margin:3px 0;line-height:1.55;font-size:14px}.plan a{color:#ff385c;text-decoration:none;font-weight:600}</style>
      <div class="plan">${body}</div>
      <hr style="border:none;border-top:1px solid #ebebeb;margin:18px 0;" />
      <p style="font-size:12px;color:#6a6a6a;line-height:1.6;margin:0;">${t.disclaimer}</p>
      <div style="text-align:center;margin-top:24px;"><a href="${cta}" style="display:inline-block;background:#ff385c;color:#fff;border-radius:10px;padding:12px 26px;font-weight:700;font-size:15px;text-decoration:none;">${opts.ctaLabel ?? 'GlowUpTour'}</a></div>
    </div>
    <p style="text-align:center;font-size:11px;color:#9a9a9a;margin:16px 0 0;">© GlowUpTour · glowuptour.com</p>
  </div></body></html>`;
}

/** Resend REST 발송. 키 없으면 false (호출부가 안내 분기). */
export async function sendTripEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM ?? 'GlowUpTour <noreply@glowuptour.com>', to: [to], subject, html }),
    });
    return res.ok;
  } catch { return false; }
}
