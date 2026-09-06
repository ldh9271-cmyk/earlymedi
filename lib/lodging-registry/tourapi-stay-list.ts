import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { fetchStayDetail, listStays, type StayMatch } from './tourapi-stay';

/**
 * TourAPI 숙박 목록(지역 전체) 을 받아 로컬에서 느슨하게 매칭 — 키워드 검색이 놓치는 표기 차이(띄어쓰기·영문 병기·
 * '서울/호텔' 생략·전각 로마숫자)를 잡는다. 판정 근거(우선순위): 전화번호 일치 → 도로명+건물번호 일치 → 정규화 상호 포함/유사.
 */
const norm = (s: string): string => s
  .replace(/\(.*?\)/g, ' ').toLowerCase()
  .replace(/Ⅰ/g, '1').replace(/Ⅱ/g, '2').replace(/Ⅲ/g, '3')
  .replace(/[^가-힣a-z0-9]/g, '')
  .replace(/호텔|서울|관광|hotel|seoul|바이|by|더|the|앤|and|스퀘어|square/g, '');
const digits = (s: string): string => s.replace(/[^0-9]/g, '');
const roadKey = (addr: string): string | null => {
  const m = addr.match(/([가-힣A-Za-z0-9]+(?:대로|로|길))\s*(\d+(?:-\d+)?)/);
  return m ? `${m[1]} ${m[2]}` : null;
};
function bigrams(s: string): Set<string> { const out = new Set<string>(); for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2)); return out; }
/** Dice 계수(합집합 기준) — min 기준은 '레드' ⊂ '홈즈레드' 같은 짧은 이름이 1.0 이 되어 오매칭을 냈다. */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const A = bigrams(a); const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter += 1;
  return (2 * inter) / (A.size + B.size);
}

/**
 * 판정 규칙 (2026-09-07 오매칭 교훈 반영):
 *  - 전화번호 일치 → 채택
 *  - 도로명+건물번호 일치 → 같은 건물에 호텔이 여럿(용산 앰배서더 3개 등)일 수 있어 상호 유사도 ≥ 0.5 도 함께 요구
 *  - 상호만으로는 Dice ≥ 0.8 (양쪽 4자 이상) 일 때만 — 체인 지점(신라스테이 ○○, 토요코인 ○○)은 지점명이 달라 자동으로 걸러진다
 */
/** 체인 지점명(강남·명동·용산…)과 브랜드 변형(스위트·프리미어·익스프레스…) — 둘 다 있는데 다르면 다른 호텔. */
const BRANCH_TOKENS = ['강남', '명동', '용산', '동대문', '마포', '홍대', '여의도', '종로', '인사동', '서초', '역삼', '삼성', '광화문', '서대문', '구로', '영등포', '신도림', '김포', '을지로', '남대문', '이태원', '잠실', '송파', '성수', '청담', '신촌', '독산', '가산', '마곡', '노원', '수유', '신림'];
const VARIANT_TOKENS = ['스위트', '프리미어', '익스프레스', '스타일', '시티', '레지던스', '부티크', '가든', '스카이', '센트럴', '타워'];
function tokensOf(s: string, list: string[]): Set<string> { const t = s.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ''); return new Set(list.filter((k) => t.includes(k))); }
function branchConflict(a: string, b: string): boolean {
  for (const list of [BRANCH_TOKENS, VARIANT_TOKENS]) {
    const A = tokensOf(a, list); const B = tokensOf(b, list);
    if (A.size && B.size && ([...A].some((x) => !B.has(x)) || [...B].some((x) => !A.has(x)))) return true;
  }
  return false;
}

export function pickStay(title: string, addr: string, tel: string | null, stays: StayMatch[]): { m: StayMatch; why: string } | null {
  const telD = tel ? digits(tel) : '';
  if (telD.length >= 9) { const hit = stays.find((s) => digits(s.tel) === telD); if (hit) return { m: hit, why: 'tel' }; }
  const t = norm(title);
  const rk = roadKey(addr);
  if (rk) {
    const hits = stays.filter((s) => roadKey(s.addr) === rk && !branchConflict(title, s.title));
    const named = hits.find((s) => similarity(t, norm(s.title)) >= 0.5);
    if (named) return { m: named, why: `addr ${rk}` };
    if (hits.length === 1 && t.length < 4) return { m: hits[0]!, why: `addr-only ${rk}` };
  }
  if (t.length >= 4) {
    let best: { m: StayMatch; score: number } | null = null;
    for (const s of stays) {
      const n = norm(s.title); if (n.length < 4 || branchConflict(title, s.title)) continue;
      const sc = similarity(t, n); if (sc >= 0.8 && (!best || sc > best.score)) best = { m: s, score: sc };
    }
    if (best) return { m: best.m, why: `sim ${best.score.toFixed(2)}` };
  }
  return null;
}

