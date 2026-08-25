'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { referralPartners, DEFAULT_DISTRIBUTOR_CONFIG } from '@/drizzle/schema/referral-program';
import {
  confirmDueLedger, createResultOrderWithLedger, findAuthUserIdByEmail, generateCode, getPartnerById,
  getRegionAdmin, markSettled, nextDistributorCode, reverseOrder,
} from '@/lib/referral/service';
import { regionAdmins } from '@/drizzle/schema/referral-program';

async function assertMaster(): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');
}

/**
 * 관리 권한: 총괄 마스터는 전체, 지역 마스터(region_admins)는 자기 국가만.
 * region 이 null 이면 마스터.
 */
async function assertScope(): Promise<{ email: string; region: string | null }> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const email = (auth.user.email ?? '').toLowerCase();
  if (isMasterEmail(email)) return { email, region: null };
  const region = await getRegionAdmin(email);
  if (!region) redirect('/select-org');
  return { email, region };
}

/** 지역 마스터가 자기 국가 밖의 총판을 만지는 것을 막는다. */
async function assertDistributorInScope(distributorId: string, region: string | null): Promise<void> {
  if (!region) return;
  const d = await getPartnerById(distributorId);
  if (!d || d.role !== 'distributor' || d.countryCode !== region) redirect('/master/partners?error=scope');
}

function back(path: string, q: Record<string, string>): never {
  const qs = new URLSearchParams(q).toString();
  redirect(qs ? `${path}?${qs}` : path);
}

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? '').trim();
}
function num(fd: FormData, k: string): number {
  const v = Number(String(fd.get(k) ?? '').replace(/[,\s₩]/g, ''));
  return Number.isFinite(v) ? v : 0;
}

/** 총판 생성 — 코드는 자동. 설정은 제안서 기본값으로 시작한다. */
export async function createDistributorAction(fd: FormData): Promise<void> {
  const scope = await assertScope();
  const name = str(fd, 'name');
  if (!name) back('/master/partners', { error: '총판 이름은 필수입니다' });
  // 지역 마스터는 자기 국가로 강제
  const countryCode = (scope.region ?? (str(fd, 'countryCode') || 'JP')).toUpperCase().slice(0, 2);
  const landingLocale = str(fd, 'landingLocale') || 'ja';
  for (let i = 0; i < 5; i += 1) {
    try {
      const [row] = await db.insert(referralPartners).values({
        role: 'distributor',
        code: await nextDistributorCode(countryCode),
        name,
        contact: str(fd, 'contact') || null,
        countryCode,
        landingLocale,
        userEmail: str(fd, 'userEmail') || null,
        config: DEFAULT_DISTRIBUTOR_CONFIG,
        notes: str(fd, 'notes') || null,
      }).returning({ id: referralPartners.id });
      if (row) { revalidatePath('/master/partners'); redirect(`/master/partners/${row.id}?created=1`); }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'NEXT_REDIRECT' || msg.includes('NEXT_REDIRECT')) throw err;
      if (!msg.includes('unique') && !msg.includes('duplicate')) back('/master/partners', { error: msg || 'insert_failed' });
    }
  }
  back('/master/partners', { error: 'code_collision' });
}

/** 총판 아래 추천인을 운영자가 직접 등록 (총판이 명단을 주는 경우). */
export async function createReferrerAction(fd: FormData): Promise<void> {
  const scope = await assertScope();
  const distributorId = str(fd, 'distributorId');
  await assertDistributorInScope(distributorId, scope.region);
  const name = str(fd, 'name');
  if (!distributorId || !name) back(`/master/partners/${distributorId}`, { error: '이름은 필수입니다' });
  const parentCode = str(fd, 'parentCode').toUpperCase();
  let parentId: string = distributorId;
  if (parentCode) {
    const [p] = await db.select().from(referralPartners).where(eq(referralPartners.code, parentCode)).limit(1);
    if (!p || (p.id !== distributorId && p.distributorId !== distributorId)) {
      back(`/master/partners/${distributorId}`, { error: `상위 코드 ${parentCode} 를 이 총판 아래에서 찾을 수 없습니다` });
    }
    parentId = p.id;
  }
  const d = await getPartnerById(distributorId);
  for (let i = 0; i < 5; i += 1) {
    try {
      const [row] = await db.insert(referralPartners).values({
        role: 'referrer',
        distributorId,
        parentId,
        code: generateCode(d?.countryCode ?? 'JP'),
        name,
        contact: str(fd, 'contact') || null,
        countryCode: d?.countryCode ?? 'JP',
        landingLocale: d?.landingLocale ?? 'ja',
        userEmail: str(fd, 'userEmail') || null,
      }).returning({ id: referralPartners.id });
      if (row) { revalidatePath(`/master/partners/${distributorId}`); back(`/master/partners/${distributorId}`, { ok: `추천인 ${name} 등록` }); }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('NEXT_REDIRECT')) throw err;
      if (!msg.includes('unique') && !msg.includes('duplicate')) back(`/master/partners/${distributorId}`, { error: msg });
    }
  }
  back(`/master/partners/${distributorId}`, { error: 'code_collision' });
}

