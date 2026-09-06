import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { nameMatches, sameDistrict } from '@/lib/geo/geocode';

/**
 * 한국관광공사 TourAPI 4.0 국문 관광정보(KorService2) — 숙박(contentTypeId 32) 사진·소개·부대시설.
 *  data.go.kr "한국관광공사_국문 관광정보 서비스_GW" 활용신청(자동승인) 이 돼 있어야 같은 인증키(HIRA_SERVICE_KEY)로 열린다.
 *  사진은 공공누리 출처표시 조건 — 상세 페이지에 "사진·소개: 한국관광공사" 표기(details.tourapi.attribution).
 *
 *  글로우 인증 호텔 게시물(partner_listings category='hotel', details.registry 있음) 중 커버 사진이 없는 것을
 *  상호+주소로 매칭해 cover/gallery/소개/체크인·아웃/부대시설을 채운다 (enrichHotelListingsFromTourApi).
 */
const BASE = 'https://apis.data.go.kr/B551011/KorService2';
type Json = Record<string, unknown>;

function key(): string {
  const raw = (process.env.HIRA_SERVICE_KEY ?? '').trim();
  if (!raw) throw new Error('HIRA_SERVICE_KEY 가 설정되지 않았습니다');
  return raw.includes('%') ? raw : encodeURIComponent(raw);
}
const str = (v: unknown): string => (v == null ? '' : String(v).trim());

async function call(op: string, params: Record<string, string>): Promise<{ items: Json[]; error?: string }> {
  const qs = new URLSearchParams({ MobileOS: 'ETC', MobileApp: 'GlowUpTour', _type: 'json', ...params });
  const res = await fetch(`${BASE}/${op}?serviceKey=${key()}&${qs.toString()}`, { cache: 'no-store' });
  const text = await res.text();
  let j: Json;
  try { j = JSON.parse(text) as Json; } catch { return { items: [], error: `non-json: ${text.slice(0, 120)}` }; }
  const hdr = (j.OpenAPI_ServiceResponse as Json | undefined)?.cmmMsgHeader as Json | undefined;
  if (hdr) return { items: [], error: `${hdr.returnReasonCode}:${hdr.errMsg}` };
  const body = ((j.response as Json | undefined)?.body ?? {}) as Json;
  const wrap = body.items as Json | string | undefined;
  const it = wrap && typeof wrap === 'object' ? (wrap as Json).item : undefined;
  return { items: Array.isArray(it) ? (it as Json[]) : it ? [it as Json] : [] };
}

/** 키 승인 여부 확인 — 30(미등록 키)·12(서비스 없음)면 false. */
export async function tourApiStayAvailable(): Promise<{ ok: boolean; error?: string }> {
  const r = await call('searchStay2', { numOfRows: '1', pageNo: '1', areaCode: '1' });
  return r.error ? { ok: false, error: r.error } : { ok: true };
}

export type StayMatch = { contentId: string; title: string; addr: string; tel: string; firstImage: string; mapx: string; mapy: string };

const stripHtml = (s: string): string => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
const digits = (s: string): string => s.replace(/[^0-9]/g, '');

/** 상호로 숙박 검색 후 주소(시·구)·상호·전화로 검증. */
export async function findStay(name: string, addr: string, tel: string | null): Promise<StayMatch | null> {
  const clean = name.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
  const queries = [clean, clean.replace(/\s*(호텔|서울|강남|명동)\s*/g, ' ').trim()].filter((q, i, a) => q.length >= 2 && a.indexOf(q) === i);
  for (const q of queries) {
    const r = await call('searchKeyword2', { keyword: q, contentTypeId: '32', numOfRows: '10', pageNo: '1', arrange: 'A' });
    if (r.error) throw new Error(r.error);
    for (const it of r.items) {
      const m: StayMatch = { contentId: str(it.contentid), title: str(it.title), addr: str(it.addr1), tel: str(it.tel), firstImage: str(it.firstimage), mapx: str(it.mapx), mapy: str(it.mapy) };
      if (!m.contentId) continue;
      const telHit = tel && digits(tel).length >= 9 && digits(m.tel) === digits(tel);
      const districtOk = !addr || sameDistrict(addr, m.addr);
      if (telHit || (districtOk && nameMatches(name, m.title))) return m;
    }
  }
  return null;
}

