import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { and, desc, eq, inArray } from 'drizzle-orm';
import QRCode from 'qrcode';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/auth/supabase-server';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { commissionLedger, referralAttributions } from '@/drizzle/schema/referral-program';
import { isMasterEmail } from '@/lib/auth/master';
import {
  attributeUser, claimPartnerByEmail, confirmDueLedger, getPartnerByCode, getPartnerById, getPartnerByUserId,
  getRegionAdmin, listReferrers, partnerTotals, REF_COOKIE, REF_JOIN_COOKIE,
} from '@/lib/referral/service';
import { joinReferrerAction } from './_actions';
import { PrintButton } from './print-button';

export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://glowuptour.com';
const CSS =
  '@media (max-width: 768px) { .m-ref-page { padding: 24px 16px 96px !important; } .m-ref-two { grid-template-columns: 1fr !important; } .m-ref-stats { grid-template-columns: 1fr 1fr !important; } }'
  + '@media print { .m-ref-noprint { display: none !important; } .m-ref-page { padding: 0 !important; } }';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<{ title: string }> {
  if (!isPublicLocale(params.locale)) return { title: 'Referral' };
  const dict = await getDictionary(params.locale);
  return { title: `${dict.referral.title} · KoreaGlowUp` };
}

export default async function ReferralPage({
  params, searchParams,
}: { params: { locale: string }; searchParams: { period?: string; joined?: string; error?: string; as?: string } }): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  const t = dict.referral;

  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/me/referral`)}`);
  const user = auth.user;

  // QR 로 들어온 계정이면 이 시점에 귀속을 기록한다 (최초 접촉 우선)
  const jar = cookies();
  const refCode = jar.get(REF_COOKIE)?.value;
  if (refCode) await attributeUser(user.id, refCode, 'me').catch(() => null);

  // ── 마스터 미리보기: ?as=<파트너 id> — 총괄 마스터, 또는 그 파트너
  //    국가의 지역 마스터만 해당 총판이 보는 화면을 그대로 볼 수 있다.
  //    (마스터 콘솔 총판 목록의 '총판 화면' 아이콘에서 진입)
  let previewOf: Awaited<ReturnType<typeof getPartnerById>> = null;
  if (searchParams.as) {
    const email = (user.email ?? '').toLowerCase();
    const target = await getPartnerById(searchParams.as).catch(() => null);
    if (target) {
      const region = isMasterEmail(email) ? null : await getRegionAdmin(email).catch(() => null);
      const allowed = isMasterEmail(email) || (!!region && region === target.countryCode);
      if (allowed) previewOf = target;
    }
  }

  // 비밀번호 로그인은 인증 콜백을 지나지 않으므로, 마스터가 미리 저장해 둔
  // 총판 계정 이메일(가입 대기)을 여기서도 연결한다.
  if (!previewOf && user.email) await claimPartnerByEmail(user.id, user.email).catch(() => 0);
  const me = previewOf ?? (await getPartnerByUserId(user.id));

  // ── 아직 추천인이 아님: 초대 여부에 따라 참여 폼 / 안내 ─────────
  if (!me) {
    // 추천인 참여 폼은 총판의 초대 링크(?join=1)로 왔을 때만 — 추천인의
    // 고객 링크로 온 사람은 고객이지 하위 추천인이 아니다 (2단계 고정).
    const inviteCode = jar.get(REF_JOIN_COOKIE)?.value ?? null;
    const invitedBy = inviteCode ? await getPartnerByCode(inviteCode) : null;
    const inviter = invitedBy && invitedBy.role === 'distributor' ? invitedBy : null;
    return (
      <section className="m-ref-page" style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 96px' }}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t.title}</h1>
        {searchParams.error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{searchParams.error}</p> : null}
        {inviter ? (
          <form action={joinReferrerAction} style={{ marginTop: 20, border: '1px solid #ebebeb', borderRadius: 14, padding: 22 }}>
            <input type="hidden" name="locale" value={locale} />
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{t.joinTitle}</h2>
            <p style={{ fontSize: 13, color: '#6a6a6a', margin: '8px 0 0', lineHeight: 1.6 }}>{t.joinBody}</p>
            <p style={{ fontSize: 12, color: '#222', margin: '10px 0 0' }}>← {inviter.name} ({inviter.code})</p>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6a6a6a', marginTop: 16 }}>{t.joinName}</label>
            <input name="name" defaultValue={user.email?.split('@')[0] ?? ''} maxLength={80}
              style={{ width: '100%', border: '1px solid #dddddd', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', marginTop: 4 }} />
            <button type="submit" style={{ marginTop: 16, width: '100%', height: 46, background: '#ff385c', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t.joinCta}
            </button>
          </form>
        ) : (
          <div style={{ marginTop: 20, border: '1px dashed #dddddd', borderRadius: 14, padding: 22 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t.notInvitedTitle}</h2>
            <p style={{ fontSize: 13, color: '#6a6a6a', margin: '8px 0 0', lineHeight: 1.6 }}>{t.notInvitedBody}</p>
          </div>
        )}
        <p style={{ marginTop: 20, fontSize: 13 }}><Link href={`/${locale}/me`} style={{ color: '#222' }}>← {dict.myPage.title}</Link></p>
      </section>
    );
  }

  // ── 추천인 / 총판 화면 ──────────────────────────────────────────
  const isDistributor = me.role === 'distributor';
  // 여행 시작일이 지난 예비 적립은 대시보드를 볼 때 확정 적립으로 올린다
  // (운영자 조작 없이 "여행이 시작되면 확정"을 자동으로 반영).
  if (isDistributor) await confirmDueLedger(me.id).catch(() => 0);
  const customerLink = `${SITE}/r/${me.code}`;
  const inviteLink = `${SITE}/r/${me.code}?join=1`;
  const qr = await QRCode.toString(customerLink, { type: 'svg', margin: 1, width: 180 });
  // 추천인 화면에 '소속 총판'을 보여준다 (총판 → 추천인 → 고객, 2단계 고정)
  const myDistributor = !isDistributor && me.distributorId ? await getPartnerById(me.distributorId).catch(() => null) : null;
  const totals = await partnerTotals(me.id);

  const myRows = await db
    .select({ l: commissionLedger, o: { invoiceNo: checkoutOrders.invoiceNo, title: checkoutOrders.listingTitle, patient: checkoutOrders.patientLabel } })
    .from(commissionLedger)
    .innerJoin(checkoutOrders, eq(checkoutOrders.id, commissionLedger.orderId))
    .where(eq(commissionLedger.beneficiaryPartnerId, me.id))
    .orderBy(desc(commissionLedger.createdAt))
    .limit(50);

  const roleLabel = (b: string): string => (b === 'referrer_l1' ? t.roleL1 : b === 'referrer_l2' ? t.roleL2 : t.roleDistributor);
  const statusLabel = (s: string, basis?: string): { text: string; color: string } => {
    // 여행 마진은 여행 시작 전 '예비 적립', 시작 후 '확정 적립'으로 표시
    if (basis === 'travel_margin') {
      if (s === 'pending') return { text: t.provisional, color: '#b45309' };
      if (s === 'confirmed') return { text: t.confirmedAccrual, color: '#1d4ed8' };
    }
    return s === 'paid' ? { text: t.paid, color: '#047857' }
      : s === 'confirmed' ? { text: t.confirmed, color: '#1d4ed8' }
        : s === 'reversed' ? { text: '×', color: '#6a6a6a' }
          : { text: t.pending, color: '#b45309' };
  };
  const fmt = (n: number): string => `₩${n.toLocaleString('ko-KR')}`;

  // 총판: 가입 회원 명부 + 추천인 목록 + 월 정산서
  let referrers: Awaited<ReturnType<typeof listReferrers>> = [];
  // 추천인별 고객용 QR (② 초대 링크 아래 목록에 표시)
  let referrerQrs: string[] = [];
  // 파트너(총판 본인·각 추천인)별 실적: 가입 회원 → 결제 완료 → 수당(대기/확정/지급)
  type Perf = { members: number; orders: number; paidWon: number; pending: number; confirmed: number; paid: number };
  const ZERO_PERF: Perf = { members: 0, orders: 0, paidWon: 0, pending: 0, confirmed: 0, paid: 0 };
  const perf = new Map<string, Perf>();
  // 월 정산서 행 — 실시간: 대기(확정 예정)·확정·지급을 모두 담는다
  let statement: Array<{ name: string; code: string; count: number; pending: number; confirmed: number; paid: number; amount: number }> = [];
  let members: Array<{
    userId: string; label: string; via: string; source: string;
    joinedAt: Date; orders: number; spentWon: number;
  }> = [];
  const period = searchParams.period && /^\d{4}-\d{2}$/.test(searchParams.period) ? searchParams.period : new Date().toISOString().slice(0, 7);
  if (isDistributor) {
    referrers = await listReferrers(me.id);
    referrerQrs = await Promise.all(
      referrers.map((r) => QRCode.toString(`${SITE}/r/${r.code}`, { type: 'svg', margin: 1, width: 120 })),
    );

    // ── 내 QR·추천 코드로 가입해 영구 귀속된 회원 명부 ──────────
    // 표시는 마스킹 이메일까지만 — 회원 PII 는 총판에게 전부
    // 노출하지 않는다. 주문 집계는 입금 확인(paid)된 건만 센다.
    const attrRows = await db
      .select({
        userId: referralAttributions.userId,
        partnerId: referralAttributions.partnerId,
        source: referralAttributions.source,
        createdAt: referralAttributions.createdAt,
      })
      .from(referralAttributions)
      .where(eq(referralAttributions.distributorId, me.id))
      .orderBy(desc(referralAttributions.createdAt))
      .limit(200);

    const emailById = new Map<string, string>();
    if (attrRows.length > 0) {
      try {
        const svc = createSupabaseServiceClient();
        const { data } = await (svc as unknown as {
          auth: { admin: { listUsers: (o: { perPage: number }) => Promise<{ data?: { users?: Array<{ id: string; email?: string }> } }> } };
        }).auth.admin.listUsers({ perPage: 500 });
        for (const u of data?.users ?? []) if (u.email) emailById.set(u.id, u.email);
      } catch {
        /* 이메일 조회 실패 시 익명 표기로 대체 */
      }
    }

    const ordersByUser = new Map<string, { orders: number; spentWon: number }>();
    const paidRows = attrRows.length > 0
      ? await db
        .select({ userId: checkoutOrders.userId, partnerId: checkoutOrders.partnerId, totalWon: checkoutOrders.totalWon })
        .from(checkoutOrders)
        .where(and(
          eq(checkoutOrders.distributorId, me.id),
          eq(checkoutOrders.status, 'paid'),
          inArray(checkoutOrders.userId, attrRows.map((r) => r.userId)),
        ))
      : [];
    for (const o of paidRows) {
      if (!o.userId) continue;
      const cur = ordersByUser.get(o.userId) ?? { orders: 0, spentWon: 0 };
      cur.orders += 1; cur.spentWon += o.totalWon;
      ordersByUser.set(o.userId, cur);
    }

    // ── 추천인별 실적 구분: 어느 추천인(또는 총판 직접)을 거쳐 가입한
    //    소비자가 얼마나 결제했고, 그 추천인 수당이 얼마인지 ──────────
    const perfOf = (id: string): Perf => {
      let p = perf.get(id);
      if (!p) { p = { ...ZERO_PERF }; perf.set(id, p); }
      return p;
    };
    for (const r of attrRows) perfOf(r.partnerId).members += 1;
    for (const o of paidRows) {
      if (!o.partnerId) continue;
      const p = perfOf(o.partnerId);
      p.orders += 1; p.paidWon += o.totalWon;
    }
    // 수당은 총판에게만 지급되므로, '어느 추천인을 거친 매출에서 나온 총판
    // 수당인지'를 주문의 partner_id(경유)로 나눠 보여준다 — 총판이 추천인과
    // 자체 정산할 때 쓰는 숫자.
    const ledgerByVia = await db
      .select({ via: checkoutOrders.partnerId, status: commissionLedger.status, amount: commissionLedger.amountWon })
      .from(commissionLedger)
      .innerJoin(checkoutOrders, eq(checkoutOrders.id, commissionLedger.orderId))
      .where(and(eq(commissionLedger.distributorId, me.id), eq(commissionLedger.beneficiary, 'distributor')));
    for (const l of ledgerByVia) {
      const p = perfOf(l.via ?? me.id);
      if (l.status === 'pending') p.pending += l.amount;
      else if (l.status === 'confirmed') p.confirmed += l.amount;
      else if (l.status === 'paid') p.paid += l.amount;
    }

    const partnerName = new Map<string, string>([[me.id, `${me.name} (${me.code})`]]);
    for (const r of referrers) partnerName.set(r.id, `${r.name} (${r.code})`);
    const maskEmail = (e: string | undefined): string =>
      e ? e.replace(/^(..)[^@]*(@.*)$/, '$1***$2') : '';
    members = attrRows.map((r) => {
      const agg = ordersByUser.get(r.userId) ?? { orders: 0, spentWon: 0 };
      return {
        userId: r.userId,
        label: maskEmail(emailById.get(r.userId)) || `member-${r.userId.slice(0, 8)}`,
        via: partnerName.get(r.partnerId) ?? '—',
        source: r.source,
        joinedAt: r.createdAt,
        orders: agg.orders,
        spentWon: agg.spentWon,
      };
    });
    const byId = new Map(referrers.map((r) => [r.id, r]));
    const [y = 2026, m = 1] = period.split('-').map(Number);
    const from = new Date(Date.UTC(y, m - 1, 1));
    const to = new Date(Date.UTC(y, m, 1));
    // 월 정산서: 총판이 받을 금액을 '경유 추천인'별로 나눠 보여준다
    // (플랫폼은 총판에게 일괄 지급, 추천인 배분은 총판이 자체 정산).
    // 실시간 정산 표기: 대기(pending, 확정 예정일이 이 달)도 포함한다.
    const rows = await db
      .select({ via: checkoutOrders.partnerId, status: commissionLedger.status, amountWon: commissionLedger.amountWon, confirmAt: commissionLedger.confirmAt })
      .from(commissionLedger)
      .innerJoin(checkoutOrders, eq(checkoutOrders.id, commissionLedger.orderId))
      .where(and(
        eq(commissionLedger.distributorId, me.id),
        inArray(commissionLedger.status, ['pending', 'confirmed', 'paid']),
        inArray(commissionLedger.beneficiary, ['referrer_l1', 'referrer_l2', 'distributor']),
      ));
    const agg = new Map<string, { name: string; code: string; count: number; pending: number; confirmed: number; paid: number; amount: number }>();
    for (const r of rows) {
      if (r.confirmAt < from || r.confirmAt >= to) continue;
      const pid = r.via ?? me.id;
      const p = pid === me.id ? me : byId.get(pid);
      const key = pid;
      const cur = agg.get(key) ?? { name: pid === me.id ? t.stmtDirect : (p?.name ?? '—'), code: p?.code ?? '', count: 0, pending: 0, confirmed: 0, paid: 0, amount: 0 };
      cur.count += 1; cur.amount += r.amountWon;
      if (r.status === 'pending') cur.pending += r.amountWon;
      else if (r.status === 'confirmed') cur.confirmed += r.amountWon;
      else cur.paid += r.amountWon;
      agg.set(key, cur);
    }
    statement = [...agg.values()].sort((a, b) => b.amount - a.amount);
  }
  const stmtTotal = statement.reduce((a, s) => a + s.amount, 0);

  return (
    <section className="m-ref-page" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 96px' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="m-ref-noprint">
        {previewOf ? (
          <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 12, padding: '10px 14px', marginBottom: 18, fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span><b style={{ color: '#c2410c' }}>마스터 미리보기</b> — <b>{previewOf.name}</b> ({previewOf.code}) 총판 계정으로 로그인하면 보이는 화면입니다. 조회만 되고 아무것도 바뀌지 않습니다.</span>
            <Link href={`/master/partners/${previewOf.id}`} style={{ color: '#222', fontWeight: 600, whiteSpace: 'nowrap' }}>← 관리 화면으로</Link>
          </div>
        ) : null}
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>{isDistributor ? t.distributorTitle : t.title}</h1>
        <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0' }}>{t.subtitle}</p>
        {isDistributor ? (
          <p style={{ fontSize: 13, color: '#c2143c', margin: '8px 0 0', fontWeight: 600 }}>{t.dashViewOnly}</p>
        ) : null}
        {searchParams.joined ? <p style={{ fontSize: 13, color: '#047857', marginTop: 10 }}>✓ {t.joinTitle}</p> : null}

        {/* ① 고객 모집 — 코드 · QR · 고객용 링크 (총판·추천인 공통) */}
        {isDistributor ? <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 8px' }}>{t.sectionCustomer}</h2> : null}
        <div className="m-ref-two" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, marginTop: isDistributor ? 0 : 24, border: '1px solid #ebebeb', borderRadius: 14, padding: 20 }}>
          <div dangerouslySetInnerHTML={{ __html: qr }} style={{ width: 180, height: 180 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6a6a6a' }}>{t.myCode}</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 2, marginTop: 2 }}>{me.code}</div>
            <p style={{ fontSize: 13, color: '#6a6a6a', margin: '8px 0 0', lineHeight: 1.6 }}>{t.qrHint}</p>
            <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: '#6a6a6a' }}>{t.linkLabel}</div>
            <code style={{ display: 'block', background: '#f7f7f7', borderRadius: 8, padding: '8px 10px', fontSize: 13, wordBreak: 'break-all', marginTop: 4 }}>{customerLink}</code>
            {!isDistributor ? (
              <>
                {myDistributor ? (
                  <div style={{ marginTop: 14, fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: '#6a6a6a' }}>{t.myDistributor}</span>{' '}
                    <b>{myDistributor.name}</b> <span style={{ fontFamily: 'monospace', color: '#6a6a6a' }}>({myDistributor.code})</span>
                  </div>
                ) : null}
                <p style={{ fontSize: 12, color: '#6a6a6a', margin: '8px 0 0', lineHeight: 1.55 }}>{t.referrerNote}</p>
              </>
            ) : null}
          </div>
        </div>

        {/* ② 추천인(영업) 초대 링크 — 총판만. 추천인은 하위 추천인을 둘 수 없다. */}
        {isDistributor ? (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '22px 0 8px' }}>{t.sectionInvite}</h2>
            <div style={{ border: '1px solid #fecdd3', background: '#fffafb', borderRadius: 14, padding: 20 }}>
              <code style={{ display: 'block', background: '#fff', border: '1px solid #fecdd3', borderRadius: 8, padding: '8px 10px', fontSize: 13, wordBreak: 'break-all' }}>{inviteLink}</code>
              <p style={{ fontSize: 13, color: '#3f3f3f', margin: '10px 0 0', lineHeight: 1.65 }}>{t.inviteHint}</p>
              <p style={{ fontSize: 12, color: '#c2143c', margin: '8px 0 0', lineHeight: 1.6, fontWeight: 600 }}>{t.referrerPayoutNote}</p>
            </div>

            {/* 등록된 추천인(영업) — 각자의 고객용 QR · 링크. 추천인이 이 QR로
                모은 고객은 추천인과 이 총판에 함께 귀속된다. */}
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '18px 0 8px' }}>{t.registeredReferrers} ({referrers.length})</h3>
            {referrers.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6a6a6a', border: '1px dashed #dddddd', borderRadius: 12, padding: 16, margin: 0 }}>{t.referrersNone}</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {referrers.map((r, i) => (
                  <div key={r.id} className="m-ref-two" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, border: '1px solid #ebebeb', borderRadius: 12, padding: 14, alignItems: 'center', opacity: r.isActive ? 1 : 0.55 }}>
                    <div dangerouslySetInnerHTML={{ __html: referrerQrs[i] ?? '' }} style={{ width: 120, height: 120 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <b style={{ fontSize: 15 }}>{r.name}</b>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>{r.code}</span>
                        <span style={{ fontSize: 12, color: '#6a6a6a' }}>{t.clicks} {r.clicks} · {t.signups} {r.signups}</span>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#6a6a6a' }}>{t.referrerCustomerLink}</div>
                      <code style={{ display: 'block', background: '#f7f7f7', borderRadius: 8, padding: '7px 10px', fontSize: 13, wordBreak: 'break-all', marginTop: 4 }}>{SITE}/r/{r.code}</code>
                      {(() => {
                        const p = perf.get(r.id) ?? ZERO_PERF;
                        return (
                          <div style={{ marginTop: 10, background: '#fafafa', borderRadius: 10, padding: '9px 12px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6a6a6a', marginBottom: 4 }}>{t.refPerf}</div>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                              <span><span style={{ color: '#6a6a6a' }}>{t.perfMembers}</span> <b>{p.members}</b></span>
                              <span><span style={{ color: '#6a6a6a' }}>{t.refPaid}</span> <b>{p.orders}{t.perfOrders}</b> · <b>{fmt(p.paidWon)}</b></span>
                              <span>
                                <span style={{ color: '#6a6a6a' }}>{t.refCommission}</span>{' '}
                                <b style={{ color: '#b45309' }}>{fmt(p.pending)}</b> / <b style={{ color: '#1d4ed8' }}>{fmt(p.confirmed)}</b> / <b style={{ color: '#047857' }}>{fmt(p.paid)}</b>
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* 총판 직접 모집(내 QR) 실적 — 추천인 경유와 비교용 */}
            {(() => {
              const p = perf.get(me.id) ?? ZERO_PERF;
              return (
                <div style={{ marginTop: 10, border: '1px dashed #dddddd', borderRadius: 12, padding: '10px 14px', fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'baseline', fontVariantNumeric: 'tabular-nums' }}>
                  <b>{t.directPerf}</b>
                  <span><span style={{ color: '#6a6a6a' }}>{t.perfMembers}</span> <b>{p.members}</b></span>
                  <span><span style={{ color: '#6a6a6a' }}>{t.refPaid}</span> <b>{p.orders}{t.perfOrders}</b> · <b>{fmt(p.paidWon)}</b></span>
                </div>
              );
            })()}
          </>
        ) : null}

        {/* 통계 — 총판은 큰 카드 4개(가입 회원·예상·확정·지급)로 간단히.
            추천인(개인)은 기존 5칸 유지. */}
        {isDistributor ? (
          <div className="m-ref-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
            {[
              [t.dashMembersCount, String(me.signups), '#222'],
              [t.pending, fmt(totals.pending), '#b45309'],
              [t.confirmed, fmt(totals.confirmed), '#1d4ed8'],
              [t.paid, fmt(totals.paid), '#047857'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ border: '1px solid #ebebeb', borderRadius: 14, padding: '18px 16px' }}>
                <div style={{ fontSize: 13, color: '#6a6a6a', fontWeight: 600 }}>{l}</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6, color: c }}>{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              {[[t.clicks, String(me.clicks), '#222'], [t.signups, String(me.signups), '#222'], [t.pending, fmt(totals.pending), '#b45309'], [t.confirmed, fmt(totals.confirmed), '#1d4ed8'], [t.paid, fmt(totals.paid), '#047857']].map(([l, v, c]) => (
                <div key={l} style={{ border: '1px solid #ebebeb', borderRadius: 12, padding: '12px 16px', minWidth: 140, flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#6a6a6a' }}>{l}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: c }}>{v}</div>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '28px 0 10px' }}>{t.recent}</h2>
            {myRows.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6a6a6a', border: '1px dashed #dddddd', borderRadius: 12, padding: 18 }}>{t.noRows}</p>
            ) : (
              <div style={{ border: '1px solid #ebebeb', borderRadius: 12, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontVariantNumeric: 'tabular-nums', minWidth: 560 }}>
                  <tbody>
                    {myRows.map(({ l, o }) => {
                      const s = statusLabel(l.status, l.basis);
                      return (
                        <tr key={l.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '10px 12px' }}><b>{o.invoiceNo}</b><div style={{ fontSize: 11, color: '#9c9c9c' }}>{o.title}</div></td>
                          <td style={{ padding: '10px 12px', fontSize: 12 }}>{roleLabel(l.beneficiary)} · {l.basis === 'travel_margin' ? t.basisTravel : t.basisFee} {(l.rateBp / 100).toFixed(0)}%</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(l.amountWon)}</td>
                          <td style={{ padding: '10px 12px', color: s.color, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{s.text}<div style={{ color: '#9c9c9c', fontWeight: 400 }}>{l.confirmAt.toLocaleDateString(locale === 'kr' ? 'ko-KR' : locale)}</div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* 총판 전용 */}
      {isDistributor ? (
        <>
          <div className="m-ref-noprint">
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '28px 0 10px' }}>{t.membersTitle} ({members.length})</h2>
            {members.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6a6a6a', border: '1px dashed #dddddd', borderRadius: 12, padding: 18 }}>{t.membersNone}</p>
            ) : (
              <div style={{ border: '1px solid #ebebeb', borderRadius: 12, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontVariantNumeric: 'tabular-nums', minWidth: 560 }}>
                  <thead><tr style={{ background: '#fafafa', textAlign: 'left' }}>
                    <th style={{ padding: '9px 12px', fontSize: 12, color: '#6a6a6a' }}>{t.mJoined}</th>
                    <th style={{ padding: '9px 12px', fontSize: 12, color: '#6a6a6a' }}>{t.mMember}</th>
                    <th style={{ padding: '9px 12px', fontSize: 12, color: '#6a6a6a' }}>{t.mVia}</th>
                    <th style={{ padding: '9px 12px', fontSize: 12, color: '#6a6a6a', textAlign: 'right' }}>{t.mOrders}</th>
                  </tr></thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.userId} style={{ borderTop: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                          {m.joinedAt.toLocaleDateString(locale === 'kr' ? 'ko-KR' : locale)}
                        </td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, wordBreak: 'break-all' }}>{m.label}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, color: '#6a6a6a' }}>
                          {m.via}
                          <span style={{ marginLeft: 6, fontSize: 11, color: '#9c9c9c' }}>{m.source}</span>
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {m.orders > 0 ? <><b>{m.orders}</b> · {fmt(m.spentWon)}</> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{t.statement} · {period}</h2>
            <form className="m-ref-noprint" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 12, color: '#6a6a6a' }}>{t.period}</label>
              <input name="period" type="month" defaultValue={period} style={{ border: '1px solid #dddddd', borderRadius: 8, padding: '5px 8px', fontSize: 13, fontFamily: 'inherit' }} />
              <button type="submit" style={{ border: '1px solid #222', background: '#222', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>→</button>
              <PrintButton label={t.print} />
            </form>
          </div>
          <div style={{ border: '1px solid #ebebeb', borderRadius: 12, overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              <thead><tr style={{ background: '#fafafa', textAlign: 'left' }}>
                <th style={{ padding: '9px 12px', fontSize: 12, color: '#6a6a6a' }}>{t.stmtPartner}</th>
                <th style={{ padding: '9px 12px', fontSize: 12, color: '#6a6a6a', textAlign: 'right' }}>{t.stmtCount}</th>
                <th style={{ padding: '9px 12px', fontSize: 12, color: '#b45309', textAlign: 'right' }}>{t.pending}</th>
                <th style={{ padding: '9px 12px', fontSize: 12, color: '#1d4ed8', textAlign: 'right' }}>{t.confirmed}</th>
                <th style={{ padding: '9px 12px', fontSize: 12, color: '#047857', textAlign: 'right' }}>{t.paid}</th>
                <th style={{ padding: '9px 12px', fontSize: 12, color: '#6a6a6a', textAlign: 'right' }}>{t.stmtAmount}</th>
              </tr></thead>
              <tbody>
                {statement.map((s) => (
                  <tr key={s.code || s.name} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '9px 12px' }}>{s.name} <span style={{ fontFamily: 'monospace', color: '#9c9c9c', fontSize: 12 }}>{s.code}</span></td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>{s.count}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#b45309' }}>{fmt(s.pending)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1d4ed8' }}>{fmt(s.confirmed)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#047857' }}>{fmt(s.paid)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(s.amount)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #dddddd', background: '#fafafa' }}>
                  <td style={{ padding: '9px 12px', fontWeight: 700 }}>{t.stmtTotal}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>{statement.reduce((a, s) => a + s.count, 0)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#b45309', fontWeight: 700 }}>{fmt(statement.reduce((a, s) => a + s.pending, 0))}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1d4ed8', fontWeight: 700 }}>{fmt(statement.reduce((a, s) => a + s.confirmed, 0))}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#047857', fontWeight: 700 }}>{fmt(statement.reduce((a, s) => a + s.paid, 0))}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800 }}>{fmt(stmtTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: '#9c9c9c', marginTop: 8, lineHeight: 1.6 }}>{t.stmtRealtimeNote} {t.stmtNote}</p>
        </>
      ) : null}

      <p className="m-ref-noprint" style={{ marginTop: 24, fontSize: 13 }}><Link href={`/${locale}/me`} style={{ color: '#222' }}>← {dict.myPage.title}</Link></p>
    </section>
  );
}
