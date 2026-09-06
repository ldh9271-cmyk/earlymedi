import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { createSupabaseServiceClient } from '@/lib/auth/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 글로우 인증 호텔 게시물(커버 없음) 사진 채우기 — 운영자 승인(2026-09-07):
 *  호텔 공식 홈페이지 대표 이미지(og:image) 우선, 없으면 웹에 공개된 이미지(카카오 이미지 검색).
 *  원본을 받아 우리 스토리지(listing-images)에 저장하고 출처(홈페이지·원문 URL·사이트명)를 details.imageSource 에 남긴다.
 *  로컬엔 운영 스토리지 키가 없어 이 라우트가 운영에서 돈다. 호출: Authorization: Bearer <IMAGE_JOB_SECRET>, body {limit}.
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const BAD = /namu\.wiki|wikipedia|wikimedia|daum\.net|naver\.com|tistory|blog|news|kakao\.com|google|tripadvisor|booking\.com|agoda|hotels\.com|expedia|yanolja|goodchoice|trip\.com|klook|instagram|facebook|youtube|donkiugi|myrealtrip|interpark|hotelscombined|trivago|kayak|traveloka|ctrip|jalan|rakuten|dailyhotel|yeogi|tourvis|modetour|hanatour|verygoodtour|priceline|orbitz|travelocity|stayfolio|airbnb|hostelworld|kkday|viator|getyourguide|creatrip|visitkorea|visitseoul|shutterstock|gettyimages|istock|alamy|dreamstime|123rf|depositphotos|unsplash|pexels|pixabay|freepik|flickr|pinterest|twitter|x\.com|linkedin|coupang|11st|gmarket|tmon|wemakeprice|dcinside|ruliweb|clien|ppomppu|fmkorea|theqoo|nate\.com|zum\.com|bing\.com|yahoo|hotelscan/i;

type Row = { id: string; title: string; details: Record<string, unknown> };
type Item = { url: string; src: 'homepage' | 'search'; from: string; site?: string };

const core = (name: string): string => name.replace(/\(.*?\)/g, ' ').replace(/[A-Za-z&·,.\-]+/g, ' ').replace(/\s+/g, ' ').trim();
const host = (u: string): string => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

async function kakao(path: 'web' | 'image', q: string, size: number): Promise<Array<Record<string, string | number>>> {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return [];
  const r = await fetch(`https://dapi.kakao.com/v2/search/${path}?size=${size}&query=${encodeURIComponent(q)}`, { headers: { Authorization: `KakaoAK ${key}` }, cache: 'no-store' });
  if (!r.ok) return [];
  const j = (await r.json()) as { documents?: Array<Record<string, string | number>> };
  return j.documents ?? [];
}
async function fetchHtml(url: string, ms = 8000): Promise<{ html: string; url: string } | null> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, signal: c.signal, redirect: 'follow', cache: 'no-store' });
    if (!r.ok || !/text\/html/.test(r.headers.get('content-type') ?? '')) return null;
    return { html: (await r.text()).slice(0, 500000), url: r.url };
  } catch { return null; } finally { clearTimeout(t); }
}
function metaImages(html: string, url: string): string[] {
  const abs = (u: string): string | null => { try { return new URL(u.replace(/&amp;/g, '&'), url).href; } catch { return null; } };
  const out: string[] = [];
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*content=["']([^"']+)["']/gi)) { const a = abs(m[1] ?? ''); if (a) out.push(a); }
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/gi)) { const a = abs(m[1] ?? ''); if (a) out.push(a); }
  if (out.length === 0) {
    for (const m of html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpe?g|webp|png))["']/gi)) {
      const a = abs(m[1] ?? ''); if (!a || /logo|icon|sprite|btn|arrow|flag|badge/i.test(a)) continue; out.push(a); if (out.length >= 6) break;
    }
  }
  return [...new Set(out)];
}
async function officialHomepage(name: string, hinted: string | null): Promise<string | null> {
  if (hinted && /^https?:\/\//.test(hinted) && !BAD.test(hinted)) return hinted;
  const c = core(name).replace(/\s+/g, '');
  const docs = await kakao('web', `${core(name)} 호텔 공식`, 10);
  for (const d of docs) {
    const u = String(d.url ?? ''); if (!u || BAD.test(u)) continue;
    const h = host(u); if (!h) continue;
    const t = String(d.title ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, '');
    if (t.includes(c.slice(0, 4)) || /hotel|호텔/i.test(h)) return `https://${h}/`;
  }
  return null;
}
async function download(url: string): Promise<{ buf: Buffer; type: string } | null> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: new URL(url).origin + '/' }, signal: c.signal, cache: 'no-store' });
    const type = (r.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
    if (!r.ok || !/^image\/(jpeg|png|webp)$/.test(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 12000 || buf.length > 6 * 1024 * 1024) return null;
    return { buf, type };
  } catch { return null; } finally { clearTimeout(t); }
}

