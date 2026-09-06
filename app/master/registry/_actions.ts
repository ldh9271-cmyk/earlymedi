'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { hospitalRegistry } from '@/drizzle/schema/hospital-registry';
import { hospitals } from '@/drizzle/schema/hospitals';
import { beautyRegistry } from '@/drizzle/schema/beauty-registry';
import { lodgingRegistry } from '@/drizzle/schema/lodging-registry';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { findRegistryMatch } from '@/lib/hospital-registry/match';

async function assertMaster(): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');
}
function back(q: Record<string, string>): never {
  redirect(`/master/registry?${new URLSearchParams(q).toString()}`);
}
const norm = (s: string): string => s.replace(/\s+/g, '').replace(/[()（）·\-–—,.]/g, '').toLowerCase();

/**
 * 외국인환자 유치 의료기관 명단 반영.
 * 붙여넣은 텍스트에서 줄 단위로 "기관명[\t,|]주소(선택)" 를 읽어 레지스트리와
 * 이름(+주소 앞부분) 으로 매칭한다. ykiho(암호화 요양기호)가 있으면 그것을
 * 우선 사용. 매칭 결과(성공/실패 건수)를 화면에 돌려준다.
 */
export async function markForeignAction(fd: FormData): Promise<void> {
  await assertMaster();
  const text = String(fd.get('list') ?? '').trim();
  const source = String(fd.get('source') ?? '').trim() || '외국인환자 유치기관 명단';
  const replace = fd.get('replace') === 'on';
  if (!text) back({ error: '명단이 비어 있습니다' });

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const matchedIds = new Set<string>();
  const misses: string[] = [];

  for (const line of lines.slice(0, 5000)) {
    const parts = line.split(/\t|\||,/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) continue;
    const first = parts[0] as string;
    // 1) 암호화 요양기호처럼 보이면 직접 매칭 (영숫자 40자 이상)
    if (/^[A-Za-z0-9+/=]{40,}$/.test(first)) {
      const [r] = await db.select({ id: hospitalRegistry.id }).from(hospitalRegistry).where(eq(hospitalRegistry.ykiho, first)).limit(1);
      if (r) { matchedIds.add(r.id); continue; }
    }
    // 2) 이름(+주소) 매칭
    const name = first;
    const addrHint = parts.slice(1).join(' ');
    const cands = await db
      .select({ id: hospitalRegistry.id, name: hospitalRegistry.name, addr: hospitalRegistry.addr, sidoName: hospitalRegistry.sidoName })
      .from(hospitalRegistry)
      .where(ilike(hospitalRegistry.name, `%${name.replace(/[%_]/g, '')}%`))
      .limit(30);
    const exact = cands.filter((c) => norm(c.name) === norm(name));
    let pick = exact.length === 1 ? exact[0] : null;
    if (!pick && cands.length > 0 && addrHint) {
      const h = norm(addrHint).slice(0, 6);
      const byAddr = (exact.length ? exact : cands).filter((c) => norm(`${c.sidoName ?? ''}${c.addr ?? ''}`).includes(h));
      if (byAddr.length === 1) pick = byAddr[0];
    }
    if (!pick && exact.length > 1 && !addrHint) misses.push(`${name} (동명 ${exact.length}곳 — 주소를 함께 적어주세요)`);
    else if (!pick) misses.push(name);
    else matchedIds.add(pick.id);
  }

  if (replace) {
    await db.update(hospitalRegistry).set({ foreignLicensed: false, foreignLicensedSource: null, foreignLicensedAt: null, updatedAt: new Date() })
      .where(eq(hospitalRegistry.foreignLicensed, true));
  }
  if (matchedIds.size > 0) {
    await db.update(hospitalRegistry)
      .set({ foreignLicensed: true, foreignLicensedSource: source, foreignLicensedAt: new Date(), updatedAt: new Date() })
      .where(inArray(hospitalRegistry.id, [...matchedIds]));
  }
  revalidatePath('/master/registry');
  back({
    ok: `외국인 진료 가능 표기 ${matchedIds.size}곳 반영 (입력 ${lines.length}줄, 미매칭 ${misses.length}건)`,
    ...(misses.length ? { misses: misses.slice(0, 60).join('\n') } : {}),
  });
}

