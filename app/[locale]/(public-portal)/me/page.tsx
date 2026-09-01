import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { cookies } from 'next/headers';
import { attributeUser, patientPointsBalance, REF_COOKIE } from '@/lib/referral/service';

export const dynamic = 'force-dynamic';

/**
 * 마이페이지 — 내 예약 인보이스 / 결제 내역.
 *
 * 로그인 상태로 발행된 인보이스만 계정에 묶여 있으므로 user_id 로
 * 조회한다. 비로그인 예약 건은 여기 뜨지 않고 문의 스레드로만 남는다.
 *
 * 결제 팝업에서 '결제를 완료했어요'를 누르면 ?invoice=… 로 들어와
 * 해당 건이 강조된다.
 */

const MY_CSS =
  '@media (max-width: 768px) {'
  + '.m-my-page { padding: 24px 16px 96px !important; }'
  + '.m-my-row { grid-template-columns: 1fr !important; gap: 6px !important; }'
  + '.m-my-amount { text-align: left !important; }'
  + '}';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<{ title: string }> {
  if (!isPublicLocale(params.locale)) return { title: 'My bookings' };
  const dict = await getDictionary(params.locale);
  return { title: `${dict.myPage.title} · KoreaGlowUp` };
}

export default async function MyPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { invoice?: string };
}): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  const t = dict.myPage;

  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/me`)}`);
  }

  // 추천 QR 로 들어온 계정이면 여기서 귀속을 기록한다 (최초 접촉 우선)
  const refCode = cookies().get(REF_COOKIE)?.value;
  if (refCode) await attributeUser(auth.user.id, refCode, 'me').catch(() => null);
  const points = await patientPointsBalance(auth.user.id).catch(() => 0);

  let rows: Array<typeof checkoutOrders.$inferSelect> = [];
  let dbError = false;
  try {
    rows = await db
      .select()
      .from(checkoutOrders)
      .where(eq(checkoutOrders.userId, auth.user.id))
      .orderBy(desc(checkoutOrders.createdAt))
      .limit(100);
  } catch {
    dbError = true;
  }

  const statusMeta: Record<string, { label: string; bg: string; fg: string }> = {
    issued: { label: t.statusIssued, bg: '#fff7ed', fg: '#b45309' },
    reported: { label: t.statusReported, bg: '#eff6ff', fg: '#1d4ed8' },
    paid: { label: t.statusPaid, bg: '#ecfdf5', fg: '#047857' },
    cancelled: { label: t.statusCancelled, bg: '#f5f5f5', fg: '#6a6a6a' },
  };

  const paidTotal = rows
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + r.totalWon, 0);

  return (
    <section className="m-my-page" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 96px' }}>
      <style dangerouslySetInnerHTML={{ __html: MY_CSS }} />

      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>{t.title}</h1>
      <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0' }}>
        {t.subtitle.replace('{email}', auth.user.email ?? '')}
      </p>

      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <SummaryCard label={t.countLabel} value={t.countValue.replace('{n}', String(rows.length))} />
        <SummaryCard label={t.paidTotalLabel} value={`₩${paidTotal.toLocaleString('ko-KR')}`} accent="#047857" />
        <SummaryCard label={dict.referral.points} value={`₩${points.toLocaleString('ko-KR')}`} accent="#c81e42" />
      </div>
      <p style={{ fontSize: 13, marginTop: 14 }}>
        <Link href={`/${locale}/me/referral`} style={{ color: '#c81e42', fontWeight: 600 }}>{dict.referral.menu} →</Link>
        <span style={{ color: '#9c9c9c', marginLeft: 8 }}>{dict.referral.pointsHint}</span>
      </p>

      {dbError ? (
        <p style={{ fontSize: 14, color: '#dc2626', marginTop: 24 }}>{t.loadError}</p>
      ) : rows.length === 0 ? (
        <div
          style={{
            marginTop: 28, border: '1px solid #ebebeb', borderRadius: 14,
            padding: '40px 24px', textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t.emptyTitle}</p>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '8px 0 18px' }}>{t.emptyBody}</p>
          <Link
            href={`/${locale}`}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 44, padding: '0 22px',
              background: '#ff385c', color: '#fff', borderRadius: 10,
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}
          >
            {t.emptyCta}
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((r) => {
            // 예약금 주문: 입금 확인 후 컨시어지 확정(meta.reserveConfirmedAt)까지
            // 한 단계가 더 있다 — 확정되면 '예약 확정'으로 표시한다.
            const orderMeta = (r.meta ?? {}) as { depositWon?: number; reserveConfirmedAt?: string };
            const isDeposit = !!orderMeta.depositWon;
            const s = r.status === 'paid' && orderMeta.reserveConfirmedAt
              ? { label: t.statusConfirmed, bg: '#ecfdf5', fg: '#047857' }
              : statusMeta[r.status] ?? { label: r.status, bg: '#f5f5f5', fg: '#6a6a6a' };
            const highlighted = searchParams.invoice === r.invoiceNo;
            return (
              <article
                key={r.id}
                style={{
                  border: highlighted ? '1px solid #ff385c' : '1px solid #ebebeb',
                  borderRadius: 14, padding: 18,
                  background: highlighted ? '#fff8f9' : '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: s.bg, color: s.fg, borderRadius: 9999,
                      padding: '4px 11px', fontSize: 11, fontWeight: 700,
                    }}
                  >
                    {s.label}
                  </span>
                  <span style={{ fontSize: 12, color: '#6a6a6a', fontWeight: 600 }}>
                    {t.invoiceLabel} {r.invoiceNo}
                  </span>
                  {r.status === 'paid' && isDeposit && !orderMeta.reserveConfirmedAt ? (
                    <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>
                      {t.confirmWait}
                    </span>
                  ) : null}
                </div>

                <div
                  className="m-my-row"
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: 12, alignItems: 'flex-end', marginTop: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    {r.listingSlug ? (
                      <Link
                        href={`/${locale}/listings/${r.listingSlug}`}
                        style={{ fontSize: 16, fontWeight: 700, color: '#222', textDecoration: 'none' }}
                      >
                        {r.listingTitle}
                      </Link>
                    ) : (
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{r.listingTitle}</div>
                    )}
                    <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 6 }}>
                      {r.reserveDate} · {r.reserveTime} · {t.guestsValue.replace('{n}', String(r.guests))}
                    </div>
                  </div>
                  <div className="m-my-amount" style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      ₩{r.totalWon.toLocaleString('ko-KR')}
                    </div>
                    <div style={{ fontSize: 11, color: '#9c9c9c', marginTop: 2 }}>
                      {isDeposit
                        ? `${dict.checkout.payOnSiteRow} ₩${r.subtotalWon.toLocaleString('ko-KR')}`
                        : `₩${r.subtotalWon.toLocaleString('ko-KR')} + ${t.feeLabel} ₩${r.serviceFeeWon.toLocaleString('ko-KR')}`}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0',
                    display: 'flex', gap: 14, flexWrap: 'wrap',
                    fontSize: 12, color: '#9c9c9c',
                  }}
                >
                  <span>
                    {t.issuedAt} {new Date(r.createdAt).toLocaleString('ko-KR', {
                      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  {r.paidAt ? (
                    <span style={{ color: '#047857' }}>
                      {t.paidAt} {new Date(r.paidAt).toLocaleDateString('ko-KR')}
                    </span>
                  ) : r.reportedAt ? (
                    <span style={{ color: '#1d4ed8' }}>
                      {t.reportedAt} {new Date(r.reportedAt).toLocaleDateString('ko-KR')}
                    </span>
                  ) : null}
                  <span style={{ textTransform: 'uppercase' }}>{r.paymentMethod}</span>
                </div>

                {r.status === 'reported' ? (
                  <p style={{ fontSize: 12, color: '#6a6a6a', margin: '10px 0 0', lineHeight: 1.55 }}>
                    {t.reportedNote}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 12, color: '#9c9c9c', marginTop: 24, lineHeight: 1.6 }}>
        {t.footNote}
      </p>
    </section>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }): JSX.Element {
  return (
    <div style={{ border: '1px solid #ebebeb', borderRadius: 12, padding: '14px 18px', minWidth: 160 }}>
      <div style={{ fontSize: 12, color: '#6a6a6a' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: accent ?? '#222' }}>{value}</div>
    </div>
  );
}