export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.IMAGE_JOB_SECRET || process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { limit?: number; only?: string };
  const limit = Math.min(Math.max(Number(body.limit) || 4, 1), 8);
  const only = String(body.only ?? '').slice(0, 60);

  const rows = (await db.execute(sql`
    select id, title, details from partner_listings
     where status = 'approved' and category = 'hotel' and (cover_image_url is null or cover_image_url = '')
       and coalesce((details->'imageSource'->>'triedAt')::timestamptz, 'epoch'::timestamptz) < now() - interval '2 days'
       ${only ? sql`and title ilike ${'%' + only + '%'}` : sql``}
     order by sort_order nulls last, title limit ${limit}`)) as unknown as Row[];
  const svc = createSupabaseServiceClient();
  const upload = async (listingId: string, purpose: 'cover' | 'gallery', buf: Buffer, type: string): Promise<string> => {
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${listingId}/${purpose}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
      if (page) for (const u of metaImages(page.html, page.url).slice(0, 4)) items.push({ url: u, src: 'homepage', from: page.url });
    }
    if (items.length < 3) {
      const imgs = await kakao('image', `${core(name)} 호텔`, 30);
      const hh = homepage ? host(homepage) : '';
      const good = imgs
        .filter((d) => Number(d.width) >= 700 && Number(d.height) >= 400 && !/\.gif($|\?)/i.test(String(d.image_url)))
        .sort((a, b) => ((hh && host(String(b.doc_url)) === hh ? 1 : 0) - (hh && host(String(a.doc_url)) === hh ? 1 : 0)) || Number(b.width) - Number(a.width));
      for (const d of good) { if (items.length >= 8) break; const u = String(d.image_url); if (items.some((x) => x.url === u)) continue; items.push({ url: u, src: 'search', from: String(d.doc_url), site: String(d.display_sitename ?? '') }); }
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
      homepage: homepage ?? undefined, items: got.map((g) => ({ src: g.src, from: g.from, site: g.site, original: g.url })), fetchedAt: new Date().toISOString(), found: got.length,
      note: '호텔 공식 홈페이지 및 웹에 공개된 이미지 (운영자 승인 2026-09-07)',
    };
    await db.execute(sql`update partner_listings set cover_image_url = coalesce(nullif(cover_image_url, ''), ${cover}),
      gallery_image_urls = case when jsonb_typeof(gallery_image_urls) = 'array' and jsonb_array_length(gallery_image_urls) > 0 then gallery_image_urls else ${JSON.stringify(gallery)}::jsonb end,
      details = details || ${JSON.stringify({ imageSource: source })}::jsonb, updated_at = now() where id = ${r.id}`);
    done += 1; log.push(`✔ ${name} · ${got.length}장 (${got.filter((g) => g.src === 'homepage').length} 홈페이지${homepage ? ' ' + host(homepage) : ''})`);
  };
  for (let i = 0; i < rows.length; i += 2) {
    await Promise.all(rows.slice(i, i + 2).map((r) => one(r).catch((e: unknown) => { log.push(`! ${r.title}: ${e instanceof Error ? e.message : String(e)}`); })));
  }
  return NextResponse.json({ targets: rows.length, done, none, log });
}
