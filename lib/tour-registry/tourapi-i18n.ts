import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';

/**
 * 한국관광공사 TourAPI 4.0 다국어(영문 EngService2 · 일문 JpnService2 · 중문 ChsService2(간체)/ChtService2(번체)).
 *
 *  다국어 서비스의 title 은 "Changgyeonggung Palace (창경궁)" 처럼 끝에 한국어 명칭을 괄호로 달고 있어,
 *  우리 데이터(관광사진 제목·호텔 상호)를 한국어 키워드로 검색한 뒤 괄호 안 한국어가 같은 항목만 채택한다.
 *  → 좌표·발음 추정 없이 정확한 다국어 명칭을 얻는다. 각 언어 서비스는 트래픽 한도가 따로 있어 매일 조금씩(크론) 채운다.
 *
 *  zh 로케일은 간체(ChsService2)가 승인돼 있으면 그것을, 아니면 번체(ChtService2)를 쓴다.
 */
export type I18nLocale = 'en' | 'ja' | 'zh';
const SERVICES: Record<I18nLocale, string[]> = { en: ['EngService2'], ja: ['JpnService2'], zh: ['ChsService2', 'ChtService2'] };
type Json = Record<string, unknown>;
const str = (v: unknown): string => (v == null ? '' : String(v).trim());

function key(): string {
  const raw = (process.env.HIRA_SERVICE_KEY ?? '').trim();
  if (!raw) throw new Error('HIRA_SERVICE_KEY 가 설정되지 않았습니다');
  return raw.includes('%') ? raw : encodeURIComponent(raw);
}

const serviceCache = new Map<I18nLocale, string>();
async function callLang(locale: I18nLocale, op: string, params: Record<string, string>): Promise<Json[]> {
  const candidates = serviceCache.has(locale) ? [serviceCache.get(locale) as string] : SERVICES[locale];
  let lastErr = '';
  for (const svc of candidates) {
    const qs = new URLSearchParams({ MobileOS: 'ETC', MobileApp: 'GlowUpTour', _type: 'json', ...params });
    const res = await fetch(`https://apis.data.go.kr/B551011/${svc}/${op}?serviceKey=${key()}&${qs.toString()}`, { cache: 'no-store' });
    const text = await res.text();
    let j: Json;
    try { j = JSON.parse(text) as Json; } catch { lastErr = `non-json: ${text.slice(0, 100)}`; continue; }
    const hdr = (j.OpenAPI_ServiceResponse as Json | undefined)?.cmmMsgHeader as Json | undefined;
    if (hdr) { lastErr = `${hdr.returnReasonCode}:${hdr.errMsg}`; if (String(hdr.returnReasonCode) === '30' || String(hdr.returnReasonCode) === '12') continue; throw new Error(lastErr); }
    serviceCache.set(locale, svc);
    const body = ((j.response as Json | undefined)?.body ?? {}) as Json;
    const wrap = body.items as Json | string | undefined;
    const it = wrap && typeof wrap === 'object' ? (wrap as Json).item : undefined;
    return Array.isArray(it) ? (it as Json[]) : it ? [it as Json] : [];
  }
  throw new Error(lastErr || 'service_unavailable');
}

/** "Changgyeonggung Palace (창경궁)" → { name: 'Changgyeonggung Palace', ko: '창경궁' } */
export function splitLocalizedTitle(title: string): { name: string; ko: string | null } {
  const m = title.match(/^(.*?)\s*[（(]([^()（）]*[가-힣][^()（）]*)[)）]\s*$/);
  if (!m) return { name: title.trim(), ko: null };
  return { name: (m[1] ?? '').trim() || title.trim(), ko: (m[2] ?? '').trim() };
}
const normKo = (s: string): string => s.replace(/\(.*?\)/g, ' ').replace(/[^가-힣0-9a-zA-Z]/g, '').toLowerCase();
const stripHtml = (s: string): string => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+\n/g, '\n').trim();

export type LocalizedHit = { contentId: string; title: string; ko: string; addr: string; contentTypeId: string; mapx: string; mapy: string };

