import 'server-only';
import { eq, inArray, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { hospitalLocaleContent } from '@/drizzle/schema/hospital-locale-content';
import { categoryListings } from '@/drizzle/schema/category-listings';
import { LEAD_CATEGORY_LABEL_KO } from './pricing';

/**
 * 리드 마켓 노출 범위 — 병원 조직은 "우리 병원과 관련된" 문의만 본다 (2026-10-30, 부사장 지시).
 *
 *   hospital : 문의가 우리 병원을 지정(관심 병원 id·이름이 이 조직에 연결된 병원)
 *   category : 병원을 지정하지 않은 일반 문의인데 관심 분야가 우리 진료 분야(category_listings
 *              카테고리 키 또는 details.departments 제목)와 겹침
 *   null     : 다른 병원을 지정했거나 분야가 안 맞음 → 목록·열람 모두 차단
 *
 * 조직 ↔ 병원 연결은 hospitals.linked_org_id(의료기관 권한 연결) 또는 hospitals.organization_id.
 * 연결된 병원이 없으면 아무 리드도 보이지 않는다(병원 공개 정보 연결이 먼저).
 * 화면(page.tsx)과 열람 액션(_actions.ts)이 같은 판정을 쓴다 — UI 필터만 믿지 않는다.
 */

export type LeadMeta = {
  hospitalId?: string | null;
  hospitalName?: string | null;
  interests?: string[];
};

export type LeadScope = {
  hospitals: Array<{ id: string; name: string }>;
  hospitalIds: Set<string>;
  /** normalizeHospitalName 을 거친 이름들 (한국어 + 로케일 콘텐츠) */
  hospitalNames: Set<string>;
  categoryKeys: Set<string>;
};

export type LeadScopeReason = 'hospital' | 'category';

/** 병원 이름 비교용 정규화 — 공백·괄호·구두점·대소문자 차이를 무시한다. */
export function normalizeHospitalName(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s()（）［］\[\]·.,\-_/|'"]+/g, '');
}

/** details.departments 제목(예: "피부과", "성형외과 · 피부과")에서 리드 카테고리 키를 뽑는다. */
function categoryKeysFromDepartments(details: Record<string, unknown>): string[] {
  const deps = details.departments;
  if (!Array.isArray(deps)) return [];
  const titles = deps
    .map((d) => (d && typeof d === 'object' ? String((d as { title?: unknown }).title ?? '') : ''))
    .filter(Boolean);
  const out: string[] = [];
  for (const [key, label] of Object.entries(LEAD_CATEGORY_LABEL_KO)) {
    if (titles.some((t) => t.includes(label))) out.push(key);
  }
  return out;
}

export async function getLeadScope(orgId: string): Promise<LeadScope> {
  const rows = await db
    .select({ id: hospitals.id, name: hospitals.name, details: hospitals.details })
    .from(hospitals)
    .where(or(eq(hospitals.linkedOrgId, orgId), eq(hospitals.organizationId, orgId)));

  const ids = rows.map((r) => r.id);
  const names = new Set<string>();
  const keys = new Set<string>();
  for (const r of rows) {
    const n = normalizeHospitalName(r.name);
    if (n) names.add(n);
    for (const k of categoryKeysFromDepartments(r.details ?? {})) keys.add(k);
  }

  if (ids.length > 0) {
    const [localeNames, cats] = await Promise.all([
      db
        .select({ name: hospitalLocaleContent.name })
        .from(hospitalLocaleContent)
        .where(inArray(hospitalLocaleContent.hospitalId, ids)),
      db
        .select({ key: categoryListings.categoryKey })
        .from(categoryListings)
        .where(inArray(categoryListings.hospitalId, ids)),
    ]);
    for (const l of localeNames) {
      const n = normalizeHospitalName(l.name);
      if (n) names.add(n);
    }
    for (const c of cats) if (c.key) keys.add(c.key);
  }

  return {
    hospitals: rows.map((r) => ({ id: r.id, name: r.name })),
    hospitalIds: new Set(ids),
    hospitalNames: names,
    categoryKeys: keys,
  };
}

/** 이 리드가 병원 범위 안인지 — 이유('hospital' | 'category') 또는 null(차단). */
export function leadScopeReason(scope: LeadScope, meta: LeadMeta): LeadScopeReason | null {
  const hid = (meta.hospitalId ?? '').trim();
  const hname = (meta.hospitalName ?? '').trim();
  if (hid || hname) {
    // 병원을 지정한 문의 — id 또는 이름이 이 조직의 병원이어야 한다 ("ID <uuid>" 폴백 이름 포함)
    if (hid && scope.hospitalIds.has(hid)) return 'hospital';
    const idFallback = !hid ? /^ID\s+([0-9a-f-]{36})$/i.exec(hname)?.[1] : undefined;
    if (idFallback) return scope.hospitalIds.has(idFallback) ? 'hospital' : null;
    if (hname && scope.hospitalNames.has(normalizeHospitalName(hname))) return 'hospital';
    return null;
  }
  // 병원 미지정 일반 문의 — 관심 분야가 우리 진료 분야와 겹칠 때만
  const interests = meta.interests ?? [];
  return interests.some((k) => scope.categoryKeys.has(k)) ? 'category' : null;
}
