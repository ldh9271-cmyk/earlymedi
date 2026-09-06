'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { hospitalRegistry } from '@/drizzle/schema/hospital-registry';
import { hospitals } from '@/drizzle/schema/hospitals';

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
 * 계약 병원 자동 연결 — hospitals(플랫폼 등록 병원) 이름으로 레지스트리를
 * 찾아 contracted_hospital_id 를 채운다. 이미 연결된 건은 건너뛴다.
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
    const names = [p.name, p.legalName].filter((s): s is string => Boolean(s));
    let pick: { id: string } | null = null;
    for (const nm of names) {
      const cands = await db
        .select({ id: hospitalRegistry.id, name: hospitalRegistry.name, addr: hospitalRegistry.addr })
        .from(hospitalRegistry)
        .where(and(ilike(hospitalRegistry.name, `%${nm.replace(/[%_]/g, '')}%`), isNull(hospitalRegistry.contractedHospitalId)))
        .limit(20);
      const exact = cands.filter((c) => norm(c.name) === norm(nm));
      if (exact.length === 1) { pick = exact[0] as { id: string }; break; }
      if (exact.length > 1) {
        const city = ((p.addressJson as { city?: string } | null)?.city ?? '').trim();
        const byCity = city ? exact.filter((c) => (c.addr ?? '').includes(city)) : [];
        if (byCity.length === 1) { pick = byCity[0] as { id: string }; break; }
        ambiguous.push(`${nm} (${exact.length}곳)`);
      }
    }
    if (pick) {
      await db.update(hospitalRegistry).set({ contractedHospitalId: p.id, updatedAt: new Date() }).where(eq(hospitalRegistry.id, pick.id));
      matched += 1;
    } else if (!ambiguous.some((a) => a.startsWith(p.name))) {
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