/**
 * 계약 병원 자동 연결 — hospitals(플랫폼 등록 병원) 이름을 레지스트리 개설명과
 * 매칭해 contracted_hospital_id 를 채운다 (규칙: lib/hospital-registry/match.ts).
 * 이미 연결된 건은 건너뛴다.
 */
export async function autoMatchContractsAction(): Promise<void> {
  await assertMaster();
  const partnerRows = await db
    .select({ id: hospitals.id, name: hospitals.name, legalName: hospitals.legalName, addressJson: hospitals.addressJson })
    .from(hospitals)
    .where(eq(hospitals.countryCode, 'KR'));
  const linked = new Set(
    (await db.select({ hid: hospitalRegistry.contractedHospitalId }).from(hospitalRegistry).where(sql`${hospitalRegistry.contractedHospitalId} is not null`))
      .map((r) => r.hid as string),
  );
  let matched = 0; const ambiguous: string[] = []; const missing: string[] = [];
  for (const p of partnerRows) {
    if (linked.has(p.id)) continue;
    const city = ((p.addressJson as { city?: string } | null)?.city ?? '').trim() || null;
    const r = await findRegistryMatch([p.name, p.legalName].filter((s): s is string => Boolean(s)), city);
    if (r.kind === 'match') {
      await db.update(hospitalRegistry).set({ contractedHospitalId: p.id, updatedAt: new Date() }).where(eq(hospitalRegistry.id, r.id));
      matched += 1;
    } else if (r.kind === 'ambiguous') {
      ambiguous.push(`${p.name} → ${r.count}곳: ${r.sample.join(' / ')}`);
    } else {
      missing.push(p.name);
    }
  }
  revalidatePath('/master/registry');
  back({
    ok: `계약 병원 자동 연결 ${matched}곳 (동명 미확정 ${ambiguous.length}, 레지스트리에 없음 ${missing.length})`,
    ...(ambiguous.length || missing.length ? { misses: [...ambiguous.map((a) => `동명: ${a}`), ...missing.map((m) => `없음: ${m}`)].slice(0, 60).join('\n') } : {}),
  });
}

/** 개별 연결/해제 — 레지스트리 행에 hospitals.id 를 직접 지정. */
export async function setContractAction(fd: FormData): Promise<void> {
  await assertMaster();
  const registryId = String(fd.get('registryId') ?? '');
  const hospitalId = String(fd.get('hospitalId') ?? '').trim();
  if (!registryId) back({ error: 'missing' });
  if (hospitalId) {
    const [h] = await db.select({ id: hospitals.id }).from(hospitals).where(eq(hospitals.id, hospitalId)).limit(1);
    if (!h) back({ error: '해당 hospitals.id 를 찾을 수 없습니다' });
  }
  await db.update(hospitalRegistry)
    .set({ contractedHospitalId: hospitalId || null, updatedAt: new Date() })
    .where(eq(hospitalRegistry.id, registryId));
  revalidatePath('/master/registry');
  back({ ok: hospitalId ? '계약 병원으로 연결했습니다' : '연결을 해제했습니다' });
}

/** 클레임(병원 직접 등록) 승인/반려. 승인되면 공개 목록에서 컬러 카드로 전환. */
export async function decideClaimAction(fd: FormData): Promise<void> {
  await assertMaster();
  const registryId = String(fd.get('registryId') ?? '');
  const decision = String(fd.get('decision') ?? '');
  if (!registryId || !['approved', 'rejected'].includes(decision)) back({ error: 'bad_request' });
  await db.update(hospitalRegistry)
    .set({ claimStatus: decision, updatedAt: new Date() })
    .where(and(eq(hospitalRegistry.id, registryId), or(eq(hospitalRegistry.claimStatus, 'pending'), eq(hospitalRegistry.claimStatus, 'approved'))));
  revalidatePath('/master/registry');
  back({ ok: decision === 'approved' ? '병원 직접 등록을 승인했습니다' : '반려했습니다' });
}

// ── 뷰티샵(미용업 레지스트리) ─────────────────────────────────────

