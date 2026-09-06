// 글로우 인증 호텔 게시물(커버 없음) 사진 채우기 — 운영자 승인(2026-09-07): 호텔 공식 홈페이지 이미지 우선,
// 없으면 웹에 공개된 이미지(카카오 이미지 검색). 원본은 다운로드해 우리 스토리지(listing-images)에 저장하고
// 출처(홈페이지 주소·검색 원문 URL·사이트명)를 details.imageSource 에 남긴다.
//   node --env-file=.env.local .hotel-images.mjs [--limit N] [--only "제목 일부"]
import postgres from 'postgres';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const K = process.env.KAKAO_REST_API_KEY;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const argLimit = Number((process.argv.find((a) => a.startsWith('--limit=')) ?? '').split('=')[1] || 0) || 0;
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').split('=')[1] || '';

// 예약 플랫폼·뉴스·위키·SNS·스톡 등은 '공식 홈페이지'로 보지 않는다
const BAD = /namu\.wiki|wikipedia|wikimedia|daum\.net|naver\.com|tistory|blog|news|kakao\.com|google|tripadvisor|booking\.com|agoda|hotels\.com|expedia|yanolja|goodchoice|trip\.com|klook|instagram|facebook|youtube|donkiugi|myrealtrip|interpark|hotelscombined|trivago|kayak|traveloka|ctrip|jalan|rakuten|dailyhotel|yeogi|tourvis|modetour|hanatour|verygoodtour|priceline|orbitz|travelocity|stayfolio|airbnb|hostelworld|kkday|viator|getyourguide|creatrip|visitkorea|visitseoul|shutterstock|gettyimages|istock|alamy|dreamstime|123rf|depositphotos|unsplash|pexels|pixabay|freepik|flickr|pinterest|twitter|x\.com|linkedin|coupang|11st|gmarket|tmon|wemakeprice|dcinside|ruliweb|clien|ppomppu|fmkorea|theqoo|nate\.com|zum\.com|bing\.com|yahoo|hotelscan|marriott\.com\/search|ihg\.com\/hotels\/[a-z]{2}\/[a-z]{2}\/find|hyatt\.com\/search/i;

const core = (name) => name.replace(/\(.*?\)/g, ' ').replace(/[A-Za-z&·,.\-]+/g, ' ').replace(/\s+/g, ' ').trim();
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

