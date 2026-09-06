import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { createSupabaseServiceClient } from '@/lib/auth/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 글로우 인증 호텔 게시물(커버 없음) 사진 채우기 — 운영자 승인(2026-09-07).
 *
 *  ① 브랜드·호텔 공식 페이지의 대표 사진: 상호로 브랜드 도메인을 추정(BRAND_DOMAINS)하거나 관광공사 홈페이지 힌트를 쓰고,
 *     카카오 웹 검색 결과 중 그 도메인의 해당 호텔 페이지를 골라 og:image → 없으면 본문 큰 이미지(src/data-src/srcset/CSS url)
 *  ② 웹 공개 이미지(카카오 이미지 검색 '외관'·'로비'·'전경'): 원문 글 제목에 호텔 이름이 있고, 브랜드 도메인 글이면 우선
 *  검증: jpeg/webp, 가로 ≥ 800px, 가로세로비 1.2~2.4(가로 사진). 로고 PNG·세로 사진·음식 클로즈업 계열은 배제(비율).
 *  저장: listing-images 스토리지 + details.imageSource(출처). 호출: Authorization: Bearer <IMAGE_JOB_SECRET>, body {limit, only?}
 *
 *  1·2차 시도(2026-09-07)의 교훈: 취업·딜 사이트 로고, 기사 속 애프터눈티·스테이크 사진이 커버로 붙음 → 브랜드 도메인 우선 + 외관 키워드.
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
/** 상호 키워드 → 공식 도메인 (해당 도메인 페이지만 '공식'으로 인정). */
const BRAND_DOMAINS: Array<[RegExp, string[]]> = [
  [/앰배서더|앰버서더|노보텔|이비스|머큐어|소피텔|풀만|그랜드머큐어/, ['ambatel.com', 'all.accor.com', 'accor.com']],
  [/메리어트|메리엇|코트야드|포포인츠|쉐라톤|웨스틴|알로프트|목시|AC호텔|JW|리츠칼튼|르 메르디앙|페어필드/i, ['marriott.com']],
  [/하얏트|안다즈|그랜드 하얏트/, ['hyatt.com']],
  [/힐튼|콘래드|힐튼 가든/, ['hilton.com']],
  [/홀리데이 인|보코|인터컨티넨탈|크라운 플라자|크라운플라자/, ['ihg.com']],
  [/롯데|시그니엘|L7/i, ['lottehotel.com']],
  [/신라스테이/, ['shillastay.com']],
  [/신라호텔|서울신라/, ['shillahotels.com']],
  [/조선|웨스틴 조선|그래비티/, ['josunhotel.com']],
  [/파르나스|나인트리/, ['parnashotel.com', 'ninetreehotels.com']],
  [/글래드/, ['glad-hotels.com']],
  [/스카이파크/, ['skyparkhotel.com']],
  [/토요코인/, ['toyoko-inn.com']],
  [/도미인/, ['hotespa.net', 'dormy-hotels.com']],
  [/소테츠/, ['sotetsu-hotels.com']],
  [/트레블로지/, ['travelodgehotels.asia']],
  [/베스트 ?웨스턴/, ['bestwestern.co.kr', 'bestwestern.com']],
  [/라마다|윈덤/, ['wyndhamhotels.com', 'ramada.co.kr']],
  [/켄싱턴/, ['kensington.co.kr']],
  [/프레이저/, ['frasershospitality.com']],
  [/몬드리안/, ['mondrianhotels.com', 'ennismore.com']],
  [/페어몬트/, ['fairmont.com']],
  [/포시즌스/, ['fourseasons.com']],
  [/그레이스리/, ['gracery.com']],
  [/로이넷/, ['roynet.co.kr', 'daiwaroynet.jp']],
  [/오라카이/, ['orakaihotels.com']],
  [/맹그로브/, ['mangrove.city']],
  [/스탠포드/, ['stanfordhotel.co.kr', 'stanfordseoul.com']],
  [/임피리얼 ?팰리스/, ['imperialpalace.co.kr']],
  [/헨나/, ['hennnahotel.com']],
  [/솔라리아/, ['solaria-seoul.com', 'nishitetsu-hotel.com']],
  [/미드시티/, ['hotelmidcity.co.kr']],
  [/제이케이블라썸|JK/i, ['jkblossom.co.kr']],
];
const BRAND_GENERIC = /hotel|hotels|stay|suites?|resort|inn\./i;
const NOT_OFFICIAL = /namu\.wiki|wikipedia|wikimedia|daum\.net|naver\.com|tistory|blog|news|kakao\.com|google|tripadvisor|booking\.com|agoda|hotels\.com|expedia|yanolja|goodchoice|trip\.com|klook|instagram|facebook|youtube|myrealtrip|interpark|hotelscombined|trivago|kayak|traveloka|ctrip|jalan|rakuten|dailyhotel|yeogi|tourvis|modetour|hanatour|verygoodtour|priceline|stayfolio|airbnb|hostelworld|kkday|creatrip|visitkorea|visitseoul|jobkorea|saramin|dealbada|ppomppu|hotelpass|hotelscan|hotelrestaurant|hotelier|job|recruit|shop|mall|deal|coupon|cafe\.|brunch|teamblind|ezday|travelcoach|tripinfo/i;