/** 뷰티샵 직접 등록 승인/반려. */
export async function decideShopClaimAction(fd: FormData): Promise<void> {
  await assertMaster();
  const id = String(fd.get('registryId') ?? '');
  const decision = String(fd.get('decision') ?? '');
  if (!id || !['approved', 'rejected'].includes(decision)) back({ error: 'bad_request' });
  await db.update(beautyRegistry).set({ claimStatus: decision, updatedAt: new Date() })
    .where(and(eq(beautyRegistry.id, id), or(eq(beautyRegistry.claimStatus, 'pending'), eq(beautyRegistry.claimStatus, 'approved'))));
  revalidatePath('/master/registry');
  back({ ok: decision === 'approved' ? '매장 직접 등록을 승인했습니다' : '반려했습니다' });
}

/** 글로우업 부가상품(partner_listings: hair/makeup/nail/pmu/personal_color) ↔ 미용업 레지스트리 자동 연결 (상호 + 시도). */
export async function autoMatchShopsAction(): Promise<void> {
  await assertMaster();
  const listings = await db
    .select({ id: partnerListings.id, title: partnerListings.title, category: partnerListings.category, addressJson: partnerListings.addressJson })
    .from(partnerListings)
    .where(inArray(partnerListings.category, ['hair', 'makeup', 'nail', 'pmu', 'personal_color']));
  const linked = new Set(
    (await db.select({ lid: beautyRegistry.contractedListingId }).from(beautyRegistry).where(sql`${beautyRegistry.contractedListingId} is not null`)).map((r) => r.lid as string),
  );
  let matched = 0; const misses: string[] = [];
  for (const l of listings) {
    if (linked.has(l.id)) continue;
    const title = l.title.replace(/\s*[(（][^)）]*[)）]\s*/g, ' ').replace(/\s*(강남|명동|압구정|홍대|청담|신사|역삼|서초|잠실|본점)(점|본점)?\s*$/, '').trim();
    const addr = l.addressJson as { city?: string; addressLine1?: string } | null;
    const city = (addr?.city ?? '').trim();
    const like = `%${title.replace(/[%_]/g, '').replace(/\s+/g, '%')}%`;
    const cands = await db
      .select({ id: beautyRegistry.id, name: beautyRegistry.name, addrRoad: beautyRegistry.addrRoad, sido: beautyRegistry.sidoName })
      .from(beautyRegistry)
      .where(and(ilike(beautyRegistry.name, like), eq(beautyRegistry.statusCode, '01'), sql`${beautyRegistry.contractedListingId} is null`))
      .limit(30);
    const exact = cands.filter((c) => norm(c.name) === norm(title) || norm(c.name).startsWith(norm(title)));
    let pick = exact.length === 1 ? exact[0] : null;
    if (!pick && exact.length > 1 && city) {
      const byCity = exact.filter((c) => (c.addrRoad ?? '').includes(city) || (c.sido ?? '') === city.slice(0, 2));
      if (byCity.length === 1) pick = byCity[0];
    }
    if (pick) {
      await db.update(beautyRegistry).set({ contractedListingId: l.id, updatedAt: new Date() }).where(eq(beautyRegistry.id, pick.id));
      matched += 1;
    } else {
      misses.push(`${l.title} (${l.category}${exact.length > 1 ? ` · 동명 ${exact.length}곳` : ''})`);
    }
  }
  revalidatePath('/master/registry');
  back({ ok: `뷰티샵 자동 연결 ${matched}곳 (미연결 ${misses.length})`, ...(misses.length ? { misses: misses.slice(0, 60).join('\n') } : {}) });
}

/** 뷰티샵 개별 연결/해제 — 레지스트리 행에 partner_listings.id 지정. */
export async function setShopContractAction(fd: FormData): Promise<void> {
  await assertMaster();
  const registryId = String(fd.get('registryId') ?? '');
  const listingId = String(fd.get('listingId') ?? '').trim();
  if (!registryId) back({ error: 'missing' });
  await db.update(beautyRegistry).set({ contractedListingId: listingId || null, updatedAt: new Date() }).where(eq(beautyRegistry.id, registryId));
  revalidatePath('/master/registry');
  back({ ok: listingId ? '글로우업 매장으로 연결했습니다' : '연결을 해제했습니다' });
}

// ── 숙박(숙박업 레지스트리) ─────────────────────────────────────────

