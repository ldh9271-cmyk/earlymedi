import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { LegalDoc, LegalItem } from '@/lib/legal/types';

/**
 * 약관·개인정보처리방침 공용 렌더러 — 본문은 lib/legal/*.ts 의 로케일별 데이터.
 * 회사 표기줄(business)은 사전 siteFooter.business 와 같은 값을 받아 푸터와 어긋나지 않게 한다.
 */
const listStyle: React.CSSProperties = {
  paddingLeft: 18,
  margin: '8px 0 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

function Item({ item }: { item: LegalItem }): JSX.Element {
  if (typeof item === 'string') return <li>{item}</li>;
  return (
    <li>
      {item.term ? <><strong>{item.term}</strong> </> : null}
      {item.text}
      {item.sub?.length ? (
        <ul style={{ ...listStyle, marginTop: 6 }}>
          {item.sub.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      ) : null}
    </li>
  );
}

export default function LegalDocView({ locale, doc, business }: { locale: PublicLocale; doc: LegalDoc; business: string }): JSX.Element {
  return (
    <article
      style={{
        maxWidth: 760, margin: '0 auto',
        padding: '40px 24px 80px',
        color: '#222',
        fontFamily: "'Inter', 'Pretendard Variable', system-ui, sans-serif",
        lineHeight: 1.65,
      }}
    >
      <Link
        href={`/${locale}/signup`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6a6a6a', fontSize: 13, textDecoration: 'none', marginBottom: 16 }}
      >
        ← {doc.backToSignup}
      </Link>

      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', margin: '8px 0 4px' }}>{doc.title}</h1>
      <p style={{ fontSize: 13, color: '#6a6a6a', margin: 0 }}>
        {doc.effective}<br />{business}
      </p>

      {doc.translationNotice ? (
        <div style={{ margin: '20px 0', border: '1px solid #fef3c7', background: '#fffbeb', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400e' }}>
          {doc.translationNotice}
        </div>
      ) : null}

      {doc.sections.map((s) => (
        <section key={s.title} style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>{s.title}</h2>
          <div style={{ fontSize: 14, color: '#3f3f3f' }}>
            {s.lead ? <p style={{ margin: 0 }}>{s.lead}</p> : null}
            {s.items?.length ? (
              s.ordered
                ? <ol style={listStyle}>{s.items.map((it, i) => <Item key={i} item={it} />)}</ol>
                : <ul style={listStyle}>{s.items.map((it, i) => <Item key={i} item={it} />)}</ul>
            ) : null}
            {s.tail ? <p style={{ margin: '8px 0 0' }}>{s.tail}</p> : null}
          </div>
        </section>
      ))}

      <p style={{ fontSize: 12, color: '#9c9c9c', marginTop: 40 }}>{doc.addendum}</p>
    </article>
  );
}
