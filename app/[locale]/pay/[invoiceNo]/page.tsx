import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { isPublicLocale } from '@/lib/i18n/locales';
import { PayInvoiceButton } from '@/app/[locale]/(public-portal)/me/_components/pay-invoice';

export const dynamic = 'force-dynamic';

/**
 * 메신저로 보내는 결제 링크 — /[locale]/pay/<인보이스>?t=<토큰>.
 * 비회원 견적(호텔 예약 문의)도 로그인 없이 토스로 결제할 수 있게 한다. 토큰이 맞아야 열리고,
 * 결제가 끝난 인보이스는 토큰 없이도 '결제 완료'만 보여 준다(토스 성공 페이지가 ?paid=1 로 돌아온다).
 */
export default async function PayPage({ params, searchParams }: { params: { locale: string; invoiceNo: string }; searchParams: { t?: string; paid?: string } }): Promise<JSX.Element> {
  const { locale } = params;
  if (!isPublicLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.pay;
  const invoiceNo = decodeURIComponent(params.invoiceNo);
  const [o] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.invoiceNo, invoiceNo)).limit(1);
  if (!o) notFound();
  const meta = (o.meta ?? {}) as { payToken?: string; quoteNote?: string | null };
  const paid = o.status === 'paid';
  const cancelled = o.status === 'cancelled';
  const tokenOk = !!searchParams.t && !!meta.payToken && searchParams.t === meta.payToken;
  const canPay = !paid && !cancelled && tokenOk && o.kind === 'quote' && o.totalWon > 0;

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '40px 20px 80px', fontFamily: 'inherit' }}>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>Glow<span style={{ color: '#ff385c' }}>Up</span>Tour</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '18px 0 6px' }}>{paid ? t.paidTitle : t.title}</h1>
      <p style={{ fontSize: 14, color: '#6a6a6a', margin: 0, lineHeight: 1.6 }}>{paid ? t.paidBody : cancelled ? t.cancelled : canPay ? t.intro : t.invalid}</p>

      {paid || canPay ? (
        <div style={{ marginTop: 22, border: '1px solid #fecdd3', background: '#fff5f7', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{o.listingTitle}</div>
          <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 4 }}>{o.reserveDate} · {o.reserveTime} · {o.guests}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#c81e42', marginTop: 12 }}>₩{o.totalWon.toLocaleString('ko-KR')}</div>
          {meta.quoteNote ? (
            <div style={{ fontSize: 13, color: '#3f3f3f', marginTop: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}><b>{t.note}</b><br />{meta.quoteNote}</div>
          ) : null}
          <div style={{ fontSize: 12, color: '#9c9c9c', marginTop: 10 }}>{t.invoice} {o.invoiceNo}</div>
          {canPay ? (
            <PayInvoiceButton locale={locale} invoiceNo={o.invoiceNo} amountWon={o.totalWon} title={o.listingTitle} email={o.userEmail ?? null} back="pay"
              labels={{ payNow: dict.myPage.quote.payNow, hint: dict.myPage.quote.payHint, failed: dict.myPage.quote.payFailed }} />
          ) : null}
        </div>
      ) : null}

      <p style={{ marginTop: 26 }}>
        <Link href={`/${locale}`} style={{ fontSize: 14, fontWeight: 600, color: '#ff385c' }}>{t.home} →</Link>
      </p>
    </main>
  );
}
