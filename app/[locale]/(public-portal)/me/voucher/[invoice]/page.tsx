import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { loadOrderByInvoice, summarize } from '@/lib/voucher/service';
import { voucherUrl } from '@/lib/voucher/token';
import VoucherLive from './_components/voucher-live';

export const dynamic = 'force-dynamic';

/**
 * 소비자 QR 바우처 — 결제 완료 주문의 QR(/v/<token>)을 크게 보여주고,
 * 사업자가 스캔해 방문 확인하면 8초 폴링으로 상태가 바로 바뀐다.
 */
export default async function VoucherPage({ params }: { params: { locale: string; invoice: string } }): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  const t = dict.myPage;
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/me/voucher/${params.invoice}`)}`);
  const o = await loadOrderByInvoice(decodeURIComponent(params.invoice));
  if (!o || o.userId !== auth.user.id) notFound();
  const s = summarize(o, { withPII: true });
  const url = voucherUrl(o.id);
  const qr = await QRCode.toString(url, { type: 'svg', margin: 1, width: 280, errorCorrectionLevel: 'M' });

  return (
    <section style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 96px' }}>
      <Link href={`/${locale}/me`} style={{ fontSize: 12, color: '#6a6a6a' }}>← {t.title}</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 4px' }}>{t.voucherTitle}</h1>
      <p style={{ fontSize: 13, color: '#6a6a6a', margin: '0 0 16px', lineHeight: 1.6 }}>{t.voucherHint}</p>

      <div style={{ border: '1px solid #ebebeb', borderRadius: 18, padding: 20, textAlign: 'center', background: '#fff' }}>
        <div dangerouslySetInnerHTML={{ __html: qr }} style={{ width: 280, height: 280, margin: '0 auto' }} />
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#9c9c9c', marginTop: 8, wordBreak: 'break-all' }}>{s.token}</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 14 }}>{s.listingTitle}</div>
        <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 4 }}>{s.invoiceNo} · {s.reserveDate} {s.reserveTime} · {s.guests}</div>
        <div style={{ fontSize: 14, marginTop: 10 }}>
          <b>₩{s.totalWon.toLocaleString('ko-KR')}</b>{s.depositWon ? ` · ${t.depositPaidNote}` : ''}
          {s.payOnSiteWon ? <div style={{ fontSize: 13, color: '#c2143c', marginTop: 2 }}>{dict.checkout.payOnSiteRow} ₩{s.payOnSiteWon.toLocaleString('ko-KR')}</div> : null}
        </div>
        <VoucherLive
          token={s.token}
          initial={{ status: s.status, checkedInAt: s.checkedInAt, checkedInByName: s.checkedInByName }}
          labels={{ paid: t.voucherPaid, checkedIn: t.voucherCheckedIn, cancelled: t.voucherCancelled, waiting: t.voucherWaiting, checkedInAt: t.voucherCheckedInAt, by: t.voucherBy, live: t.voucherLive }}
        />
      </div>
    </section>
  );
}