/** 지역(areaCode) 숙박 전체 목록 — 로컬 느슨 매칭용. 서울(1)은 200여 건이라 100건씩 몇 페이지면 끝난다. */
export async function listStays(areaCode = '1'): Promise<StayMatch[]> {
  const out: StayMatch[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const r = await call('searchStay2', { areaCode, numOfRows: '100', pageNo: String(page), arrange: 'A' });
    if (r.error) throw new Error(r.error);
    for (const it of r.items) {
      const m: StayMatch = { contentId: str(it.contentid), title: str(it.title), addr: str(it.addr1), tel: str(it.tel), firstImage: str(it.firstimage), mapx: str(it.mapx), mapy: str(it.mapy) };
      if (m.contentId) out.push(m);
    }
    if (r.items.length < 100) break;
  }
  return out;
}

export type StayDetail = {
  overview: string; homepage: string; tel: string; images: string[];
  checkin: string; checkout: string; parking: string; facilities: string; rooms: string; roomType: string; scale: string; food: string; pickup: string; reservation: string; refund: string;
  flags: string[];
};

export async function fetchStayDetail(contentId: string): Promise<StayDetail> {
  const [common, intro, images] = await Promise.all([
    call('detailCommon2', { contentId }),
    call('detailIntro2', { contentId, contentTypeId: '32' }),
    call('detailImage2', { contentId, imageYN: 'Y', numOfRows: '12', pageNo: '1' }),
  ]);
  const c = common.items[0] ?? {}; const i = intro.items[0] ?? {};
  const homepage = stripHtml(str(c.homepage)).match(/https?:\/\/\S+/)?.[0] ?? '';
  const flagMap: Array<[string, string]> = [['sauna', '사우나'], ['fitness', '피트니스'], ['publicbath', '공용 샤워실'], ['barbecue', '바비큐장'], ['beauty', '뷰티시설'], ['bicycle', '자전거 대여'], ['campfire', '캠프파이어'], ['karaoke', '노래방'], ['seminar', '세미나실'], ['sports', '스포츠시설'], ['chkcooking', '객실 취사']];
  const flags = flagMap.filter(([k]) => /^(1|y|yes|가능|있음)$/i.test(str(i[k]))).map(([, label]) => label);
  // 대표사진(firstimage/firstimage2)은 목록 검색에 비어 있어도 상세 공통정보에 있을 수 있다 — 갤러리 앞에 합친다
  const imgs = [str(c.firstimage), str(c.firstimage2), ...images.items.map((x) => str(x.originimgurl))].filter(Boolean);
  return {
    overview: stripHtml(str(c.overview)), homepage, tel: str(c.tel) || str(i.infocenterlodging),
    images: imgs.filter((u, idx) => imgs.indexOf(u) === idx),
    checkin: stripHtml(str(i.checkintime)), checkout: stripHtml(str(i.checkouttime)), parking: stripHtml(str(i.parkinglodging)),
    facilities: stripHtml(str(i.subfacility)), rooms: stripHtml(str(i.roomcount)), roomType: stripHtml(str(i.roomtype)), scale: stripHtml(str(i.scalelodging)),
    food: stripHtml(str(i.foodplace)), pickup: stripHtml(str(i.pickup)), reservation: stripHtml(str(i.reservationlodging)), refund: stripHtml(str(i.refundregulation)),
    flags,
  };
}

type HotelRow = { id: string; title: string; description: string | null; details: Record<string, unknown>; cover: string | null };

/**
 * 커버 없는 글로우 인증 호텔 게시물에 TourAPI 사진·소개를 채운다.
 *  반환: matched(채움)·unmatched(못 찾음)·skipped(키 미승인 등).
 */
