import 'server-only';
import { and, ilike, isNull, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hospitalRegistry } from '@/drizzle/schema/hospital-registry';

/**
 * 플랫폼 등록 병원(hospitals.name / legalName) → 심평원 레지스트리 행 매칭.
 *
 * 등록 병원 이름은 마케팅용("드림성형외과", "메이린클리닉 압구정", "셀러블153강남의원(피부과)")
 * 이고 레지스트리는 개설신고 명칭("드림성형외과의원")이라 그대로는 안 맞는다.
 *  1) 괄호·지점 표기 제거 → 핵심 명칭
 *  2) 레지스트리 이름이 핵심 명칭과 같거나, 핵심 명칭 + 의원/병원/치과의원/한의원 이면 후보
 *  3) 후보가 여럿이면 등록 병원의 도시(addressJson.city) 가 주소에 포함된 것으로 좁힘
 *  4) 하나로 좁혀지지 않으면 ambiguous (수동 연결 대상)
 */
const BRANCH_WORDS = ['강남', '강남역', '명동', '압구정', '홍대', '일산', '청담', '동대문', '더현대서울', '신사', '역삼', '서초', '잠실', '부산', '대구', '인천', '수원', '분당', '판교', '본점'];
const SUFFIXES = ['의원', '병원', '치과의원', '치과병원', '한의원', '한방병원', '클리닉'];

export const normName = (s: string): string => s.replace(/\s+/g, '').replace(/[()（）·\-–—,.&'"]/g, '').toLowerCase();

/** 마케팅 명칭 → 핵심 명칭 후보들 (원문 → 괄호 제거 → 지점 제거). */
export function coreNames(raw: string): string[] {
  const out = new Set<string>();
  const push = (s: string): void => { const t = s.trim(); if (t.length >= 2) out.add(t); };
  push(raw);
  const noParen = raw.replace(/\s*[(（][^)）]*[)）]\s*/g, ' ').trim();
  push(noParen);
  let noBranch = noParen;
  for (const w of BRANCH_WORDS) {
    noBranch = noBranch.replace(new RegExp(`\\s*${w}(점|본점|센터)?\\s*$`), '').replace(new RegExp(`^${w}\\s+`), '').trim();
  }
  noBranch = noBranch.replace(/\s*\S+점$/, '').trim();
  push(noBranch);
  // "클리닉" 은 개설명에서 "의원" 으로 등록되는 경우가 많다
  if (/클리닉$/.test(noBranch)) push(noBranch.replace(/클리닉$/, '의원'));
  return [...out];
}

export type MatchResult =
  | { kind: 'match'; id: string; name: string }
  | { kind: 'ambiguous'; count: number; sample: string[] }
  | { kind: 'none' };

export async function findRegistryMatch(names: string[], city: string | null): Promise<MatchResult> {
  const cores = names.flatMap(coreNames);
  const seen = new Set<string>();
  const cands: Array<{ id: string; name: string; addr: string | null }> = [];
  for (const core of cores) {
    const like = `%${core.replace(/[%_]/g, '').replace(/\s+/g, '%')}%`;
    const rows = await db
      .select({ id: hospitalRegistry.id, name: hospitalRegistry.name, addr: hospitalRegistry.addr })
      .from(hospitalRegistry)
      .where(and(or(ilike(hospitalRegistry.name, like)), isNull(hospitalRegistry.contractedHospitalId)))
      .limit(40);
    const nc = normName(core);
    for (const r of rows) {
      if (seen.has(r.id)) continue;
      const nr = normName(r.name);
      const ok = nr === nc || SUFFIXES.some((sfx) => nr === nc + sfx) || SUFFIXES.some((sfx) => nc.endsWith(sfx) && nr === nc)
        || (nc.length >= 4 && nr.startsWith(nc) && SUFFIXES.includes(nr.slice(nc.length)));
      if (ok) { seen.add(r.id); cands.push(r); }
    }
    if (cands.length === 1) break;
  }
  if (cands.length === 0) return { kind: 'none' };
  if (cands.length === 1) return { kind: 'match', id: cands[0]!.id, name: cands[0]!.name };
  const c = (city ?? '').trim();
  if (c) {
    const byCity = cands.filter((r) => (r.addr ?? '').includes(c));
    if (byCity.length === 1) return { kind: 'match', id: byCity[0]!.id, name: byCity[0]!.name };
    if (byCity.length > 1) return { kind: 'ambiguous', count: byCity.length, sample: byCity.slice(0, 3).map((r) => `${r.name} (${r.addr ?? ''})`) };
  }
  return { kind: 'ambiguous', count: cands.length, sample: cands.slice(0, 3).map((r) => `${r.name} (${r.addr ?? ''})`) };
}