/** 한국어 명칭으로 다국어 서비스를 검색해 괄호 안 한국어가 일치하는 항목을 고른다. */
export async function findLocalized(locale: I18nLocale, koTitle: string, contentTypeIds?: string[]): Promise<LocalizedHit | null> {
  const core = koTitle.replace(/\(.*?\)/g, ' ').replace(/[A-Za-z&·,.\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (core.length < 2) return null;
  const want = normKo(core);
  const items = await callLang(locale, 'searchKeyword2', { keyword: core.slice(0, 40), numOfRows: '10', pageNo: '1', arrange: 'A' });
  let best: LocalizedHit | null = null;
  for (const it of items) {
    const { name, ko } = splitLocalizedTitle(str(it.title));
    if (!ko) continue;
    const got = normKo(ko);
    const ctid = str(it.contenttypeid);
    if (contentTypeIds && contentTypeIds.length && !contentTypeIds.includes(ctid)) continue;
    const exact = got === want;
    const loose = got.length >= 3 && want.length >= 3 && (got.includes(want) || want.includes(got));
    if (!exact && !loose) continue;
    const hit: LocalizedHit = { contentId: str(it.contentid), title: name, ko, addr: str(it.addr1), contentTypeId: ctid, mapx: str(it.mapx), mapy: str(it.mapy) };
    if (exact) return hit;
    if (!best) best = hit;
  }
  return best;
}

export async function fetchOverview(locale: I18nLocale, contentId: string): Promise<string> {
  const items = await callLang(locale, 'detailCommon2', { contentId });
  return stripHtml(str(items[0]?.overview)).slice(0, 1200);
}

/** 관광지(tour_spots) 제목 다국어 — 실좌표(카카오 매칭)가 있는 사진부터. 못 찾으면 _tried 에 시각을 남겨 14일 뒤 재시도. */
export async function localizeTourSpots(locale: I18nLocale, limit = 100): Promise<{ matched: number; unmatched: number; error?: string }> {
  const rows = (await db.execute(sql`
    select id, title from tour_spots
     where geo_source = 'kakao_kw' and (i18n->${locale}) is null
       and coalesce((i18n->'_tried'->>${locale})::timestamptz, 'epoch'::timestamptz) < now() - interval '14 days'
     order by modified_time desc nulls last limit ${limit}`)) as unknown as Array<{ id: string; title: string }>;
  let matched = 0; let unmatched = 0;
  for (const r of rows) {
    try {
      const hit = await findLocalized(locale, r.title, ['76', '78', '85', '82', '39']);
      if (hit) {
        await db.execute(sql`update tour_spots set i18n = i18n || ${JSON.stringify({ [locale]: { contentId: hit.contentId, title: hit.title, addr: hit.addr } })}::jsonb, updated_at = now() where id = ${r.id}`);
        matched += 1;
      } else {
        await db.execute(sql`update tour_spots set i18n = jsonb_set(i18n, '{_tried}', coalesce(i18n->'_tried', '{}'::jsonb) || ${JSON.stringify({ [locale]: new Date().toISOString() })}::jsonb) where id = ${r.id}`);
        unmatched += 1;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { matched, unmatched, error: msg }; // 한도 초과(22)·미승인(30) 등은 바로 중단
    }
  }
  return { matched, unmatched };
}

/** 글로우 인증 호텔 게시물(TourAPI 매칭분) 다국어 제목·소개 → partner_listing_locale_content. */
export async function localizeHotelListings(locale: I18nLocale, limit = 30): Promise<{ matched: number; unmatched: number; error?: string }> {
  const rows = (await db.execute(sql`
    select l.id, l.title
      from partner_listings l
     where l.status = 'approved' and l.category = 'hotel' and l.details->'tourapi'->>'matched' = 'true'
       and (l.details->'tourapiI18n'->${locale}) is null
       and coalesce((l.details->'tourapiI18n'->'_tried'->>${locale})::timestamptz, 'epoch'::timestamptz) < now() - interval '14 days'
     order by l.sort_order nulls last limit ${limit}`)) as unknown as Array<{ id: string; title: string }>;
  let matched = 0; let unmatched = 0;
  for (const r of rows) {
    try {
      const hit = await findLocalized(locale, r.title, ['80', '32']);
      if (!hit) {
        await db.execute(sql`update partner_listings set details = jsonb_set(details, '{tourapiI18n}', coalesce(details->'tourapiI18n', '{}'::jsonb) || ${JSON.stringify({ _tried: { [locale]: new Date().toISOString() } })}::jsonb) where id = ${r.id}`);
        unmatched += 1; continue;
      }
      const overview = await fetchOverview(locale, hit.contentId).catch(() => '');
      await db.execute(sql`
        insert into partner_listing_locale_content (listing_id, locale, title, description)
        values (${r.id}, ${locale}, ${hit.title}, ${overview || null})
        on conflict (listing_id, locale) do update
          set title = coalesce(nullif(partner_listing_locale_content.title, ''), excluded.title),
              description = coalesce(nullif(partner_listing_locale_content.description, ''), excluded.description),
              updated_at = now()`);
      await db.execute(sql`update partner_listings set details = jsonb_set(details, '{tourapiI18n}', coalesce(details->'tourapiI18n', '{}'::jsonb) || ${JSON.stringify({ [locale]: { contentId: hit.contentId, title: hit.title } })}::jsonb), updated_at = now() where id = ${r.id}`);
      matched += 1;
    } catch (e) {
      return { matched, unmatched, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return { matched, unmatched };
}
