import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

/**
 * Patient-portal main footer — Airbnb-style 3-col link bar.
 *
 * Mirrors the look extracted from /glowup/pc into /[locale] and
 * shared with the (public-portal) layout so every B2C page (/kr,
 * /clinics, /clinics/[slug], /inquiry, /ai-consult, /login, /signup,
 * etc.) ends with the same surface — light grey bar, three columns,
 * locale + currency badges in the bottom strip.
 *
 * All labels come from dict.siteFooter (resolved server-side and
 * passed via the `t` prop) so the footer renders in the active
 * locale.
 *
 * `localeNative` is the active locale's display name (e.g. "한국어",
 * "English", "Tiếng Việt") shown on the right-hand badge in the
 * bottom strip. Sourced from LOCALE_LABELS at the caller.
 */
export function MainFooter({
  t,
  localeNative,
}: {
  t: Dictionary['siteFooter'];
  localeNative: string;
}): JSX.Element {
  const cols: Array<{ title: string; items: string[] }> = [
    { title: t.colSupport,  items: [t.support1, t.support2, t.support3, t.support4] },
    { title: t.colPrograms, items: [t.program1, t.program2, t.program3, t.program4] },
    { title: t.colBrand,    items: [t.brand1,   t.brand2,   t.brand3,   t.brand4]   },
  ];
  return (
    <footer
      style={{
        background: '#f7f7f7',
        borderTop: '1px solid #ebebeb',
        marginTop: 56,
      }}
    >
      <div
        style={{
          maxWidth: 1280, margin: '0 auto', padding: '48px 40px',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24,
        }}
      >
        {cols.map((col) => (
          <div key={col.title}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#222' }}>{col.title}</div>
            <div
              style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                marginTop: 16, fontSize: 14, color: '#222',
              }}
            >
              {col.items.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #dddddd' }}>
        <div
          style={{
            maxWidth: 1280, margin: '0 auto', padding: '24px 40px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 13, color: '#6a6a6a', flexWrap: 'wrap', gap: 12,
          }}
        >
          <span>{t.copy}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#222', fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
              </svg>
              {localeNative}
            </span>
            <span style={{ color: '#222', fontWeight: 600 }}>₩ KRW</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