/** 계정 연결: 파트너의 user_id 를 이메일로 찾아 묶는다 (Supabase auth.users 조회). */
export async function linkPartnerUserAction(fd: FormData): Promise<void> {
  await assertMaster();
  const partnerId = str(fd, 'partnerId');
  const distributorId = str(fd, 'distributorId');
  const email = str(fd, 'email').toLowerCase();
  if (!partnerId || !email) back(`/master/partners/${distributorId}`, { error: '이메일이 필요합니다' });
  const uid = await findAuthUserIdByEmail(email);
  if (!uid) back(`/master/partners/${distributorId}`, { error: `${email} 계정을 찾을 수 없습니다 — 먼저 사이트에서 가입해야 합니다` });
  await db.update(referralPartners).set({ userId: uid, userEmail: email, updatedAt: new Date() }).where(eq(referralPartners.id, partnerId));
  revalidatePath(`/master/partners/${distributorId}`);
  back(`/master/partners/${distributorId}`, { ok: `${email} 계정 연결` });
}

/** 총판 수당 설정 저장. */
export async function saveConfigAction(fd: FormData): Promise<void> {
  const scope = await assertScope();
  const distributorId = str(fd, 'distributorId');
  await assertDistributorInScope(distributorId, scope.region);
  // 단순 정산 모드: 배당 이익을 100%로 보고 총판 N% / 회사 (100−N)%.
  // 추천인 단계·환자 포인트는 쓰지 않으므로 폼에서 뺐다. 그 값들은 기존
  // config(또는 기본값)를 그대로 유지해 나중에 배분표 모드로 되돌려도
  // 안전하게 한다.
  const existing = await getPartnerById(distributorId);
  const prev = { ...DEFAULT_DISTRIBUTOR_CONFIG, ...(existing?.config ?? {}) };
  const feeSharePct = Math.max(0, Math.min(100, num(fd, 'feeSharePct') || 70));
  const cfg = {
    ...prev,
    feeShare: { distributorPct: feeSharePct },
    feePctByCategory: { plastic_surgery: num(fd, 'fee_ps'), dermatology: num(fd, 'fee_derm'), default: num(fd, 'fee_default') },
    travelMarginPct: num(fd, 'travelMarginPct'),
    holdDays: Math.max(0, Math.round(num(fd, 'holdDays'))),
  };
  await db.update(referralPartners).set({ config: cfg, updatedAt: new Date() }).where(eq(referralPartners.id, distributorId));
  revalidatePath(`/master/partners/${distributorId}`);
  back(`/master/partners/${distributorId}`, { ok: '설정 저장' });
}

