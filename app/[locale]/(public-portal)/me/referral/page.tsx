import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { and, desc, eq, inArray } from 'drizzle-orm';
import QRCode from 'qrcode';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { commissionLedger } from '@/drizzle/schema/referral-program';
import {
  attributeUser, getPartnerByCode, getPartnerByUserId, listReferrers, partnerTotals,
  REF_COOKIE, REF_JOIN_COOKIE,
} from '@/lib/referral/service';
import { joinReferrerAction } from './_actions';
import { PrintButton } from './print-button';

export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://glowuptour.com';
const CSS =
  '@media (max-width: 768px) { .m-ref-page { padding: 24px 16px 96px !important; } .m-ref-two { grid-template-columns: 1fr !important; } }'
  + '@media print { .m-ref-noprint { display: none !important; } .m-ref-page { padding: 0 !important; } }';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<{ title: string }> {
  if (!isPublicLocale(params.locale)) return { title: 'Referral' };
  const dict = await getDictionary(params.locale);
  return { title: `${dict.referral.title} · KoreaGlowUp` };
}

export default async function ReferralPage({
  params, searchParams,
}: { params: { locale: string }; searchParams: { period?: string; joined?: string; error?: string } }): Promise<JSX.Element> {
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

  const me = await getPartnerByUserId(user.id);

  // ── 아직 추천인이 아님: 초대 여부에 따라 참여 폼 / 안내 ─────────
  if (!me) {
    const inviteCode = jar.get(REF_JOIN_COOKIE)?.value ?? refCode ?? null;
    const inviter = inviteCode ? await getPartnerByCode(inviteCode) : null;
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
  const customerLink = `${SITE}/r/${me.code}`;
  const inviteLink = `${SITE}/r/${me.code}?join=1`;
  const qr = await QRCode.toString(customerLink, { type: 'svg', margin: 1, width: 180 });
  const totals = await partnerTotals(me.id);

  const myRows = await db
    .select({ l: commissionLedger, o: { invoiceNo: checkoutOrders.invoiceNo, title: checkoutOrders.listingTitle, patient: checkoutOrders.patientLabel } })
    .from(commissionLedger)
    .innerJoin(checkoutOrders, eq(checkoutOrders.id, commissionLedger.orderId))
    .where(eq(commissionLedger.beneficiaryPartnerId, me.id))
    .orderBy(desc(commissionLedger.createdAt))
    .limit(50);

  const roleLabel = (b: string): string => (b === 'referrer_l1' ? t.roleL1 : b === 'referrer_l2' ? t.roleL2 : t.roleDistributor);
  const statusLabel = (s: string): { text: string; color: string } =>
    s === 'paid' ? { text: t.paid, color: '#047857' } : s === 'confirmed' ? { text: t.confirmed, color: '#1d4ed8' } : s === 'reversed' ? { text: '×', color: '#6a6a6a' } : { text: t.pending, color: '#b45309' };
  const fmt = (n: number): string => `₩${n.toLocaleString('ko-KR')}`;

  // 총판: 추천인 목록 + 월 정산서
  let referrers: Awaited<ReturnType<typeof listReferrers>> = [];
  let statement: Array<{ name: string; code: string; count: number; amount: number }> = [];
  const period = searchParams.period && /^\d{4}-\d{2}$/.test(searchParams.period) ? searchParams.period : new Date().toISOString().slice(0, 7);
  if (isDistributor) {
    referrers = await listReferrers(me.id);
    const byId = new Map(referrers.map((r) => [r.id, r]));
    const [y, m] = period.split('-').map(Number);
    const from = new Date(Date.UTC(y!, m! - 1, 1));
    const to = new Date(Date.UTC(y!, m!, 1));
    const rows = await db.select().from(commissionLedger)
      .where(and(
        eq(commissionLedger.distributorId, me.id),
        inArray(commissionLedger.status, ['confirmed', 'paid']),
        inArray(commissionLedger.beneficiary, ['referrer_l1', 'referrer_l2', 'distributor']),
      ));
    const agg = new Map<string, { name: string; code: string; count: number; amount: number }>();
    for (const r of rows) {
      if (r.confirmAt < from || r.confirmAt >= to) continue;
      const pid = r.beneficiaryPartnerId ?? me.id;
      const p = pid === me.id ? me : byId.get(pid);
      const key = pid;
      const cur = agg.get(key) ?? { name: p?.name ?? '—', code: p?.code ?? '', count: 0, amount: 0 };
      cur.count += 1; cur.amount += r.amountWon;
      agg.set(key, cur);
    }
    statement = [...agg.values()].sort((a, b) => b.amount - a.amount);
  }
  const stmtTotal = statement.reduce((a, s) => a + s.amount, 0);

  return (
    <section className="m-ref-page" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 96px' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="m-ref-noprint">
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>{isDistributor ? t.distributorTitle : t.title}</h1>
        <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0' }}>{t.subtitle}</p>
        {searchParams.joined ? <p style={{ fontSize: 13, color: '#047857', marginTop: 10 }}>✓ {t.joinTitle}</p> : null}

        {/* 코드 · QR · 링크 */}
        <div className="m-ref-two" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, marginTop: 24, border: '1px solid #ebebeb', borderRadius: 14, padding: 20 }}>
          <div dangerouslySetInnerHTML={{ __html: qr }} style={{ width: 180, height: 180 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6a6a6a' }}>{t.myCode}</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 2, marginTop: 2 }}>{me.code}</div>
            <p style={{ fontSize: 13, color: '#6a6a6a', margin: '8px 0 0', lineHeight: 1.6 }}>{t.qrHint}</p>
            <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: '#6a6a6a' }}>{t.linkLabel}</div>
            <code style={{ display: 'block', background: '#f7f7f7', borderRadius: 8, padding: '8px 10px', fontSize: 13, wordBreak: 'break-all', marginTop: 4 }}>{customerLink}</code>
            <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: '#6a6a6a' }}>{t.inviteLabel}</div>
            <code style={{ display: 'block', background: '#fff5f7', border: '1px solid #fecdd3', borderRadius: 8, padding: '8px 10px', fontSize: 13, wordBreak: 'break-all', marginTop: 4 }}>{inviteLink}</code>
            <p style={{ fontSize: 12, color: '#6a6a6a', margin: '6px 0 0', lineHeight: 1.55 }}>{t.inviteHint}</p>
          </div>
        </div>

        {/* 통계 */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {[[t.clicks, String(me.clicks), '#222'], [t.signups, String(me.signups), '#222'], [t.pending, fmt(totals.pending), '#b45309'], [t.confirmed, fmt(totals.confirmed), '#1d4ed8'], [t.paid, fmt(totals.paid), '#047857']].map(([l, v, c]) => (
            <div key={l} style={{ border: '1px solid #ebebeb', borderRadius: 12, padding: '12px 16px', minWidth: 140, flex: 1 }}>
              <div style={{ fontSize: 12, color: '#6a6a6a' }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: c }}>{v}</div>
            </div>
          ))}
        </div>

        {/* 내 수당 내역 */}
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '28px 0 10px' }}>{t.recent}</h2>
        {myRows.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6a6a6a', border: '1px dashed #dddddd', borderRadius: 12, padding: 18 }}>{t.noRows}</p>
        ) : (
          <div style={{ border: '1px solid #ebebeb', borderRadius: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontVariantNumeric: 'tabular-nums', minWidth: 560 }}>
              <tbody>
                {myRows.map(({ l, o }) => {
                  const s = statusLabel(l.status);
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
      </div>

      {/* 총판 전용 */}
      {isDistributor ? (
        <>
          <div className="m-ref-noprint">
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '28px 0 10px' }}>{t.referrers} ({referrers.length})</h2>
            <div style={{ border: '1px solid #ebebeb', borderRadius: 12, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
                <tbody>
                  {referrers.map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace' }}>{r.code}</td>
                      <td style={{ padding: '9px 12px', color: '#6a6a6a', fontSize: 12 }}>{r.parentId === me.id ? '—' : referrers.find((x) => x.id === r.parentId)?.name ?? ''}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12 }}>{r.clicks} / {r.signups}</td>
                    </tr>
                  ))}
                  {referrers.length === 0 ? <tr><td style={{ padding: 16, color: '#6a6a6a', fontSize: 13 }}>—</td></tr> : null}
                </tbody>
              </table>
            </div>
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
                <th style={{ padding: '9px 12px', fontSize: 12, color: '#6a6a6a', textAlign: 'right' }}>{t.stmtAmount}</th>
              </tr></thead>
              <tbody>
                {statement.map((s) => (
                  <tr key={s.code || s.name} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '9px 12px' }}>{s.name} <span style={{ fontFamily: 'monospace', color: '#9c9c9c', fontSize: 12 }}>{s.code}</span></td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>{s.count}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(s.amount)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #dddddd', background: '#fafafa' }}>
                  <td style={{ padding: '9px 12px', fontWeight: 700 }}>{t.stmtTotal}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>{statement.reduce((a, s) => a + s.count, 0)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800 }}>{fmt(stmtTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: '#9c9c9c', marginTop: 8, lineHeight: 1.6 }}>{t.stmtNote}</p>
        </>
      ) : null}

      <p className="m-ref-noprint" style={{ marginTop: 24, fontSize: 13 }}><Link href={`/${locale}/me`} style={{ color: '#222' }}>← {dict.myPage.title}</Link></p>
    </section>
  );
}
