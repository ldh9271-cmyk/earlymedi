import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { createSupabaseServiceClient } from '@/lib/auth/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 글로우 인증 호텔 게시물(커버 없음) 사진 채우기 — 운영자 승인(2026-09-07):
 *  ① 호텔 공식 홈페이지(브랜드·호텔 도메인만 인정)의 대표 이미지(og:image)
 *  ② 웹 공개 이미지(카카오 이미지 검색) — 이미지가 실린 글의 제목에 호텔 이름이 있어야 채택
 *  원본을 받아 우리 스토리지(listing-images)에 저장, 출처(홈페이지·원문 URL·사이트명)는 details.imageSource 에.
 *  1차 시도(2026-09-07)에서 취업사이트·딜 사이트 로고, 무관한 블로그 사진이 붙어 되돌린 뒤 기준을 이렇게 조였다:
 *   - 홈페이지는 도메인이 호텔/브랜드 키워드를 포함할 때만
 *   - 이미지는 jpeg/webp, 가로 ≥ 800px, 가로세로비 1.2~2.4(가로 사진), 로고 PNG 제외
 *   - 검색 이미지는 원문 글 제목에 호텔 이름(핵심어)이 있어야
 *  호출: Authorization: Bearer <IMAGE_JOB_SECRET>, body {limit, only?}
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
/** 공식 홈페이지로 인정하는 도메인 키워드 (브랜드·호텔 일반어). */
const BRAND = /hotel|hotels|stay|inn\b|inn\.|suites?|resort|hyatt|marriott|hilton|ihg|accor|ambatel|novotel|ibis|mercure|sofitel|pullman|lotte|shilla|josun|gladhotels|glad|l7hotels|toyoko|dormy|sotetsu|aloft|moxy|courtyard|fourpoints|sheraton|westin|conrad|kensington|ramada|wyndham|bestwestern|holidayinn|fairmont|fourseasons|andaz|mondrian|voco|ninetree|parnas|riviera|skypark|aank|gracery|fraser|mangrove|travelodge|roynet|peyto|crownpark|blossom|noblesse|royal|sejong|lavita|kingstown|provista|benikea|midcity|pacific|president|koreana|hamilton|cappuccino|signiel|solaria|nishitetsu|kensington|orakai|imperialpalace|swissgrand|mayfield|riverside|newv|victoria|atrium|maybe|henn|hennnahotel|grandhyatt|jwmarriott|ac-?hotel|conradseoul|plaza|palace|hanok|guesthouse|hostel|pension|lodging|lodge/i;
const NOT_OFFICIAL = /namu\.wiki|wikipedia|wikimedia|daum\.net|naver\.com|tistory|blog|news|kakao\.com|google|tripadvisor|booking\.com|agoda|hotels\.com|expedia|yanolja|goodchoice|trip\.com|klook|instagram|facebook|youtube|myrealtrip|interpark|hotelscombined|trivago|kayak|traveloka|ctrip|jalan|rakuten|dailyhotel|yeogi|tourvis|modetour|hanatour|verygoodtour|priceline|stayfolio|airbnb|hostelworld|kkday|creatrip|visitkorea|visitseoul|jobkorea|saramin|dealbada|ppomppu|hotelpass|hotelscan|hotelier|job|recruit|shop|mall|deal|coupon/i;

type Row = { id: string; title: string; details: Record<string, unknown> };
type Item = { url: string; src: 'homepage' | 'search'; from: string; site?: string; docTitle?: string };

const core = (name: string): string => name.replace(/\(.*?\)/g, ' ').replace(/[A-Za-z&·,.\-]+/g, ' ').replace(/\s+/g, ' ').trim();
const host = (u: string): string => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const norm = (s: string): string => s.replace(/\s+/g, '').toLowerCase();

/** 검색 결과 글 제목이 이 호텔 이야기인지 — 핵심어(한글 앞 3~4자) 포함. */
function titleMentions(hotel: string, docTitle: string): boolean {
  const c = norm(core(hotel)); const t = norm(docTitle.replace(/<[^>]+>/g, ''));
  if (!c || !t) return false;
  const key = c.length <= 4 ? c : c.slice(0, 4);
  return t.includes(key) || (c.length >= 6 && t.includes(c.slice(2, 6)));
}