export async function enrichHotelListingsFromTourApi(limit = 20, opts: { onlyMissingCover?: boolean } = {}): Promise<{ matched: number; unmatched: number; skipped?: string; log: string[] }> {
  const avail = await tourApiStayAvailable();
  if (!avail.ok) return { matched: 0, unmatched: 0, skipped: avail.error, log: [] };
  const onlyMissing = opts.onlyMissingCover ?? true;
  const rows = (await db.execute(sql`
    select id, title, description, details, cover_image_url as cover
      from partner_listings
     where status = 'approved' and category = 'hotel' and details ? 'registry'
       ${onlyMissing ? sql`and (cover_image_url is null or cover_image_url = '')` : sql``}
       and coalesce((details->'tourapi'->>'triedAt')::timestamptz, 'epoch'::timestamptz) < now() - interval '14 days'
     order by sort_order nulls last, title
     limit ${limit}`)) as unknown as HotelRow[];
  const out = { matched: 0, unmatched: 0, log: [] as string[] };
  for (const r of rows) {
    const d = r.details ?? {};
    const reg = (d.registry ?? {}) as Record<string, unknown>;
    const addr = str(d.address) || str(reg.addrRoad);
    const tel = str(reg.tel) || str(d.phone) || null;
    try {
      const m = await findStay(r.title, addr, tel);
      if (!m) {
        await db.execute(sql`update partner_listings set details = details || ${JSON.stringify({ tourapi: { triedAt: new Date().toISOString(), matched: false } })}::jsonb where id = ${r.id}`);
        out.unmatched += 1; out.log.push(`✘ ${r.title}`); continue;
      }
      const det = await fetchStayDetail(m.contentId);
      const cover = m.firstImage || det.images[0] || '';
      const gallery = det.images.filter((u) => u !== cover).slice(0, 8);
      const hours = det.checkin || det.checkout ? `체크인 ${det.checkin || '-'} · 체크아웃 ${det.checkout || '-'}` : (str(d.hours) || undefined);
      const services = [det.facilities, ...det.flags].filter(Boolean).join(' · ') || (str(d.services) || undefined);
      const highlights: Array<{ title: string; desc: string; icon: string }> = [];
      if (det.checkin || det.checkout) highlights.push({ title: '체크인·체크아웃', desc: hours ?? '', icon: 'concierge' });
      if (det.rooms || det.roomType) highlights.push({ title: '객실', desc: [det.rooms && `객실 ${det.rooms}`, det.roomType].filter(Boolean).join(' · '), icon: 'expert' });
      if (services) highlights.push({ title: '부대시설', desc: services.slice(0, 120), icon: 'check' });
      const overview = det.overview && det.overview.length > 40 ? det.overview.slice(0, 900) : null;
      const patch: Record<string, unknown> = {
        ...(hours ? { hours } : {}), ...(services ? { services } : {}),
        ...(det.tel ? { phone: det.tel } : {}),
        ...(highlights.length ? { highlights } : {}),
        tourapi: {
          contentId: m.contentId, title: m.title, homepage: det.homepage || undefined, parking: det.parking || undefined, food: det.food || undefined, pickup: det.pickup || undefined,
          reservation: det.reservation || undefined, refund: det.refund || undefined, scale: det.scale || undefined,
          attribution: '사진·소개: 한국관광공사 TourAPI', syncedAt: new Date().toISOString(), triedAt: new Date().toISOString(), matched: true,
        },
      };
      await db.execute(sql`
        update partner_listings
           set cover_image_url = coalesce(nullif(cover_image_url, ''), ${cover || null}),
               gallery_image_urls = case when jsonb_typeof(gallery_image_urls) = 'array' and jsonb_array_length(gallery_image_urls) > 0 then gallery_image_urls else ${JSON.stringify(gallery)}::jsonb end,
               description = case when ${overview}::text is not null and length(coalesce(description, '')) < 200 then ${overview} else description end,
               details = details || ${JSON.stringify(patch)}::jsonb,
               updated_at = now()
         where id = ${r.id}`);
      out.matched += 1; out.log.push(`✔ ${r.title} → ${m.title} (${det.images.length} images)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/^30:|^12:/.test(msg)) return { ...out, skipped: msg };
      out.unmatched += 1; out.log.push(`! ${r.title}: ${msg}`);
    }
  }
  return out;
}