/** 숙소 직접 등록 승인/반려. */
export async function decideStayClaimAction(fd: FormData): Promise<void> {
  await assertMaster();
  const id = String(fd.get('registryId') ?? '');
  const decision = String(fd.get('decision') ?? '');
  if (!id || !['approved', 'rejected'].includes(decision)) back({ error: 'bad_request' });
  await db.update(lodgingRegistry).set({ claimStatus: decision, updatedAt: new Date() })
    .where(and(eq(lodgingRegistry.id, id), or(eq(lodgingRegistry.claimStatus, 'pending'), eq(lodgingRegistry.claimStatus, 'approved'))));
  revalidatePath('/master/registry');
  back({ ok: decision === 'approved' ? '숙소 직접 등록을 승인했습니다' : '반려했습니다' });
}

/** 글로우업 호텔 상품(partner_listings.category = hotel) ↔ 숙박업 레지스트리 자동 연결 (상호 + 시도). */
export async function autoMatchStaysAction(): Promise<void> {
  await assertMaster();
  const listings = await db
    .select({ id: partnerListings.id, title: partnerListings.title, category: partnerListings.category, addressJson: partnerListings.addressJson })
    .from(partnerListings)
    .where(eq(partnerListings.category, 'hotel'));
  const linked = new Set(
    (await db.select({ lid: lodgingRegistry.contractedListingId }).from(lodgingRegistry).where(sql`${lodgingRegistry.contractedListingId} is not null`)).map((r) => r.lid as string),
  );
  let matched = 0; const misses: string[] = [];
  for (const l of listings) {
    if (linked.has(l.id)) continue;
    const title = l.title.replace(/\s*[(（][^)）]*[)）]\s*/g, ' ').replace(/\s*(호텔|HOTEL|Hotel)\s*/g, ' ').trim();
    if (!title) { misses.push(l.title); continue; }
    const addr = l.addressJson as { city?: string; addressLine1?: string } | null;
    const city = (addr?.city ?? '').trim();
    const like = `%${title.replace(/[%_]/g, '').replace(/\s+/g, '%')}%`;
    const cands = await db
      .select({ id: lodgingRegistry.id, name: lodgingRegistry.name, addrRoad: lodgingRegistry.addrRoad, sido: lodgingRegistry.sidoName })
      .from(lodgingRegistry)
      .where(and(ilike(lodgingRegistry.name, like), eq(lodgingRegistry.statusCode, '01'), sql`${lodgingRegistry.contractedListingId} is null`))
      .limit(30);
    const strip = (v: string): string => norm(v.replace(/호텔|hotel/gi, ''));
    const exact = cands.filter((c) => strip(c.name) === strip(title) || strip(c.name).startsWith(strip(title)));
    let pick = exact.length === 1 ? exact[0] : null;
    if (!pick && exact.length > 1 && city) {
      const byCity = exact.filter((c) => (c.addrRoad ?? '').includes(city) || (c.sido ?? '') === city.slice(0, 2));
      if (byCity.length === 1) pick = byCity[0];
    }
    if (pick) {
      await db.update(lodgingRegistry).set({ contractedListingId: l.id, updatedAt: new Date() }).where(eq(lodgingRegistry.id, pick.id));
      matched += 1;
    } else {
      misses.push(`${l.title}${exact.length > 1 ? ` (동명 ${exact.length}곳)` : ''}`);
    }
  }
  revalidatePath('/master/registry');
  back({ ok: `숙소 자동 연결 ${matched}곳 (미연결 ${misses.length})`, ...(misses.length ? { misses: misses.slice(0, 60).join('\n') } : {}) });
}

/** 숙소 개별 연결/해제 — 레지스트리 행에 partner_listings.id 지정. */
export async function setStayContractAction(fd: FormData): Promise<void> {
  await assertMaster();
  const registryId = String(fd.get('registryId') ?? '');
  const listingId = String(fd.get('listingId') ?? '').trim();
  if (!registryId) back({ error: 'missing' });
  await db.update(lodgingRegistry).set({ contractedListingId: listingId || null, updatedAt: new Date() }).where(eq(lodgingRegistry.id, registryId));
  revalidatePath('/master/registry');
  back({ ok: listingId ? '글로우업 숙소로 연결했습니다' : '연결을 해제했습니다' });
}