/** JPEG/PNG/WebP 헤더에서 크기 읽기 (sharp 없이). */
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
  const j = (await r.json()) as { documents?: Array<Record<string, string | number>> };
  return j.documents ?? [];
}
async function fetchHtml(url: string, ms = 8000): Promise<{ html: string; url: string; title: string } | null> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, signal: c.signal, redirect: 'follow', cache: 'no-store' });
    if (!r.ok || !/text\/html/.test(r.headers.get('content-type') ?? '')) return null;
    const html = (await r.text()).slice(0, 400000);
    const title = (html.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1] ?? '').trim();
    return { html, url: r.url, title };
  } catch { return null; } finally { clearTimeout(t); }
}
function ogImages(html: string, url: string): string[] {
  const abs = (u: string): string | null => { try { return new URL(u.replace(/&amp;/g, '&'), url).href; } catch { return null; } };
  const out: string[] = [];
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*content=["']([^"']+)["']/gi)) { const a = abs(m[1] ?? ''); if (a) out.push(a); }
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/gi)) { const a = abs(m[1] ?? ''); if (a) out.push(a); }
  return [...new Set(out)];
}
/** 공식 홈페이지: 힌트(관광공사) 또는 웹 검색 결과 중 브랜드·호텔 도메인만. */
async function officialHomepage(name: string, hinted: string | null): Promise<string | null> {
  const ok = (u: string): boolean => { const h = host(u); return Boolean(h) && BRAND.test(h) && !NOT_OFFICIAL.test(h); };
  if (hinted && /^https?:\/\//.test(hinted) && ok(hinted)) return hinted;
  const docs = await kakao('web', `${core(name)} 호텔 공식 홈페이지`, 10);
  for (const d of docs) { const u = String(d.url ?? ''); if (u && ok(u) && titleMentions(name, String(d.title ?? ''))) return `https://${host(u)}/`; }
  for (const d of docs) { const u = String(d.url ?? ''); if (u && ok(u)) return `https://${host(u)}/`; }
  return null;
}
async function download(url: string): Promise<{ buf: Buffer; type: string } | null> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: new URL(url).origin + '/' }, signal: c.signal, cache: 'no-store' });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 20000 || buf.length > 6 * 1024 * 1024) return null;
    const dim = imageSize(buf);
    if (!dim || dim.type === 'png') return null; // 로고·투명 PNG 배제
    const ratio = dim.w / Math.max(1, dim.h);
    if (dim.w < 800 || ratio < 1.2 || ratio > 2.4) return null; // 가로 사진만
    return { buf, type: dim.type === 'webp' ? 'image/webp' : 'image/jpeg' };
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
    const items: Item[] = [];
    const homepage = await officialHomepage(name, hinted).catch(() => null);
    if (homepage) {
      const page = await fetchHtml(homepage);
      if (page) for (const u of ogImages(page.html, page.url).slice(0, 3)) items.push({ url: u, src: 'homepage', from: page.url, docTitle: page.title });
    }
    // 검색 이미지: 원문 글 제목에 호텔 이름이 있는 것만 (글 페이지를 열어 제목 확인)
    const imgs = await kakao('image', `${core(name)} 호텔`, 30);
    const hh = homepage ? host(homepage) : '';
    const cands = imgs
      .filter((d) => Number(d.width) >= 800 && Number(d.height) >= 450 && Number(d.width) / Number(d.height) >= 1.2 && Number(d.width) / Number(d.height) <= 2.4 && !/\.(gif|png)($|\?)/i.test(String(d.image_url)))
      .sort((a, b) => ((hh && host(String(b.doc_url)) === hh ? 1 : 0) - (hh && host(String(a.doc_url)) === hh ? 1 : 0)));
    const seenDoc = new Map<string, string | null>();
    for (const d of cands) {
      if (items.length >= 10) break;
      const u = String(d.image_url); const doc = String(d.doc_url);
      if (items.some((x) => x.url === u)) continue;
      if (hh && host(doc) === hh) { items.push({ url: u, src: 'search', from: doc, site: String(d.display_sitename ?? '') }); continue; }
      let title = seenDoc.get(doc);
      if (title === undefined) { const page = await fetchHtml(doc, 6000); title = page?.title ?? null; seenDoc.set(doc, title); }
      if (title && titleMentions(name, title)) items.push({ url: u, src: 'search', from: doc, site: String(d.display_sitename ?? ''), docTitle: title });
    }
    const got: Array<Item & { buf: Buffer; type: string }> = [];
    for (const it of items) { if (got.length >= 5) break; const d = await download(it.url); if (d) got.push({ ...it, ...d }); }
    if (got.length === 0) {
      await db.execute(sql`update partner_listings set details = details || ${JSON.stringify({ imageSource: { triedAt: new Date().toISOString(), homepage: homepage ?? undefined, found: 0 } })}::jsonb where id = ${r.id}`);
      none += 1; log.push(`✘ ${name}${homepage ? ` (${host(homepage)})` : ''}`); return;
    }
    const first = got[0]!;
    const cover = await upload(r.id, 'cover', first.buf, first.type);
    const gallery: string[] = [];
    for (const g of got.slice(1)) { try { gallery.push(await upload(r.id, 'gallery', g.buf, g.type)); } catch { /* skip */ } }
    const source = {
      homepage: homepage ?? undefined, items: got.map((g) => ({ src: g.src, from: g.from, site: g.site, docTitle: g.docTitle?.slice(0, 120), original: g.url })),
      fetchedAt: new Date().toISOString(), found: got.length, note: '호텔 공식 홈페이지 및 웹에 공개된 이미지 (운영자 승인 2026-09-07)',
    };
    await db.execute(sql`update partner_listings set cover_image_url = coalesce(nullif(cover_image_url, ''), ${cover}),
      gallery_image_urls = case when jsonb_typeof(gallery_image_urls) = 'array' and jsonb_array_length(gallery_image_urls) > 0 then gallery_image_urls else ${JSON.stringify(gallery)}::jsonb end,
      details = details || ${JSON.stringify({ imageSource: source })}::jsonb, updated_at = now() where id = ${r.id}`);
    done += 1; log.push(`✔ ${name} · ${got.length}장 (${got.filter((g) => g.src === 'homepage').length} 홈페이지${homepage ? ' ' + host(homepage) : ''}) ← ${first.src}:${host(first.from)}`);
  };
  for (let i = 0; i < rows.length; i += 2) {
    await Promise.all(rows.slice(i, i + 2).map((r) => one(r).catch((e: unknown) => { log.push(`! ${r.title}: ${e instanceof Error ? e.message : String(e)}`); })));
  }
  return NextResponse.json({ targets: rows.length, done, none, log });
}