async function kakao(path, q, size) {
  const r = await fetch(`https://dapi.kakao.com/v2/search/${path}?size=${size}&query=${encodeURIComponent(q)}`, { headers: { Authorization: `KakaoAK ${K}` } });
  if (!r.ok) return [];
  return (await r.json()).documents ?? [];
}
async function fetchHtml(url, ms = 10000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, signal: c.signal, redirect: 'follow' });
    if (!r.ok) return null;
    if (!/text\/html/.test(r.headers.get('content-type') || '')) return null;
    return { html: (await r.text()).slice(0, 500000), url: r.url };
  } catch { return null; } finally { clearTimeout(t); }
}
function metaImages(html, url) {
  const abs = (u) => { try { return new URL(u.replace(/&amp;/g, '&'), url).href; } catch { return null; } };
  const out = [];
  const re = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*content=["']([^"']+)["']/gi;
  const re2 = /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/gi;
  for (const m of html.matchAll(re)) { const a = abs(m[1]); if (a) out.push(a); }
  for (const m of html.matchAll(re2)) { const a = abs(m[1]); if (a) out.push(a); }
  // 대표 이미지가 없으면 본문의 큰 이미지 몇 장 (jpg/webp, 아이콘·로고 제외)
  if (out.length === 0) {
    for (const m of html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpe?g|webp|png))["']/gi)) {
      const a = abs(m[1]); if (!a || /logo|icon|sprite|banner_s|btn|arrow|flag/i.test(a)) continue; out.push(a); if (out.length >= 6) break;
    }
  }
  return [...new Set(out)];
}
async function officialHomepage(name, hinted) {
  if (hinted && /^https?:\/\//.test(hinted) && !BAD.test(hinted)) return hinted;
  const c = core(name).replace(/\s+/g, '');
  const docs = await kakao('web', `${core(name)} 호텔 공식`, 10);
  for (const d of docs) {
    if (BAD.test(d.url)) continue;
    const h = host(d.url); if (!h) continue;
    const t = (d.title || '').replace(/<[^>]+>/g, '').replace(/\s+/g, '');
    if (t.includes(c.slice(0, 4)) || /hotel|호텔/i.test(h)) return `https://${h}/`;
  }
  return null;
}
async function download(url) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: new URL(url).origin + '/' }, signal: c.signal });
    if (!r.ok) return null;
    if (!/^image\//.test(r.headers.get('content-type') || '')) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 12000 || buf.length > 10 * 1024 * 1024) return null;
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 600 || (meta.height || 0) < 340) return null;
    if ((meta.pages ?? 1) > 1) return null; // gif 애니메이션
    return await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  } catch { return null; } finally { clearTimeout(t); }
}
async function upload(listingId, purpose, buf) {
  const path = `${listingId}/${purpose}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await sb.storage.from('listing-images').upload(path, buf, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  return sb.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
}

const rows = await sql`select id, title, details from partner_listings where status='approved' and category='hotel' and (cover_image_url is null or cover_image_url='')
  and coalesce((details->'imageSource'->>'triedAt')::timestamptz, 'epoch'::timestamptz) < now() - interval '2 days'
  ${only ? sql`and title ilike ${'%' + only + '%'}` : sql``} order by sort_order nulls last, title ${argLimit ? sql`limit ${argLimit}` : sql``}`;
console.log('targets:', rows.length);
let done = 0, none = 0; const t0 = Date.now();
async function one(r) {
  const name = r.title;
  const items = [];
  const homepage = await officialHomepage(name, r.details?.tourapi?.homepage ?? null).catch(() => null);
  if (homepage) {
    const page = await fetchHtml(homepage);
    if (page) for (const u of metaImages(page.html, page.url).slice(0, 4)) items.push({ url: u, src: 'homepage', from: page.url });
  }
  if (items.length < 3) {
    const imgs = await kakao('image', `${core(name)} 호텔`, 30);
    const hh = homepage ? host(homepage) : '';
    const good = imgs.filter((d) => d.width >= 700 && d.height >= 400 && !/\.gif($|\?)/i.test(d.image_url))
      .sort((a, b) => (hh && host(b.doc_url) === hh ? 1 : 0) - (hh && host(a.doc_url) === hh ? 1 : 0) || b.width - a.width);
    for (const d of good) { if (items.length >= 8) break; if (items.some((x) => x.url === d.image_url)) continue; items.push({ url: d.image_url, src: 'search', from: d.doc_url, site: d.display_sitename }); }
  }
  const got = [];
  for (const it of items) {
    if (got.length >= 5) break;
    const buf = await download(it.url);
    if (buf) got.push({ ...it, buf });
  }
  if (got.length === 0) {
    await sql`update partner_listings set details = details || ${sql.json({ imageSource: { triedAt: new Date().toISOString(), homepage: homepage ?? undefined, found: 0 } })}::jsonb where id = ${r.id}`;
    none += 1; console.log(`✘ ${name}${homepage ? ` (홈페이지 ${host(homepage)})` : ''}`); return;
  }
  const cover = await upload(r.id, 'cover', got[0].buf);
  const gallery = [];
  for (const g of got.slice(1)) { try { gallery.push(await upload(r.id, 'gallery', g.buf)); } catch { /* skip */ } }
  const source = { homepage: homepage ?? undefined, items: got.map((g) => ({ src: g.src, from: g.from, site: g.site, original: g.url })), fetchedAt: new Date().toISOString(), found: got.length,
    note: '호텔 공식 홈페이지 및 웹에 공개된 이미지 (운영자 승인 2026-09-07)' };
  await sql`update partner_listings set cover_image_url = coalesce(nullif(cover_image_url,''), ${cover}),
    gallery_image_urls = case when jsonb_typeof(gallery_image_urls)='array' and jsonb_array_length(gallery_image_urls) > 0 then gallery_image_urls else ${sql.json(gallery)}::jsonb end,
    details = details || ${sql.json({ imageSource: source })}::jsonb, updated_at = now() where id = ${r.id}`;
  done += 1; console.log(`✔ ${name} · ${got.length}장 (${got.filter((g) => g.src === 'homepage').length} 홈페이지${homepage ? ' ' + host(homepage) : ''})`);
}
const CONC = 3;
for (let i = 0; i < rows.length; i += CONC) await Promise.all(rows.slice(i, i + CONC).map((r) => one(r).catch((e) => console.log('!', r.title, e.message))));
console.log('done', { done, none, seconds: Math.round((Date.now() - t0) / 1000) });
await sql.end();