type Row = { id: string; title: string; details: Record<string, unknown> };
type Item = { url: string; src: 'official' | 'wiki' | 'search'; from: string; site?: string; docTitle?: string };

const core = (name: string): string => name.replace(/\(.*?\)/g, ' ').replace(/[A-Za-z&·,.\-]+/g, ' ').replace(/\s+/g, ' ').trim();
const host = (u: string): string => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const norm = (s: string): string => s.replace(/\s+/g, '').toLowerCase();
function brandDomains(name: string): string[] { for (const [re, d] of BRAND_DOMAINS) if (re.test(name)) return d; return []; }
function hostMatches(h: string, domains: string[]): boolean { return domains.some((d) => h === d || h.endsWith('.' + d)); }

/** 글 제목이 이 호텔 이야기인지 — 핵심어(한글 앞 4자, 또는 중간 4자) 포함. */
function titleMentions(hotel: string, docTitle: string): boolean {
  const c = norm(core(hotel)); const t = norm(docTitle.replace(/<[^>]+>/g, ''));
  if (!c || !t) return false;
  const key = c.length <= 4 ? c : c.slice(0, 4);
  return t.includes(key) || (c.length >= 6 && t.includes(c.slice(2, 6)));
}

/** JPEG/PNG/WebP 헤더에서 크기 읽기. */
function imageSize(buf: Buffer): { w: number; h: number; type: 'jpeg' | 'png' | 'webp' } | null {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), type: 'png' };
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff, type: 'webp' };
    if (chunk === 'VP8L') { const b0 = buf[21]!, b1 = buf[22]!, b2 = buf[23]!, b3 = buf[24]!; return { w: 1 + (((b1 & 0x3f) << 8) | b0), h: 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)), type: 'webp' }; }
    if (chunk === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3), type: 'webp' };
    return null;
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1]!;
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), type: 'jpeg' };
      }
      i += 2 + len;
    }
  }
  return null;
}