/** 실적 등록 — 시술 완료 / 투어 출발을 확인하고 주문 + 원장 생성. */
export async function createResultAction(fd: FormData): Promise<void> {
  const scope = await assertScope();
  const distributorId = str(fd, 'distributorId');
  await assertDistributorInScope(distributorId, scope.region);
  const kind = str(fd, 'kind') === 'travel' ? 'travel' : 'procedure';
  const partnerCode = str(fd, 'partnerCode').toUpperCase();
  let partnerId = distributorId;
  if (partnerCode) {
    const [p] = await db.select().from(referralPartners).where(eq(referralPartners.code, partnerCode)).limit(1);
    if (!p || (p.id !== distributorId && p.distributorId !== distributorId)) {
      back(`/master/partners/${distributorId}`, { error: `추천인 코드 ${partnerCode} 를 찾을 수 없습니다` });
    }
    partnerId = p.id;
  }
  const procedureAmountWon = Math.round(num(fd, 'procedureAmountWon'));
  const saleAmountWon = kind === 'travel' ? Math.round(num(fd, 'saleAmountWon')) : 0;
  if (kind === 'procedure' && procedureAmountWon <= 0) back(`/master/partners/${distributorId}`, { error: '시술비를 입력하세요' });
  if (kind === 'travel' && saleAmountWon <= 0) back(`/master/partners/${distributorId}`, { error: '패키지 판매가를 입력하세요' });
  const feePctRaw = str(fd, 'feePct');
  const hospitalFeeBp = feePctRaw ? Math.round(Number(feePctRaw) * 100) : null;
  const completedRaw = str(fd, 'completedAt');
  const completedAt = completedRaw ? new Date(completedRaw + 'T12:00:00') : new Date();
  const patientEmail = str(fd, 'patientEmail').toLowerCase();
  let patientUserId: string | null = null;
  if (patientEmail) patientUserId = await findAuthUserIdByEmail(patientEmail);
  try {
    const r = await createResultOrderWithLedger({
      distributorId,
      partnerId,
      kind,
      category: str(fd, 'category') || null,
      procedureAmountWon,
      saleAmountWon,
      hospitalFeeBp,
      hospitalName: str(fd, 'hospitalName') || null,
      listingTitle: str(fd, 'title') || (kind === 'travel' ? '여행상품' : '시술'),
      patientUserId,
      patientLabel: str(fd, 'patientLabel') || patientEmail || null,
      completedAt,
      reserveDate: completedRaw || new Date().toISOString().slice(0, 10),
      locale: 'ja',
      note: str(fd, 'note') || null,
    });
    revalidatePath(`/master/partners/${distributorId}`);
    back(`/master/partners/${distributorId}`, { ok: `${r.invoiceNo} 등록 · 수당 ${r.rows}행 ₩${r.total.toLocaleString('ko-KR')}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'failed';
    if (msg.includes('NEXT_REDIRECT')) throw err;
    back(`/master/partners/${distributorId}`, { error: msg });
  }
}

export async function confirmDueAction(fd: FormData): Promise<void> {
  const scope = await assertScope();
  const distributorId = str(fd, 'distributorId');
  await assertDistributorInScope(distributorId, scope.region);
  const n = await confirmDueLedger(distributorId);
  revalidatePath(`/master/partners/${distributorId}`);
  back(`/master/partners/${distributorId}`, { ok: `${n}행 확정` });
}

export async function settleAction(fd: FormData): Promise<void> {
  const scope = await assertScope();
  const distributorId = str(fd, 'distributorId');
  await assertDistributorInScope(distributorId, scope.region);
  const period = str(fd, 'period') || new Date().toISOString().slice(0, 7);
  const r = await markSettled(distributorId, period);
  revalidatePath(`/master/partners/${distributorId}`);
  back(`/master/partners/${distributorId}`, { ok: `${period} 정산: ${r.rows}행 ₩${r.amount.toLocaleString('ko-KR')} 지급 처리` });
}

export async function reverseOrderAction(fd: FormData): Promise<void> {
  const scope = await assertScope();
  const distributorId = str(fd, 'distributorId');
  await assertDistributorInScope(distributorId, scope.region);
  const orderId = str(fd, 'orderId');
  const n = await reverseOrder(orderId, str(fd, 'note') || '운영자 취소');
  revalidatePath(`/master/partners/${distributorId}`);
  back(`/master/partners/${distributorId}`, { ok: `${n}행 환수·취소 처리` });
}

export async function togglePartnerAction(fd: FormData): Promise<void> {
  const scope = await assertScope();
  const distributorId = str(fd, 'distributorId');
  await assertDistributorInScope(distributorId, scope.region);
  const partnerId = str(fd, 'partnerId');
  const active = str(fd, 'active') === '1';
  await db.update(referralPartners).set({ isActive: active, updatedAt: new Date() }).where(eq(referralPartners.id, partnerId));
  revalidatePath(`/master/partners/${distributorId}`);
  back(`/master/partners/${distributorId}`, { ok: active ? '활성화' : '비활성화' });
}


/** 지역 마스터 등록 — 총괄 마스터 전용. 해당 이메일이 사이트에 가입돼 있어야 로그인해서 쓸 수 있다. */
export async function addRegionAdminAction(fd: FormData): Promise<void> {
  await assertMaster();
  const email = str(fd, 'email').toLowerCase();
  const countryCode = (str(fd, 'countryCode') || 'JP').toUpperCase().slice(0, 2);
  if (!email) back('/master/partners', { error: '이메일이 필요합니다' });
  await db.insert(regionAdmins)
    .values({ email, countryCode, note: str(fd, 'note') || null })
    .onConflictDoUpdate({ target: regionAdmins.email, set: { countryCode, note: str(fd, 'note') || null } });
  revalidatePath('/master/partners');
  back('/master/partners', { ok: `${email} → ${countryCode} 지역 마스터 등록` });
}

export async function removeRegionAdminAction(fd: FormData): Promise<void> {
  await assertMaster();
  const email = str(fd, 'email').toLowerCase();
  await db.delete(regionAdmins).where(eq(regionAdmins.email, email));
  revalidatePath('/master/partners');
  back('/master/partners', { ok: `${email} 지역 마스터 해제` });
}