/** 매칭은 됐지만 사진이 없는 게시물 — 상세 공통정보(firstimage)까지 다시 받아 커버·갤러리 보강. */
export async function refreshMatchedHotelMedia(): Promise<{ refreshed: number; still: number }> {
  const rows = (await db.execute(sql`
    select id, title, details->'tourapi'->>'contentId' as cid from partner_listings
     where status = 'approved' and category = 'hotel' and details->'tourapi'->>'matched' = 'true'
       and (cover_image_url is null or cover_image_url = '')`)) as unknown as Array<{ id: string; title: string; cid: string | null }>;
  let refreshed = 0; let still = 0;
  for (const r of rows) {
    if (!r.cid) { still += 1; continue; }
    const det = await fetchStayDetail(r.cid).catch(() => null);
    const cover = det?.images[0] ?? '';
    if (!cover) { still += 1; continue; }
    const gallery = det!.images.slice(1, 9);
    await db.execute(sql`update partner_listings set cover_image_url = ${cover}, gallery_image_urls = ${JSON.stringify(gallery)}::jsonb, updated_at = now() where id = ${r.id}`);
    refreshed += 1;
  }
  return { refreshed, still };
}

type HotelRow = { id: string; title: string; description: string | null; details: Record<string, unknown>; cover: string | null };

/** 키워드 검색으로 못 찾은(matched=false) 호텔 게시물을 지역 목록 매칭으로 재시도. areaCode 1 = 서울. */
export async function enrichUnmatchedHotelsByList(areaCode = '1'): Promise<{ matched: number; unmatched: number; log: string[] }> {
  const stays = await listStays(areaCode);
  const rows = (await db.execute(sql`
    select id, title, description, details, cover_image_url as cover
      from partner_listings
     where status = 'approved' and category = 'hotel' and details ? 'registry'
       and (details->'tourapi'->>'matched') = 'false'
     order by title`)) as unknown as HotelRow[];
  const out = { matched: 0, unmatched: 0, log: [] as string[] };
  for (const r of rows) {
    const d = r.details ?? {};
    const reg = (d.registry ?? {}) as Record<string, unknown>;
    const addr = String(d.address ?? reg.addrRoad ?? '');
    const tel = String(reg.tel ?? d.phone ?? '') || null;
    const hit = pickStay(r.title, addr, tel, stays);
    if (!hit) { out.unmatched += 1; out.log.push(`✘ ${r.title}`); continue; }
    try {
      const det = await fetchStayDetail(hit.m.contentId);
      const cover = hit.m.firstImage || det.images[0] || '';
      const gallery = det.images.filter((u) => u !== cover).slice(0, 8);
      const hours = det.checkin || det.checkout ? `체크인 ${det.checkin || '-'} · 체크아웃 ${det.checkout || '-'}` : undefined;
      const services = [det.facilities, ...det.flags].filter(Boolean).join(' · ') || undefined;
      const highlights: Array<{ title: string; desc: string; icon: string }> = [];
      if (hours) highlights.push({ title: '체크인·체크아웃', desc: hours, icon: 'concierge' });
      if (det.rooms || det.roomType) highlights.push({ title: '객실', desc: [det.rooms && `객실 ${det.rooms}`, det.roomType].filter(Boolean).join(' · '), icon: 'expert' });
      if (services) highlights.push({ title: '부대시설', desc: services.slice(0, 120), icon: 'check' });
      const overview = det.overview && det.overview.length > 40 ? det.overview.slice(0, 900) : null;
      const patch: Record<string, unknown> = {
        ...(hours ? { hours } : {}), ...(services ? { services } : {}), ...(det.tel ? { phone: det.tel } : {}), ...(highlights.length ? { highlights } : {}),
        tourapi: {
          contentId: hit.m.contentId, title: hit.m.title, matchedBy: hit.why, homepage: det.homepage || undefined, parking: det.parking || undefined, food: det.food || undefined,
          pickup: det.pickup || undefined, reservation: det.reservation || undefined, refund: det.refund || undefined, scale: det.scale || undefined,
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
      out.matched += 1; out.log.push(`✔ ${r.title} ⇐ ${hit.m.title} [${hit.why}] (${det.images.length} images)`);
    } catch (e) {
      out.unmatched += 1; out.log.push(`! ${r.title}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return out;
}