async function kakao(path: 'web' | 'image', q: string, size: number): Promise<Array<Record<string, string | number>>> {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return [];
  const r = await fetch(`https://dapi.kakao.com/v2/search/${path}?size=${size}&query=${encodeURIComponent(q)}`, { headers: { Authorization: `KakaoAK ${key}` }, cache: 'no-store' });
  if (!r.ok) return [];
  return ((await r.json()) as { documents?: Array<Record<string, string | number>> }).documents ?? [];
}
async function fetchHtml(url: string, ms = 8000): Promise<{ html: string; url: string; title: string } | null> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'ko,en;q=0.8' }, signal: c.signal, redirect: 'follow', cache: 'no-store' });
    if (!r.ok || !/text\/html/.test(r.headers.get('content-type') ?? '')) return null;
    const html = (await r.text()).slice(0, 600000);
    const title = (html.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1] ?? '').trim();
    return { html, url: r.url, title };
  } catch { return null; } finally { clearTimeout(t); }
}
/** 페이지에서 사진 후보: og/twitter 이미지 → 본문 큰 이미지(src/data-src/srcset/CSS url). 아이콘·로고·스프라이트 제외. */
function pageImages(html: string, url: string): string[] {
  const abs = (u: string): string | null => { try { const x = new URL(u.trim().replace(/&amp;/g, '&'), url).href; return /^https?:/.test(x) ? x : null; } catch { return null; } };
  const out: string[] = [];
  const push = (u: string | null): void => { if (u && !out.includes(u) && !/logo|icon|sprite|btn|arrow|flag|badge|banner_s|\.svg|\.gif|1x1|pixel|blank|loading|placeholder/i.test(u)) out.push(u); };
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*content=["']([^"']+)["']/gi)) push(abs(m[1] ?? ''));
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/gi)) push(abs(m[1] ?? ''));
  for (const m of html.matchAll(/<img[^>]+(?:data-src|data-original|data-lazy|src)=["']([^"']+\.(?:jpe?g|webp)(?:\?[^"']*)?)["']/gi)) push(abs(m[1] ?? ''));
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) { const first = (m[1] ?? '').split(',').map((s) => s.trim().split(/\s+/)[0] ?? '').filter((s) => /\.(jpe?g|webp)/i.test(s)).pop(); if (first) push(abs(first)); }
  for (const m of html.matchAll(/url\((?:"|')?([^"')]+\.(?:jpe?g|webp)(?:\?[^"')]*)?)(?:"|')?\)/gi)) push(abs(m[1] ?? ''));
  return out.slice(0, 40);
}
/** 공식 페이지 찾기: 힌트(관광공사) → 브랜드 도메인의 해당 호텔 페이지(웹 검색) → 도메인에 hotel/stay 가 있는 자체 사이트. */
async function officialPage(name: string, hinted: string | null): Promise<string | null> {
  const domains = brandDomains(name);
  const okHost = (h: string): boolean => Boolean(h) && !NOT_OFFICIAL.test(h) && (domains.length ? hostMatches(h, domains) : BRAND_GENERIC.test(h));
  if (hinted && /^https?:\/\//.test(hinted) && okHost(host(hinted))) return hinted;
  const docs = await kakao('web', `${core(name)} 호텔`, 15);
  const cands = docs.map((d) => ({ url: String(d.url ?? ''), title: String(d.title ?? '') })).filter((d) => d.url && okHost(host(d.url)));
  const named = cands.find((d) => titleMentions(name, d.title));
  if (named) return named.url;
  if (domains.length && cands[0]) return cands[0].url; // 브랜드 도메인이면 제목 대조 없이도 인정
  if (!domains.length) {
    const docs2 = await kakao('web', `${core(name)} 호텔 공식 홈페이지`, 10);
    const c2 = docs2.map((d) => ({ url: String(d.url ?? ''), title: String(d.title ?? '') })).find((d) => d.url && okHost(host(d.url)) && titleMentions(name, d.title));
    if (c2) return c2.url;
  }
  return null;
}

/** 홍보성 기사(뷔페·디저트·선물·프로모션…) 제목은 사진이 호텔 외관과 무관해 제외. */
const PROMO_TITLE = /뷔페|디저트|선물|케이크|프로모션|런칭|출시|이벤트|패키지|뷰티|레스토랑|애프터눈|메뉴|딸기|와인|시즌|한정|혜택|채용|공고|모집|할인|쿠폰|웨딩|결혼|맛집|요리|셰프|칵테일|브런치|콜라보|굿즈|크리스마스|추석|설 선물|빙수|음료|커피/;

/** 위키백과(공용 라이선스) 문서 대표 사진 — 문서 제목이 이 호텔이어야 하고 가로 사진만. */
async function wikiImage(name: string): Promise<{ url: string; page: string } | null> {
  const ua = { 'User-Agent': 'GlowUpTour/1.0 (https://www.glowuptour.com)' };
  const cleaned = core(name).replace(/호텔/g, ' ').replace(/\s+/g, ' ').trim();
  for (const lang of ['ko', 'en']) {
    try {
      const q = lang === 'ko' ? cleaned : name.match(/\(([A-Za-z][^)]*)\)/)?.[1] ?? '';
      if (!q) continue;
      const s = (await (await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=3&srsearch=${encodeURIComponent(q)}`, { headers: ua, cache: 'no-store' })).json()) as { query?: { search?: Array<{ pageid: number; title: string }> } };
      const hit = (s.query?.search ?? []).find((h) => (lang === 'ko' ? titleMentions(name, h.title) : norm(h.title).includes(norm(q).slice(0, 6))));
      if (!hit) continue;
      const p = (await (await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&pageids=${hit.pageid}`, { headers: ua, cache: 'no-store' })).json()) as { query?: { pages?: Record<string, { original?: { source: string; width: number; height: number } }> } };
      const pg = Object.values(p.query?.pages ?? {})[0];
      const o = pg?.original;
      if (o && o.width >= 800 && o.width / o.height >= 1.2 && o.width / o.height <= 2.4) return { url: o.source.split('?')[0] ?? o.source, page: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(hit.title)}` };
    } catch { /* next */ }
  }
  return null;
}
async function download(url: string): Promise<{ buf: Buffer; type: string; w: number; h: number } | null> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: new URL(url).origin + '/' }, signal: c.signal, cache: 'no-store' });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 20000 || buf.length > 6 * 1024 * 1024) return null;
    const dim = imageSize(buf);
    if (!dim || dim.type === 'png') return null;
    const ratio = dim.w / Math.max(1, dim.h);
    if (dim.w < 800 || ratio < 1.2 || ratio > 2.4) return null;
    return { buf, type: dim.type === 'webp' ? 'image/webp' : 'image/jpeg', w: dim.w, h: dim.h };
  } catch { return null; } finally { clearTimeout(t); }
}

export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.IMAGE_JOB_SECRET || process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { limit?: number; only?: string };
  const limit = Math.min(Math.max(Number(body.limit) || 3, 1), 6);
  const only = String(body.only ?? '').slice(0, 60);

  const rows = (await db.execute(sql`
    select id, title, details from partner_listings
     where status = 'approved' and category = 'hotel' and (cover_image_url is null or cover_image_url = '')
       and coalesce((details->'imageSource'->>'triedAt')::timestamptz, 'epoch'::timestamptz) < now() - interval '2 days'
       ${only ? sql`and title ilike ${'%' + only + '%'}` : sql``}
     order by sort_order nulls last, title limit ${limit}`)) as unknown as Row[];
  const svc = createSupabaseServiceClient();
  const upload = async (listingId: string, purpose: 'cover' | 'gallery', buf: Buffer, type: string): Promise<string> => {
    const path = `${listingId}/${purpose}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${type === 'image/webp' ? 'webp' : 'jpg'}`;
    const { error } = await svc.storage.from('listing-images').upload(path, buf, { contentType: type, cacheControl: '3600', upsert: false });
    if (error) throw new Error(error.message);
    return svc.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
  };

  const log: string[] = []; let done = 0; let none = 0;
  const one = async (r: Row): Promise<void> => {
    const name = r.title;
    const hinted = ((r.details?.tourapi as Record<string, unknown> | undefined)?.homepage as string | undefined) ?? null;
    const domains = brandDomains(name);
    const items: Item[] = [];
    const page = await officialPage(name, hinted).catch(() => null);
    const pageHost = page ? host(page) : '';
    if (page) {
      const p = await fetchHtml(page);
      if (p) for (const u of pageImages(p.html, p.url).slice(0, 12)) items.push({ url: u, src: 'official', from: p.url, docTitle: p.title });
    }
    const wiki = await wikiImage(name).catch(() => null);
    if (wiki) items.push({ url: wiki.url, src: 'wiki', from: wiki.page, site: 'Wikimedia Commons' });
    // 검색 이미지 — 외관·로비 위주. 브랜드 도메인 글은 바로, 그 외는 글 제목에 호텔명 필수
    const wantSearch = items.length < 4;
    if (wantSearch) {
      const seenDoc = new Map<string, string | null>();
      for (const kw of ['외관 건물', '외관', '전경']) {
        if (items.length >= 10) break;
        const imgs = await kakao('image', `${core(name)} 호텔 ${kw}`, 20);
        for (const d of imgs) {
          if (items.length >= 10) break;
          const w = Number(d.width), h = Number(d.height); const u = String(d.image_url); const doc = String(d.doc_url);
          if (!(w >= 800 && h >= 450 && w / h >= 1.2 && w / h <= 2.4) || /\.(gif|png)($|\?)/i.test(u) || items.some((x) => x.url === u)) continue;
          const dh = host(doc);
          if ((pageHost && dh === pageHost) || (domains.length && hostMatches(dh, domains))) { items.push({ url: u, src: 'search', from: doc, site: String(d.display_sitename ?? '') }); continue; }
          if (NOT_OFFICIAL.test(dh) && !/blog|tistory|brunch|news|daum/.test(dh)) continue;
          let title = seenDoc.get(doc);
          if (title === undefined) { const pg = await fetchHtml(doc, 6000); title = pg?.title ?? null; seenDoc.set(doc, title); }
          if (title && titleMentions(name, title) && !PROMO_TITLE.test(title)) items.push({ url: u, src: 'search', from: doc, site: String(d.display_sitename ?? ''), docTitle: title });
        }
      }
    }
    // 다운로드·검증 — 공식 페이지 후보 먼저, 큰 사진 우선
    const got: Array<Item & { buf: Buffer; type: string; w: number; h: number }> = [];
    for (const it of items) { if (got.length >= 6) break; const d = await download(it.url); if (d) got.push({ ...it, ...d }); }
    const rank = (x: Item): number => (x.src === 'official' ? 0 : x.src === 'wiki' ? 1 : 2);
    got.sort((a, b) => rank(a) - rank(b) || b.w * b.h - a.w * a.h);
    if (got.length === 0) {
      await db.execute(sql`update partner_listings set details = details || ${JSON.stringify({ imageSource: { triedAt: new Date().toISOString(), page: page ?? undefined, found: 0 } })}::jsonb where id = ${r.id}`);
      none += 1; log.push(`✘ ${name}${page ? ` (${pageHost})` : ''}`); return;
    }
    const first = got[0]!;
    const cover = await upload(r.id, 'cover', first.buf, first.type);
    const gallery: string[] = [];
    for (const g of got.slice(1, 5)) { try { gallery.push(await upload(r.id, 'gallery', g.buf, g.type)); } catch { /* skip */ } }
    const source = {
      page: page ?? undefined, items: got.slice(0, 5).map((g) => ({ src: g.src, from: g.from, site: g.site, docTitle: g.docTitle?.slice(0, 120), original: g.url, w: g.w, h: g.h })),
      fetchedAt: new Date().toISOString(), found: Math.min(got.length, 5), note: '호텔 공식 페이지 및 웹에 공개된 이미지 (운영자 승인 2026-09-07)',
    };
    await db.execute(sql`update partner_listings set cover_image_url = coalesce(nullif(cover_image_url, ''), ${cover}),
      gallery_image_urls = case when jsonb_typeof(gallery_image_urls) = 'array' and jsonb_array_length(gallery_image_urls) > 0 then gallery_image_urls else ${JSON.stringify(gallery)}::jsonb end,
      details = details || ${JSON.stringify({ imageSource: source })}::jsonb, updated_at = now() where id = ${r.id}`);
    done += 1; log.push(`✔ ${name} · ${Math.min(got.length, 5)}장 (${got.filter((g) => g.src === 'official').length} 공식${pageHost ? ' ' + pageHost : ''}, ${got.filter((g) => g.src === 'wiki').length} 위키) ← ${first.src}:${host(first.from)}`);
  };
  for (let i = 0; i < rows.length; i += 2) {
    await Promise.all(rows.slice(i, i + 2).map((r) => one(r).catch((e: unknown) => { log.push(`! ${r.title}: ${e instanceof Error ? e.message : String(e)}`); })));
  }
  return NextResponse.json({ targets: rows.length, done, none, log });
}
