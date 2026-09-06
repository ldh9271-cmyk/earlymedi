import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { describeTier, REFUND_CATEGORIES, tierRanges } from '@/lib/refund/policy';

export const dynamic = 'force-static';
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isPublicLocale(params.locale)) return {};
  const dict = await getDictionary(params.locale);
  return { title: `${dict.refund.title} · GlowUpTour`, description: dict.refund.intro };
}

/** 취소·환불 규정 공개 페이지 — 숫자는 lib/refund/policy.ts 한 곳에서, 문구는 dict.refund. */
export default async function RefundPolicyPage({ params }: { params: { locale: string } }): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  const t = dict.refund;
  return (
    <section style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 96px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>{t.title}</h1>
      <p style={{ fontSize: 14, color: '#3f3f3f', lineHeight: 1.7, margin: '10px 0 0' }}>{t.intro}</p>
      <p style={{ fontSize: 13, color: '#6a6a6a', lineHeight: 1.7, margin: '6px 0 0' }}>{t.basis}</p>

      <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        {REFUND_CATEGORIES.map((cat) => {
          const ranges = tierRanges(cat);
          return (
            <div key={cat} style={{ border: '1px solid #ebebeb', borderRadius: 14, padding: '16px 18px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 10px' }}>{t.cats[cat]}</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ color: '#9c9c9c', fontSize: 12 }}><th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>{t.colWhen}</th><th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>{t.colRefund}</th></tr></thead>
                <tbody>
                  {ranges.map((r, i) => {
                    const d = describeTier(r, i, t);
                    return (
                      <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '8px' }}>{d.when}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: r.pct === 0 ? '#c2143c' : r.pct === 100 ? '#047857' : '#222' }}>{d.refund}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px' }}>{t.tierAfter}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#c2143c' }}>{t.none}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <ul style={{ margin: '22px 0 0', paddingLeft: 18, fontSize: 13, color: '#3f3f3f', lineHeight: 1.75 }}>
        {t.notes.map((n) => <li key={n}>{n}</li>)}
      </ul>
    </section>
  );
}
